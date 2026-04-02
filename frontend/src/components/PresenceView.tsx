import { useState, useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faCheckCircle, 
  faTimesCircle, 
  faCalendarDay,
  faChevronLeft,
  faChevronRight,
  faFilter,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { User, Team, Absence } from '../types'
import { getAbsences } from '../api'

interface PresenceViewProps {
  users: User[]
  teams: Team[]
}

interface UserPresence {
  user: User
  isPresent: boolean
  absenceReason?: string
  absenceType?: 'full' | 'morning' | 'afternoon'
}

export default function PresenceView({ users, teams }: PresenceViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [absences, setAbsences] = useState<Absence[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadAbsences()
  }, [selectedDate])

  const loadAbsences = async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      // Charger les absences qui couvrent la date sélectionnée
      const allAbsences = await getAbsences(undefined, dateStr, dateStr)
      setAbsences(allAbsences)
    } catch (error) {
      console.error('Error loading absences:', error)
    } finally {
      setLoading(false)
    }
  }

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const isToday = useMemo(() => {
    const today = new Date()
    return selectedDate.toDateString() === today.toDateString()
  }, [selectedDate])

  const userPresences = useMemo(() => {
    const selectedDateOnly = new Date(selectedDate)
    selectedDateOnly.setHours(0, 0, 0, 0)
    
    return users.map(user => {
      // Trouver toutes les absences de l'utilisateur qui couvrent la date sélectionnée
      const userAbsences = absences.filter(abs => {
        if (abs.userId !== user.id) return false
        
        const absStartDate = new Date(abs.startDate)
        const absEndDate = new Date(abs.endDate)
        absStartDate.setHours(0, 0, 0, 0)
        absEndDate.setHours(0, 0, 0, 0)
        
        // Vérifier si la date sélectionnée est dans la plage de l'absence
        return selectedDateOnly >= absStartDate && selectedDateOnly <= absEndDate
      })
      
      // S'il y a plusieurs absences pour le même jour, prendre la première
      const userAbsence = userAbsences[0]
      
      let absenceType: 'full' | 'morning' | 'afternoon' | undefined
      if (userAbsence) {
        const reason = userAbsence.reason.toLowerCase()
        if (reason.includes('morning') || reason.includes('matin') || reason.includes('☀')) {
          absenceType = 'morning'
        } else if (reason.includes('afternoon') || reason.includes('après-midi') || reason.includes('🌙')) {
          absenceType = 'afternoon'
        } else {
          absenceType = 'full'
        }
      }

      return {
        user,
        isPresent: !userAbsence || absenceType !== 'full',
        absenceReason: userAbsence?.reason,
        absenceType
      }
    })
  }, [users, absences, selectedDate])

  const filteredPresences = useMemo(() => {
    return userPresences.filter(presence => {
      if (selectedTeam && presence.user.teamId !== selectedTeam) {
        return false
      }
      return true
    })
  }, [userPresences, selectedTeam])

  const groupedPresences = useMemo(() => {
    const groups: Record<string, UserPresence[]> = {}
    
    filteredPresences.forEach(presence => {
      const teamId = presence.user.teamId || 'no-team'
      if (!groups[teamId]) groups[teamId] = []
      groups[teamId].push(presence)
    })
    
    return groups
  }, [filteredPresences])

  const stats = useMemo(() => {
    const total = filteredPresences.length
    const fullyPresent = filteredPresences.filter(p => !p.absenceType).length
    const fullyAbsent = filteredPresences.filter(p => p.absenceType === 'full').length
    const partiallyAbsent = filteredPresences.filter(p => 
      p.absenceType === 'morning' || p.absenceType === 'afternoon'
    ).length
    
    // Présents = totalement présents + partiellement absents (car ils sont là une partie de la journée)
    const present = fullyPresent + partiallyAbsent
    
    return { total, present, absent: fullyAbsent, partiallyAbsent }
  }, [filteredPresences])

  const getTeamName = (teamId: string) => {
    if (teamId === 'no-team') return 'No Team'
    return teams.find(t => t.id === teamId)?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Attendance
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Who's in the office today?
          </p>
        </div>
      </div>

      {/* Date selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-text dark:text-white">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              {isToday && (
                <span className="text-sm text-primary font-medium">Today</span>
              )}
            </div>
            
            <button
              onClick={() => changeDate(1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          
          {!isToday && (
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faCalendarDay} />
              Today
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-3xl font-bold text-text dark:text-white">{stats.total}</p>
            </div>
            <FontAwesomeIcon icon={faUsers} className="text-3xl text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
              <p className="text-3xl font-bold text-green-600">{stats.present}</p>
            </div>
            <FontAwesomeIcon icon={faCheckCircle} className="text-3xl text-green-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
              <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
            </div>
            <FontAwesomeIcon icon={faTimesCircle} className="text-3xl text-red-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Half Day</p>
              <p className="text-3xl font-bold text-orange-600">{stats.partiallyAbsent}</p>
            </div>
            <div className="text-3xl">☀️🌙</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition-colors">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faFilter} className="text-gray-400 text-sm" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <FontAwesomeIcon icon={faUsers} className="mr-1.5" />
            Team
          </label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">All teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Presence list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPresences).map(([teamId, presences]) => (
            <div key={teamId} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden transition-colors">
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="text-sm text-gray-400" />
                <h3 className="text-sm font-semibold text-text dark:text-white">
                  {getTeamName(teamId)}
                </h3>
                <span className="text-xs text-gray-500 ml-1">
                  ({presences.filter(p => p.isPresent).length}/{presences.length} present)
                </span>
              </div>
              
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {presences.map(presence => (
                  <div
                    key={presence.user.id}
                    className={`p-3 rounded-lg border transition-all ${
                      presence.absenceType === 'full'
                        ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20'
                        : presence.absenceType
                        ? 'border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-text dark:text-white truncate">
                          {presence.user.name}
                        </div>
                        {presence.user.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {presence.user.email}
                          </div>
                        )}
                      </div>
                      <div className="ml-2 shrink-0">
                        {presence.absenceType === 'full' ? (
                          <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />
                        ) : presence.absenceType === 'morning' ? (
                          <span>☀️</span>
                        ) : presence.absenceType === 'afternoon' ? (
                          <span>🌙</span>
                        ) : (
                          <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                        )}
                      </div>
                    </div>
                    {presence.absenceReason && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {presence.absenceReason.replace(/[☀️🌙]/g, '').trim()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {filteredPresences.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400">No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

