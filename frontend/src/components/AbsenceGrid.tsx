import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faCheck, faUserGroup, faExclamationTriangle, faCalendarPlus, faMousePointer, faSun, faMoon, faStar, faMagnifyingGlass, faXmark, faDownload, faFileCsv, faFilePdf, faUser, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { User, Team, Absence, Holiday, JOB_PROFILES } from '../types'
import { getAbsences, createAbsence, deleteAbsence } from '../api'
import { getHolidaysForCountryAndYear } from '../utils/holidayManager'
import { getCurrentUser, getAuthConfig, getCachedUserEmail } from '../auth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Props {
  users: User[]
  teams: Team[]
  focusUserId?: string
}

interface GroupedUsers {
  teamId: string
  teamName: string
  users: User[]
}

export default function AbsenceGrid({ users, teams, focusUserId }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [absences, setAbsences] = useState<Absence[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single')
  const [rangeStart, setRangeStart] = useState<{ userId: string; date: Date } | null>(null)
  const [showAbsenceModal, setShowAbsenceModal] = useState(false)
  const [modalData, setModalData] = useState<{ userId: string; startDate: Date; endDate: Date } | null>(null)
  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [holidayModalData, setHolidayModalData] = useState<{ name: string; country: string; date: Date } | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    // Get cached email instantly for immediate display
    const ssoEnabled = getAuthConfig().enabled
    return ssoEnabled ? getCachedUserEmail() : null
  })
  const [isSSO, setIsSSO] = useState(getAuthConfig().enabled)

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportScope, setExportScope] = useState<'all' | 'team' | 'person'>('all')
  const [exportTeamId, setExportTeamId] = useState<string>('')
  const [exportUserId, setExportUserId] = useState<string>('')
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')

  useEffect(() => {
    // Update SSO status when auth config changes
    setIsSSO(getAuthConfig().enabled)
  }, [])

  // When a user is focused from QuickSearch, filter on their name
  useEffect(() => {
    if (focusUserId) {
      const user = users.find(u => u.id === focusUserId)
      if (user) setSearchQuery(user.name)
    }
  }, [focusUserId, users])

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  })

  useEffect(() => {
    loadAbsences()
  }, [currentDate])

  useEffect(() => {
    const loadCurrentUser = async () => {
      const ssoEnabled = getAuthConfig().enabled
      setIsSSO(ssoEnabled)
      if (ssoEnabled) {
        const user = await getCurrentUser()
        if (user) {
          setCurrentUserEmail(user.email)
        }
      }
    }
    loadCurrentUser()
  }, [])

  // Center scroll on today's column when viewing the current month
  useEffect(() => {
    const today = new Date()
    if (
      today.getFullYear() !== currentDate.getFullYear() ||
      today.getMonth() !== currentDate.getMonth()
    ) {
      return
    }

    const container = scrollContainerRef.current
    if (!container) return

    // Wait for layout to settle
    requestAnimationFrame(() => {
      const dateStr = formatDateLocal(today)
      const headerCell = container.querySelector(
        `th[data-date="${dateStr}"]`
      ) as HTMLElement | null
      if (!headerCell) return

      const targetLeft = headerCell.offsetLeft - container.clientWidth / 2 + headerCell.clientWidth / 2
      container.scrollTo({ left: Math.max(targetLeft, 0), behavior: 'smooth' })
    })
  }, [currentDate])



  const loadAbsences = async () => {
    try {
      // Use date-only strings so API converts to UTC day bounds
      const data = await getAbsences(
        undefined,
        formatDateLocal(startOfMonth(currentDate)),
        formatDateLocal(endOfMonth(currentDate))
      )
      setAbsences(data)
    } catch (error) {
      console.error('Error loading absences:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    if (selectedTeam && user.teamId !== selectedTeam) return false
    if (selectedProfile && user.jobProfile !== selectedProfile) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!user.name.toLowerCase().includes(q) && !(user.email || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  // Group users by team
  const groupedUsers: GroupedUsers[] = teams
    .filter(team => !selectedTeam || team.id === selectedTeam)
    .map(team => ({
      teamId: team.id,
      teamName: team.name,
      users: filteredUsers.filter(u => u.teamId === team.id)
    }))
    .filter(group => group.users.length > 0)

  // Users without team
  const usersWithoutTeam = filteredUsers.filter(u => !u.teamId)
  if (usersWithoutTeam.length > 0) {
    groupedUsers.push({
      teamId: '',
      teamName: 'No Team',
      users: usersWithoutTeam
    })
  }

  // Calculate team availability for a specific day
  const getTeamAvailability = (teamUsers: User[], day: Date) => {
    const totalUsers = teamUsers.length
    const presentUsers = teamUsers.filter(user => {
      const hasUserAbsence = hasAbsence(user.id, day)
      const hasUserHoliday = getUserHoliday(user.id, day)
      return !hasUserAbsence && !hasUserHoliday
    }).length
    const percentage = (presentUsers / totalUsers) * 100
    return { presentUsers, totalUsers, percentage }
  }

  const dayStartUTC = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0))
  const dayEndUTC = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59))

  const overlapsDay = (start: Date, end: Date, day: Date) => {
    const ds = dayStartUTC(day)
    const de = dayEndUTC(day)
    return !(end < ds || start > de)
  }

  const hasAbsence = (userId: string, day: Date) => {
    return absences.some(absence => {
      const start = parseISO(absence.startDate)
      const end = parseISO(absence.endDate)
      return absence.userId === userId && overlapsDay(start, end, day)
    })
  }

  const canUserEdit = (userEmail: string): boolean => {
    // In SSO mode, users can only edit their own absences
    if (isSSO && currentUserEmail) {
      return userEmail === currentUserEmail
    }
    // In non-SSO mode, anyone can edit
    return true
  }

  const handleCellClick = async (userId: string, day: Date, event: React.MouseEvent) => {
    // Right click or modifier key (Ctrl/Cmd/Alt) for half day
    if (event.button === 2 || event.ctrlKey || (event as any).metaKey || event.altKey) {
      event.preventDefault()
      setModalData({ userId, startDate: day, endDate: day })
      setShowAbsenceModal(true)
      return
    }

    // Range selection mode
    if (selectionMode === 'range') {
      if (!rangeStart || rangeStart.userId !== userId) {
        // Start new range
        setRangeStart({ userId, date: day })
      } else {
        // Complete range
        const start = rangeStart.date < day ? rangeStart.date : day
        const end = rangeStart.date < day ? day : rangeStart.date
        setModalData({ userId, startDate: start, endDate: end })
        setShowAbsenceModal(true)
        setRangeStart(null)
      }
      return
    }

    // Single day toggle
    const existing = absences.find(absence => {
      const start = parseISO(absence.startDate)
      const end = parseISO(absence.endDate)
      return absence.userId === userId && overlapsDay(start, end, day)
    })

    if (existing) {
      await deleteAbsence(existing.id)
    } else {
      // Create a full-day: 00:00 -> 23:59 (UTC)
      const startIso = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)).toISOString()
      const endIso = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59)).toISOString()
      await createAbsence(userId, startIso, endIso, 'Time Off')
    }
    loadAbsences()
  }

  const handleAbsenceSubmit = async (type: 'full' | 'morning' | 'afternoon') => {
    if (!modalData) return

    try {
      const reason = type === 'full' 
        ? 'Time Off' 
        : type === 'morning' 
        ? '☀️ Time Off (Morning)' 
        : '🌙 Time Off (Afternoon)'

      let startIso: string
      let endIso: string
      const s = modalData.startDate
      const e = modalData.endDate

      if (type === 'morning') {
        // 00:00 -> 11:59 same day
        startIso = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0)).toISOString()
        endIso = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), 11, 59, 59)).toISOString()
      } else if (type === 'afternoon') {
        // 12:00 -> 23:59 same day
        startIso = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), 12, 0, 0)).toISOString()
        endIso = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59)).toISOString()
      } else {
        // Full day(s): 00:00 start -> 23:59 end across range
        startIso = new Date(Date.UTC(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0)).toISOString()
        endIso = new Date(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59)).toISOString()
      }

      await createAbsence(modalData.userId, startIso, endIso, reason)
      setShowAbsenceModal(false)
      setModalData(null)
      setRangeStart(null)
      loadAbsences()
    } catch (error) {
      console.error('Error creating absence:', error)
    }
  }



  const isWeekend = (day: Date) => {
    const dayOfWeek = day.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  }

  const [userHolidays, setUserHolidays] = useState<Map<string, Holiday | null>>(new Map())

  useEffect(() => {
    loadUserHolidays()
  }, [currentDate, users])

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getCountryFlag = (countryCode: string): string => {
    if (!countryCode) return ''
    // Convert country code to flag emoji (e.g., FR -> 🇫🇷)
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  const loadUserHolidays = async () => {
    const holidayMap = new Map<string, Holiday | null>()
    const year = currentDate.getFullYear()
    
    // Charger les jours fériés pour tous les pays des utilisateurs
    const countries = [...new Set(users.map(u => u.country).filter(Boolean))]
    
    for (const country of countries) {
      try {
        const holidays = await getHolidaysForCountryAndYear(country!, year)
        days.forEach(day => {
          const dateStr = formatDateLocal(day)
          const holiday = holidays.find(h => h.date === dateStr)
          users.forEach(user => {
            if (user.country === country) {
              const key = `${user.id}-${dateStr}`
              if (holiday) {
                holidayMap.set(key, holiday)
              }
            }
          })
        })
      } catch (error) {
        console.error(`Error loading holidays for ${country}:`, error)
      }
    }
    
    setUserHolidays(holidayMap)
  }

  const getUserHoliday = (userId: string, day: Date): Holiday | null => {
    const dateStr = formatDateLocal(day)
    const key = `${userId}-${dateStr}`
    return userHolidays.get(key) || null
  }

  const buildExportRows = (scopeUsers: User[]) => {
    const scopeIds = new Set(scopeUsers.map(u => u.id))
    const teamMap = new Map(teams.map(t => [t.id, t.name]))
    const userMap = new Map(users.map(u => [u.id, u]))
    const profileLabel = (val?: string) =>
      JOB_PROFILES.find(p => p.value === val)?.label.replace(/^[^\p{L}]+/u, '') ?? val ?? ''
    const rows = absences
      .filter(a => scopeIds.has(a.userId))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map(a => {
        const user = userMap.get(a.userId)
        const teamName = user?.teamId ? (teamMap.get(user.teamId) ?? '') : ''
        const typeLabel = a.reason.includes('Morning') ? 'Morning'
          : a.reason.includes('Afternoon') ? 'Afternoon'
          : 'Full Day'
        return [
          user?.name ?? '',
          user?.email ?? '',
          teamName,
          user?.country ?? '',
          profileLabel(user?.jobProfile),
          a.startDate.slice(0, 10),
          a.endDate.slice(0, 10),
          typeLabel,
        ]
      })
    return { rows, teamMap }
  }

  const getScopeUsers = () => {
    if (exportScope === 'all') return users
    if (exportScope === 'team') return users.filter(u => u.teamId === exportTeamId)
    if (exportScope === 'person') return users.filter(u => u.id === exportUserId)
    return users
  }

  const getScopeLabel = () => {
    const teamMap = new Map(teams.map(t => [t.id, t.name]))
    if (exportScope === 'team') return teamMap.get(exportTeamId) ?? 'team'
    if (exportScope === 'person') return users.find(u => u.id === exportUserId)?.name ?? 'person'
    return 'all'
  }

  const doExport = () => {
    const scopeUsers = getScopeUsers()
    const { rows } = buildExportRows(scopeUsers)
    const month = format(currentDate, 'yyyy-MM', { locale: enUS })
    const label = getScopeLabel().replace(/\s+/g, '-')
    const filename = `absences-${month}-${label}`

    if (exportFormat === 'csv') {
      const header = ['Name', 'Email', 'Team', 'Country', 'Profile', 'Start Date', 'End Date', 'Type']
      const csv = [header, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const monthLabel = format(currentDate, 'MMMM yyyy', { locale: enUS })
      const scopeLabel = exportScope === 'all' ? 'All employees'
        : exportScope === 'team' ? `Team: ${getScopeLabel()}`
        : `Employee: ${getScopeLabel()}`

      doc.setFontSize(16)
      doc.setTextColor(30, 58, 138)
      doc.text('Absence Report', 14, 16)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`${monthLabel}  •  ${scopeLabel}  •  ${rows.length} absence(s)`, 14, 23)
      doc.setDrawColor(200, 200, 200)
      doc.line(14, 26, 283, 26)

      autoTable(doc, {
        startY: 30,
        head: [['Name', 'Email', 'Team', 'Country', 'Profile', 'Start Date', 'End Date', 'Type']],
        body: rows,
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: 50 },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 18 },
          4: { cellWidth: 30 },
          5: { cellWidth: 26 },
          6: { cellWidth: 26 },
          7: { cellWidth: 20 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data: any) => {
          const pageCount = (doc as any).internal.getNumberOfPages()
          doc.setFontSize(7)
          doc.setTextColor(150)
          doc.text(`Page ${data.pageNumber} / ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 8)
          doc.text(`Generated ${new Date().toLocaleDateString()}`, 200, doc.internal.pageSize.height - 8)
        },
      })

      doc.save(`${filename}.pdf`)
    }
    setShowExportModal(false)
  }

  return (
    <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 shadow-xl rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 transition-colors">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <h2 className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: enUS })}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100/80 dark:bg-gray-800/80 rounded-full p-1 backdrop-blur-sm transition-colors">
            <button
              onClick={() => {
                setSelectionMode('single')
                setRangeStart(null)
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                selectionMode === 'single'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={faMousePointer} />
              Single Day
            </button>
            <button
              onClick={() => setSelectionMode('range')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                selectionMode === 'range'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={faCalendarPlus} />
              Range {rangeStart && '(1/2)'}
            </button>
          </div>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {/* Text search */}
          <div className="relative">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search person…"
              className="pl-8 pr-7 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 w-44"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            )}
          </div>
          <div className="relative">
            <FontAwesomeIcon 
              icon={faUserGroup} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none text-sm"
            />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium appearance-none cursor-pointer hover:border-purple-500 outline-none"
            >
              <option value="">All teams</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="pl-4 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium appearance-none cursor-pointer hover:border-blue-500 outline-none"
            >
              <option value="">All profiles</option>
              {JOB_PROFILES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setExportScope('all')
              setExportTeamId(selectedTeam || (teams[0]?.id ?? ''))
              setExportUserId(filteredUsers[0]?.id ?? '')
              setExportFormat('csv')
              setShowExportModal(true)
            }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-sm font-medium shadow-sm"
          >
            <FontAwesomeIcon icon={faDownload} />
            Export
          </button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-background dark:bg-gray-900">
            <tr className="relative">
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-background dark:bg-gray-900 z-50 border-r border-gray-200 dark:border-gray-700">
                User
              </th>
              {days.map(day => {
                const isTodayDay = isSameDay(day, new Date())
                const baseWeekend = 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                const baseWeekday = 'text-text dark:text-gray-300 border-gray-100 dark:border-gray-700'
                return (
                  <th
                    key={day.toISOString()}
                    data-date={formatDateLocal(day)}
                    className={`px-3 py-3 text-center text-xs font-medium border-l z-[1] ${
                      isWeekend(day)
                        ? baseWeekend
                        : baseWeekday
                    }`}
                  >
                    <div className="uppercase">{format(day, 'EEE', { locale: enUS })}</div>
                    <div className={`text-base font-semibold mt-1 ${isTodayDay ? 'text-primary' : ''}`}>{format(day, 'd')}</div>
                    {isTodayDay && (
                      <div className="mt-1 w-1.5 h-1.5 bg-primary rounded-full mx-auto" />
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {groupedUsers.map(group => (
              <React.Fragment key={group.teamId || 'no-team'}>
                {/* Team Header */}
                <tr className="bg-secondary bg-opacity-5 dark:bg-opacity-10 border-t border-gray-200 dark:border-gray-700">
                  <td className="px-6 py-2 text-xs font-semibold text-text dark:text-white sticky left-0 z-50 bg-slate-50 dark:bg-slate-900 border-r border-gray-200 dark:border-gray-700">
                    <FontAwesomeIcon icon={faUserGroup} className="text-blue-500 mr-2" />
                    {group.teamName} <span className="text-slate-400 font-normal">({group.users.length})</span>
                  </td>
                  {days.map(day => {
                    if (isWeekend(day)) {
                      return <td key={day.toISOString()} className="bg-gray-200 dark:bg-gray-700 border-l border-gray-300 dark:border-gray-600"></td>
                    }
                    const availability = getTeamAvailability(group.users, day)
                    const isLow = availability.percentage < 50
                    return (
                      <td key={day.toISOString()} className={`px-2 py-2 text-center text-xs border-l border-gray-100 dark:border-gray-700 ${isLow ? 'bg-accent bg-opacity-20' : 'bg-secondary bg-opacity-5'}`}>
                        {isLow && (
                          <div className="flex items-center justify-center gap-1">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-accent text-xs" />
                            <span className="text-accent font-semibold">{availability.presentUsers}/{availability.totalUsers}</span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* Users */}
                {group.users.map(user => {
                  const isCurrentUser = isSSO && currentUserEmail === user.email
                  const canEdit = canUserEdit(user.email)
                  return (
                    <tr key={user.id} className={`transition-colors border-t border-gray-100 dark:border-gray-700 relative ${
                      isCurrentUser
                        ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : 'hover:bg-background dark:hover:bg-gray-700'
                    }`}>
                      <td className={`px-10 py-3 whitespace-nowrap text-sm sticky left-0 z-50 border-r border-gray-200 dark:border-gray-700 ${
                        isCurrentUser
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-semibold'
                          : 'bg-white dark:bg-gray-800 text-text dark:text-white'
                      }`}>
                        <div className="font-medium flex items-center gap-2">
                          {user.country && (
                            <span className="text-base" title={user.country}>{getCountryFlag(user.country)}</span>
                          )}
                          {user.name}
                          {isCurrentUser && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">You</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</div>
                      </td>
                      {days.map(day => {
                        const absence = absences.find(a => {
                          const start = parseISO(a.startDate)
                          const end = parseISO(a.endDate)
                          return a.userId === user.id && overlapsDay(start, end, day)
                        })
                        const isHalfDay = absence?.reason.includes('Morning') || absence?.reason.includes('Afternoon')
                        const isMorning = absence?.reason.includes('Morning')
                        const isRangeSelected = rangeStart?.userId === user.id && isSameDay(rangeStart.date, day)
                        const holiday = getUserHoliday(user.id, day)
                        const isWeekendDay = isWeekend(day)
                        return (
                          <td
                            key={day.toISOString()}
                            onClick={(e) => {
                              if (!canEdit) return
                              if (holiday) {
                                setHolidayModalData({ name: holiday.name, country: user.country!, date: day })
                                setShowHolidayModal(true)
                              } else if (!isWeekendDay) {
                                handleCellClick(user.id, day, e)
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              if (!canEdit) return
                              if (holiday) {
                                setHolidayModalData({ name: holiday.name, country: user.country!, date: day })
                                setShowHolidayModal(true)
                              } else if (!isWeekendDay) {
                                setModalData({ userId: user.id, startDate: day, endDate: day })
                                setShowAbsenceModal(true)
                              }
                            }}
                            className={`px-3 py-3 text-center transition-all border-l z-[1] relative ${
                              isWeekendDay
                                ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed border-gray-300 dark:border-gray-600'
                                : !canEdit
                                ? 'cursor-not-allowed opacity-50'
                                : holiday
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 cursor-pointer hover:bg-yellow-100 border-yellow-200'
                                : absence
                                ? 'bg-accent cursor-pointer hover:bg-opacity-80 border-gray-100 dark:border-gray-700'
                                : isRangeSelected
                                ? 'bg-primary bg-opacity-20 cursor-pointer border-primary'
                                : 'cursor-pointer hover:bg-primary hover:bg-opacity-10 border-gray-100 dark:border-gray-700'
                            }`}
                            title={holiday ? `${holiday.name} (${user.country})` : ''}
                          >
                            {holiday && (
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">{user.country}</span>
                                <FontAwesomeIcon icon={faStar} className="text-yellow-500 text-xs mt-0.5" />
                              </div>
                            )}
                            {!isWeekendDay && !holiday && absence && (
                              isHalfDay ? (
                                <div className="flex items-center justify-center">
                                  <FontAwesomeIcon icon={isMorning ? faSun : faMoon} className="text-white text-sm" />
                                </div>
                              ) : (
                                <FontAwesomeIcon icon={faCheck} className="text-white" />
                              )
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
              <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />
            </div>
            <span className="text-text dark:text-gray-300">Full Day Off</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
              <FontAwesomeIcon icon={faSun} className="text-white text-xs" />
            </div>
            <span className="text-text dark:text-gray-300">Morning Off</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
              <FontAwesomeIcon icon={faMoon} className="text-white text-xs" />
            </div>
            <span className="text-text dark:text-gray-300">Afternoon Off</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"></div>
            <span className="text-text dark:text-gray-300">Weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 flex flex-col items-center justify-center text-xs">
              <span className="text-yellow-700 dark:text-yellow-400 font-bold" style={{ fontSize: '8px' }}>XX</span>
              <FontAwesomeIcon icon={faStar} className="text-yellow-500" style={{ fontSize: '8px' }} />
            </div>
            <span className="text-text dark:text-gray-300">Public Holiday (click for details)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent bg-opacity-20 dark:bg-opacity-30 rounded border border-accent flex items-center justify-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-accent text-xs" />
            </div>
            <span className="text-text dark:text-gray-300">Low availability (&lt;50%)</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-background dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <strong>Tips:</strong> Click to toggle single day • Right-click or Ctrl/Cmd/Alt+Click for half-day options • Use "Range" mode to select multiple consecutive days
        </div>
      </div>

      {/* Absence Modal */}
      {showAbsenceModal && modalData && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAbsenceModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl max-w-md w-full mx-4 transition-colors" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-text dark:text-white mb-4">
              Request Time Off
            </h3>
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Period:</strong> {format(modalData.startDate, 'MMM d', { locale: enUS })}
                {!isSameDay(modalData.startDate, modalData.endDate) && ` - ${format(modalData.endDate, 'MMM d', { locale: enUS })}`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>User:</strong> {users.find(u => u.id === modalData.userId)?.name}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleAbsenceSubmit('full')}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
              >
                <FontAwesomeIcon icon={faCheck} />
                Full Day{!isSameDay(modalData.startDate, modalData.endDate) && 's'}
              </button>
              {isSameDay(modalData.startDate, modalData.endDate) && (
                <>
                  <button
                    onClick={() => handleAbsenceSubmit('morning')}
                    className="w-full bg-gradient-to-r from-accent to-secondary text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <FontAwesomeIcon icon={faSun} />
                    Morning Only
                  </button>
                  <button
                    onClick={() => handleAbsenceSubmit('afternoon')}
                    className="w-full bg-gradient-to-r from-secondary to-primary text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <FontAwesomeIcon icon={faMoon} />
                    Afternoon Only
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowAbsenceModal(false)
                  setModalData(null)
                  setRangeStart(null)
                }}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Export Modal */}
      {showExportModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowExportModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FontAwesomeIcon icon={faDownload} className="text-blue-600" />
                Export Absences
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Scope */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">What to export</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'all',    icon: faGlobe,     label: 'Everyone' },
                    { value: 'team',   icon: faUserGroup, label: 'A team' },
                    { value: 'person', icon: faUser,      label: 'A person' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setExportScope(opt.value)}
                      className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        exportScope === opt.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'
                      }`}
                    >
                      <FontAwesomeIcon icon={opt.icon} className="text-lg" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team picker */}
              {exportScope === 'team' && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Select team</p>
                  <select
                    value={exportTeamId}
                    onChange={e => setExportTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">— choose a team —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {exportTeamId && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      {users.filter(u => u.teamId === exportTeamId).length} member(s) •{' '}
                      {absences.filter(a => users.find(u => u.id === a.userId)?.teamId === exportTeamId).length} absence(s) this month
                    </p>
                  )}
                </div>
              )}

              {/* Person picker */}
              {exportScope === 'person' && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Select person</p>
                  <select
                    value={exportUserId}
                    onChange={e => setExportUserId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">— choose a person —</option>
                    {users
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(u => {
                        const team = u.teamId ? teams.find(t => t.id === u.teamId)?.name : null
                        return <option key={u.id} value={u.id}>{u.name}{team ? ` (${team})` : ''}</option>
                      })}
                  </select>
                  {exportUserId && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      {absences.filter(a => a.userId === exportUserId).length} absence(s) this month
                    </p>
                  )}
                </div>
              )}

              {/* Format */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Format</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'csv', icon: faFileCsv, label: 'CSV',  desc: 'Spreadsheet compatible' },
                    { value: 'pdf', icon: faFilePdf, label: 'PDF',  desc: 'Formatted report' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setExportFormat(opt.value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                        exportFormat === opt.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={opt.icon}
                        className={`text-2xl ${ opt.value === 'csv' ? 'text-green-600' : 'text-red-500' }`}
                      />
                      <div>
                        <p className={`font-semibold text-sm ${ exportFormat === opt.value ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200' }`}>{opt.label}</p>
                        <p className="text-xs text-slate-400">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {(() => {
                  const scopeUsers = getScopeUsers()
                  const { rows } = buildExportRows(scopeUsers)
                  const month = format(currentDate, 'MMMM yyyy', { locale: enUS })
                  const canExport = exportScope === 'all' || (exportScope === 'team' && exportTeamId) || (exportScope === 'person' && exportUserId)
                  if (!canExport) return <span className="text-slate-400">Select a scope above to preview.</span>
                  return (
                    <span>
                      Will export <strong className="text-slate-800 dark:text-white">{rows.length} absence(s)</strong> for{' '}
                      <strong className="text-slate-800 dark:text-white">{scopeUsers.length} person(s)</strong> — {month}
                    </span>
                  )
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doExport}
                disabled={(
                  (exportScope === 'team' && !exportTeamId) ||
                  (exportScope === 'person' && !exportUserId)
                )}
                className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <FontAwesomeIcon icon={exportFormat === 'pdf' ? faFilePdf : faFileCsv} />
                Download {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Holiday Modal */}
      {showHolidayModal && holidayModalData && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowHolidayModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl max-w-md w-full mx-4 transition-colors" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faStar} className="text-yellow-500 text-4xl" />
            </div>
            <h3 className="text-2xl font-bold text-text dark:text-white mb-2 text-center">
              Public Holiday
            </h3>
            <div className="mb-6 text-center">
              <p className="text-xl font-semibold text-primary dark:text-secondary mb-3">
                {holidayModalData.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Date:</strong> {format(holidayModalData.date, 'EEEE, MMMM d, yyyy', { locale: enUS })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Country:</strong> {holidayModalData.country}
              </p>
            </div>
            <button
              onClick={() => {
                setShowHolidayModal(false)
                setHolidayModalData(null)
              }}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all font-medium"
            >
              Close
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
