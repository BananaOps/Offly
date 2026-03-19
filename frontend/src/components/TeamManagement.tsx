import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSave, faTimes, faUserGroup, faChevronDown, faChevronRight, faCircle } from '@fortawesome/free-solid-svg-icons'
import { Team, User, Absence, JOB_PROFILES } from '../types'
import { createTeam, updateTeam, deleteTeam } from '../api'
import { getAuthConfig } from '../auth'
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'

interface Props {
  teams: Team[]
  users: User[]
  absencesToday: Absence[]
  onUpdate: () => void
}

function AvailabilityBar({ present, total }: { present: number; total: number }) {
  if (total === 0) return <span className="text-xs text-slate-400">—</span>
  const pct = Math.round((present / total) * 100)
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'
  const textColor = pct >= 75 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{pct}%</span>
    </div>
  )
}

export default function TeamManagement({ teams, users, absencesToday, onUpdate }: Props) {
  const [newTeamName, setNewTeamName] = useState('')
  const [editTeamId, setEditTeamId] = useState<string | null>(null)
  const [editTeamName, setEditTeamName] = useState('')
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  const isReadOnly = getAuthConfig().enabled

  const today = useMemo(() => new Date(), [])

  // Qui est absent aujourd'hui
  const absentUserIds = useMemo(() => {
    const ids = new Set<string>()
    absencesToday.forEach(abs => {
      try {
        const start = startOfDay(parseISO(abs.startDate))
        const end = endOfDay(parseISO(abs.endDate))
        if (isWithinInterval(today, { start, end })) ids.add(abs.userId)
      } catch {}
    })
    return ids
  }, [absencesToday, today])

  // Membres par équipe avec statut
  const teamStats = useMemo(() => {
    return teams.map(team => {
      const members = users.filter(u => u.teamId === team.id)
      const present = members.filter(u => !absentUserIds.has(u.id))
      const absent = members.filter(u => absentUserIds.has(u.id))
      return { team, members, present, absent }
    })
  }, [teams, users, absentUserIds])

  const unassigned = users.filter(u => !u.teamId)

  const toggleExpand = (id: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return
    try {
      await createTeam(newTeamName.trim())
      setNewTeamName('')
      onUpdate()
    } catch (err) { console.error(err) }
  }

  const handleUpdate = async (id: string) => {
    try {
      await updateTeam(id, editTeamName)
      setEditTeamId(null)
      onUpdate()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team?')) return
    try {
      await deleteTeam(id)
      onUpdate()
    } catch (err) { console.error(err) }
  }

  const jobLabel = (profile?: string) =>
    JOB_PROFILES.find(j => j.value === profile)?.label ?? ''

  return (
    <div className="space-y-4">
      {/* Header + form */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FontAwesomeIcon icon={faUserGroup} className="text-blue-600" />
          Teams
          <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
            {teams.length}
          </span>
        </h2>
        {!isReadOnly && (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="New team name…"
              required
              className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 w-48"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1.5 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              Add
            </button>
          </form>
        )}
      </div>

      {/* Team cards */}
      <div className="grid gap-3">
        {teams.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">No teams yet</div>
        )}

        {teamStats.map(({ team, members, present, absent }) => {
          const expanded = expandedTeams.has(team.id)
          return (
            <div key={team.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              {/* Team row */}
              <div className="px-4 py-3 flex items-center gap-3">
                {/* Expand toggle */}
                <button
                  onClick={() => toggleExpand(team.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-4"
                >
                  <FontAwesomeIcon icon={expanded ? faChevronDown : faChevronRight} className="text-xs" />
                </button>

                {/* Name (editable) */}
                {editTeamId === team.id ? (
                  <>
                    <input
                      autoFocus
                      value={editTeamName}
                      onChange={e => setEditTeamName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm rounded border border-blue-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                    <button onClick={() => handleUpdate(team.id)} className="text-green-600 hover:text-green-500" title="Save">
                      <FontAwesomeIcon icon={faSave} className="text-sm" />
                    </button>
                    <button onClick={() => setEditTeamId(null)} className="text-slate-400 hover:text-slate-600" title="Cancel">
                      <FontAwesomeIcon icon={faTimes} className="text-sm" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{team.name}</span>

                    {/* Member count */}
                    <span className="text-xs text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>

                    {/* Availability bar */}
                    <AvailabilityBar present={present.length} total={members.length} />

                    {/* Present / Absent badges */}
                    <div className="flex gap-1.5">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        <FontAwesomeIcon icon={faCircle} className="text-[8px]" />
                        {present.length} present
                      </span>
                      {absent.length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          <FontAwesomeIcon icon={faCircle} className="text-[8px]" />
                          {absent.length} off
                        </span>
                      )}
                    </div>

                    {!isReadOnly && (
                      <div className="flex gap-2 ml-1">
                        <button
                          onClick={() => { setEditTeamId(team.id); setEditTeamName(team.name) }}
                          className="text-slate-300 hover:text-blue-500 transition-colors"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleDelete(team.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Expanded member list */}
              {expanded && members.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
                  {members.map(user => {
                    const isAbsent = absentUserIds.has(user.id)
                    return (
                      <div key={user.id} className={`px-10 py-2.5 flex items-center gap-3 text-sm ${
                        isAbsent ? 'opacity-50' : ''
                      }`}>
                        {/* Status dot */}
                        <FontAwesomeIcon
                          icon={faCircle}
                          className={`text-[8px] ${isAbsent ? 'text-red-400' : 'text-emerald-500'}`}
                        />
                        {/* Avatar initials */}
                        <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{user.name}</div>
                          <div className="text-xs text-slate-400 truncate">{user.email}</div>
                        </div>
                        {user.country && (
                          <span className="text-base" title={user.country}>
                            {getFlag(user.country)}
                          </span>
                        )}
                        {user.jobProfile && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">{jobLabel(user.jobProfile)}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isAbsent
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {isAbsent ? 'Off' : 'Present'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              {expanded && members.length === 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 px-10 py-3 text-xs text-slate-400">
                  No members assigned to this team.
                </div>
              )}
            </div>
          )
        })}

        {/* Unassigned users */}
        {unassigned.length > 0 && (() => {
          const expanded = expandedTeams.has('__unassigned__')
          return (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => toggleExpand('__unassigned__')}
                  className="text-slate-400 hover:text-slate-600 transition-colors w-4"
                >
                  <FontAwesomeIcon icon={expanded ? faChevronDown : faChevronRight} className="text-xs" />
                </button>
                <span className="flex-1 text-sm font-medium text-slate-400">Unassigned</span>
                <span className="text-xs text-slate-400">{unassigned.length} member{unassigned.length !== 1 ? 's' : ''}</span>
              </div>
              {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
                  {unassigned.map(user => {
                    const isAbsent = absentUserIds.has(user.id)
                    return (
                      <div key={user.id} className={`px-10 py-2.5 flex items-center gap-3 text-sm ${isAbsent ? 'opacity-50' : ''}`}>
                        <FontAwesomeIcon icon={faCircle} className={`text-[8px] ${isAbsent ? 'text-red-400' : 'text-emerald-500'}`} />
                        <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-700 dark:text-slate-200 truncate">{user.name}</div>
                          <div className="text-xs text-slate-400 truncate">{user.email}</div>
                        </div>
                        {user.country && <span className="text-base">{getFlag(user.country)}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          isAbsent ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }`}>{isAbsent ? 'Off' : 'Present'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function getFlag(country: string): string {
  if (!country || country.length !== 2) return ''
  return country.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0)))
}
