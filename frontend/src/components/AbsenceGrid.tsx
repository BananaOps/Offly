import React, { useState, useEffect, useRef } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faCheck, faBuilding, faUserGroup, faExclamationTriangle, faCalendarPlus, faMousePointer, faSun, faMoon, faStar } from '@fortawesome/free-solid-svg-icons'
import { User, Department, Team, Absence, Holiday } from '../types'
import { getAbsences, createAbsence, deleteAbsence } from '../api'
import { getHolidaysForCountryAndYear } from '../utils/holidayManager'
import { getCurrentUser, getAuthConfig, getCachedUserEmail } from '../auth'

interface Props {
  users: User[]
  departments: Department[]
  teams: Team[]
}

interface GroupedUsers {
  departmentId: string
  departmentName: string
  teams: {
    teamId: string
    teamName: string
    users: User[]
  }[]
  usersWithoutTeam: User[]
}

export default function AbsenceGrid({ users, departments, teams }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [absences, setAbsences] = useState<Absence[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
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

  useEffect(() => {
    // Update SSO status when auth config changes
    setIsSSO(getAuthConfig().enabled)
  }, [])

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
    if (selectedDepartment && user.departmentId !== selectedDepartment) return false
    if (selectedTeam && user.teamId !== selectedTeam) return false
    return true
  })

  // Group users by department and team
  const groupedUsers: GroupedUsers[] = departments
    .filter(dept => !selectedDepartment || dept.id === selectedDepartment)
    .map(dept => {
      const deptUsers = filteredUsers.filter(u => u.departmentId === dept.id)
      const deptTeams = teams.filter(t => t.departmentId === dept.id)
      
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        teams: deptTeams
          .filter(team => !selectedTeam || team.id === selectedTeam)
          .map(team => ({
            teamId: team.id,
            teamName: team.name,
            users: deptUsers.filter(u => u.teamId === team.id)
          }))
          .filter(team => team.users.length > 0),
        usersWithoutTeam: deptUsers.filter(u => !u.teamId)
      }
    })
    .filter(group => group.teams.length > 0 || group.usersWithoutTeam.length > 0)

  // Add users without department
  const usersWithoutDept = filteredUsers.filter(u => !u.departmentId)
  if (usersWithoutDept.length > 0) {
    groupedUsers.push({
      departmentId: '',
      departmentName: 'No Department',
      teams: [],
      usersWithoutTeam: usersWithoutDept
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
        <div className="flex gap-3">
          <div className="relative">
            <FontAwesomeIcon 
              icon={faBuilding} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none text-sm"
            />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium appearance-none cursor-pointer hover:border-blue-500 outline-none"
            >
              <option value="">All departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
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
              <React.Fragment key={group.departmentId || 'no-dept'}>
                {/* Department Header */}
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-8 py-2 text-xs font-bold text-text dark:text-white sticky left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                    <FontAwesomeIcon icon={faBuilding} className="text-secondary mr-2" />
                    {group.departmentName}
                  </td>
                  {days.map(day => (
                    <td key={day.toISOString()} className="border-l border-gray-100 dark:border-gray-700 bg-secondary bg-opacity-5 dark:bg-opacity-10"></td>
                  ))}
                </tr>

                {/* Teams */}
                {group.teams.map(team => (
                  <React.Fragment key={team.teamId}>
                    {/* Team Header with Availability Indicators */}
                    <tr className="bg-secondary bg-opacity-5 dark:bg-opacity-10 border-t border-gray-200 dark:border-gray-700">
                      <td className="px-8 py-2 text-xs font-semibold text-text dark:text-white sticky left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        <FontAwesomeIcon icon={faUserGroup} className="text-secondary mr-2" />
                        {team.teamName} ({team.users.length})
                      </td>
                      {days.map(day => {
                        if (isWeekend(day)) {
                          return <td key={day.toISOString()} className="bg-gray-200 dark:bg-gray-700 border-l border-gray-300 dark:border-gray-600"></td>
                        }
                        const availability = getTeamAvailability(team.users, day)
                        const isLowAvailability = availability.percentage < 50
                        return (
                          <td 
                            key={day.toISOString()} 
                            className={`px-2 py-2 text-center text-xs border-l border-gray-100 dark:border-gray-700 ${
                              isLowAvailability ? 'bg-accent bg-opacity-20 dark:bg-opacity-30' : 'bg-secondary bg-opacity-5 dark:bg-opacity-10'
                            }`}
                          >
                            {isLowAvailability && (
                              <div className="flex items-center justify-center gap-1">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-accent text-xs" />
                                <span className="text-accent font-semibold">{availability.presentUsers}/{availability.totalUsers}</span>
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>

                    {/* Team Users */}
                    {team.users.map(user => {
                      const isCurrentUser = isSSO && currentUserEmail === user.email
                      const canEdit = canUserEdit(user.email)
                      return (
                      <tr key={user.id} className={`transition-colors border-t border-gray-100 dark:border-gray-700 relative ${
                        isCurrentUser 
                          ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                          : 'hover:bg-background dark:hover:bg-gray-700'
                      }`}>
                        <td className={`px-12 py-3 whitespace-nowrap text-sm sticky left-0 z-50 border-r border-gray-200 dark:border-gray-700 ${
                          isCurrentUser 
                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-semibold' 
                            : 'bg-white dark:bg-gray-800 text-text dark:text-white'
                        }`}>
                          <div className="font-medium flex items-center gap-2">
                            {user.country && (
                              <span className="text-base" title={user.country}>
                                {getCountryFlag(user.country)}
                              </span>
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
                                  ? 'bg-yellow-50 dark:bg-yellow-900/20 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
                                  : absence
                                  ? 'bg-accent cursor-pointer hover:bg-opacity-80 border-gray-100 dark:border-gray-700'
                                  : isRangeSelected
                                  ? 'bg-primary bg-opacity-20 dark:bg-opacity-30 cursor-pointer border-primary'
                                  : 'cursor-pointer hover:bg-primary hover:bg-opacity-10 dark:hover:bg-opacity-20 border-gray-100 dark:border-gray-700'
                              }`}
                              title={holiday ? `${holiday.name} (${user.country})` : ''}
                            >
                              {holiday && (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">
                                    {user.country}
                                  </span>
                                  <FontAwesomeIcon icon={faStar} className="text-yellow-500 text-xs mt-0.5" />
                                </div>
                              )}
                              {!isWeekendDay && !holiday && absence && (
                                isHalfDay ? (
                                  <div className="flex items-center justify-center">
                                    <FontAwesomeIcon 
                                      icon={isMorning ? faSun : faMoon} 
                                      className="text-white text-sm" 
                                    />
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

                {/* Users without team */}
                {group.usersWithoutTeam.length > 0 && (
                  <>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 relative">
                      <td className="px-8 py-2 text-xs font-semibold text-gray-700 dark:text-white sticky left-0 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                        No Team ({group.usersWithoutTeam.length})
                      </td>
                      {days.map(day => (
                        <td
                          key={day.toISOString()}
                          className={`border-l z-[1] ${
                            isWeekend(day)
                              ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700'
                          }`}
                        ></td>
                      ))}
                    </tr>
                    {group.usersWithoutTeam.map(user => {
                      const isCurrentUser = isSSO && currentUserEmail === user.email
                      const canEdit = canUserEdit(user.email)
                      return (
                      <tr key={user.id} className={`transition-colors border-t border-gray-100 dark:border-gray-700 relative ${
                        isCurrentUser 
                          ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                          : 'hover:bg-background dark:hover:bg-gray-700'
                      }`}>
                        <td className={`px-12 py-3 whitespace-nowrap text-sm sticky left-0 z-50 border-r border-gray-200 dark:border-gray-700 ${
                          isCurrentUser 
                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-semibold' 
                            : 'bg-white dark:bg-gray-800 text-text dark:text-white'
                        }`}>
                          <div className="font-medium flex items-center gap-2">
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
                          const isWeekendDay = isWeekend(day)
                          
                          return (
                          <td
                            key={day.toISOString()}
                            onClick={(e) => {
                              if (!canEdit) return
                              if (!isWeekendDay) handleCellClick(user.id, day, e)
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              if (!canEdit) return
                              if (!isWeekendDay) {
                                setModalData({ userId: user.id, startDate: day, endDate: day })
                                setShowAbsenceModal(true)
                              }
                            }}
                            className={`px-3 py-3 text-center transition-all border-l z-[1] ${
                              isWeekendDay
                                ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed border-gray-300 dark:border-gray-600' 
                                : !canEdit
                                ? 'cursor-not-allowed opacity-50'
                                : absence
                                ? 'bg-accent cursor-pointer hover:bg-opacity-80 border-gray-100 dark:border-gray-700'
                                : 'cursor-pointer hover:bg-primary hover:bg-opacity-10 border-gray-100 dark:border-gray-700'
                            }`}
                          >
                            {!isWeekendDay && absence && (
                              isHalfDay ? (
                                <div className="flex items-center justify-center">
                                  <FontAwesomeIcon 
                                    icon={isMorning ? faSun : faMoon} 
                                    className="text-white text-sm" 
                                  />
                                </div>
                              ) : (
                                <FontAwesomeIcon icon={faCheck} className="text-white" />
                              )
                            )}
                          </td>
                        )})}
                      </tr>
                    )
                    })}
                  </>
                )}
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
      {showAbsenceModal && modalData && (
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
      )}

      {/* Holiday Modal */}
      {showHolidayModal && holidayModalData && (
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
      )}
    </div>
  )
}
