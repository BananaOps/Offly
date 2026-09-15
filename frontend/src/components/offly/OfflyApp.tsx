import { useCallback, useEffect, useMemo, useState } from 'react'
import { Holiday, Team, User } from '../../types'
import { createAbsence, deleteAbsence, getAbsences, getTeams, getUsers, updateAbsence } from '../../api'
import { getHolidaysForCountryAndYear } from '../../utils/holidayManager'
import { getAuthConfig, getCachedUserEmail, getCurrentUser } from '../../auth'
import {
  Part,
  Placed,
  boundsFor,
  buildAbsenceIndex,
  buildHolidayIndex,
  cellKey,
  formatDay,
  nextPart,
  shiftWorkingDays,
  startOfWeek,
  workingDays,
} from '../../lib/halfday'
import Rail, { ScreenId } from './Rail'
import CalendarScreen, { Group } from './CalendarScreen'
import TeamsScreen from './TeamsScreen'
import PeopleScreen from './PeopleScreen'
import HolidaysScreen from './HolidaysScreen'
import '../../design/offly.css'

/** Fenêtre du planning : 10 jours ouvrés, comme la maquette. */
const WINDOW = 10
/** design.md §4 : le seuil est un réglage, pas une constante. */
const DEFAULT_THRESHOLD = 50

export default function OfflyApp() {
  const [screen, setScreen] = useState<ScreenId>('calendar')
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [absenceIndex, setAbsenceIndex] = useState<Map<string, Placed>>(new Map())
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [windowStart, setWindowStart] = useState(() => startOfWeek(new Date()))
  const [threshold] = useState(DEFAULT_THRESHOLD)
  const [currentEmail, setCurrentEmail] = useState<string | null>(() =>
    getAuthConfig().enabled ? getCachedUserEmail() : null
  )
  const [error, setError] = useState<string | null>(null)

  const today = formatDay(new Date())
  const days = useMemo(() => workingDays(windowStart, WINDOW), [windowStart])
  const year = windowStart.getFullYear()

  useEffect(() => {
    if (!getAuthConfig().enabled) return
    getCurrentUser()
      .then(user => user && setCurrentEmail(user.email))
      .catch(() => undefined)
  }, [])

  /**
   * On charge l'année entière, pas seulement la fenêtre affichée : « Posé » et
   * « Prochaine absence » (écran Personnes) comme « Prochaine tension » (écran
   * Équipes) sont des totaux globaux, qu'une fenêtre de dix jours fausserait.
   */
  const fetchAbsences = useCallback(
    () => getAbsences(undefined, `${year}-01-01`, `${year}-12-31`).then(buildAbsenceIndex),
    [year]
  )

  useEffect(() => {
    let cancelled = false
    Promise.all([getUsers(), getTeams()])
      .then(([nextUsers, nextTeams]) => {
        if (cancelled) return
        setUsers(nextUsers)
        setTeams(nextTeams)
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger l'annuaire.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAbsences()
      .then(index => {
        if (!cancelled) setAbsenceIndex(index)
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger les absences.')
      })
    return () => {
      cancelled = true
    }
  }, [fetchAbsences])

  // Les fériés dépendent du pays des personnes : on ne charge que ceux qui servent.
  useEffect(() => {
    let cancelled = false
    const codes = [...new Set(users.map(u => u.country?.toUpperCase()).filter(Boolean))] as string[]
    Promise.all(codes.map(code => getHolidaysForCountryAndYear(code, year)))
      .then(lists => {
        if (!cancelled) setHolidays(lists.flat())
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [users, year])

  const holidayIndex = useMemo(() => buildHolidayIndex(holidays), [holidays])

  const currentUser = useMemo(
    () => (currentEmail ? users.find(u => u.email === currentEmail) : undefined),
    [users, currentEmail]
  )

  // En SSO, chacun ne modifie que ses propres absences — la règle RBAC du backend.
  const canEdit = useCallback(
    (user: User) => !getAuthConfig().enabled || !currentEmail || user.email === currentEmail,
    [currentEmail]
  )

  const groups: Group[] = useMemo(() => {
    const visible = users.filter(u => selectedTeam === 'all' || u.teamId === selectedTeam)
    const byName = (a: User, b: User) => a.name.localeCompare(b.name)
    const result: Group[] = teams
      .filter(team => selectedTeam === 'all' || team.id === selectedTeam)
      .map(team => ({
        id: team.id,
        name: team.name,
        members: visible.filter(u => u.teamId === team.id).sort(byName),
      }))
      .filter(group => group.members.length > 0)

    const orphans = visible.filter(u => !u.teamId).sort(byName)
    if (orphans.length > 0) result.push({ id: '__none__', name: 'Sans équipe', members: orphans })
    return result
  }, [users, teams, selectedTeam])

  const visibleCount = useMemo(() => groups.reduce((n, g) => n + g.members.length, 0), [groups])

  const upcomingHolidays = useMemo(
    () =>
      holidays
        .filter(h => h.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3),
    [holidays, today]
  )

  /**
   * Applique une portion sur une journée. Le modèle du design est « une valeur par
   * personne et par jour » ; une absence déjà enregistrée sur plusieurs jours ne peut
   * donc pas être modifiée depuis une seule case sans détruire le reste de la période.
   */
  const applyPart = useCallback(
    async (user: User, day: string, part?: Part) => {
      const existing = absenceIndex.get(cellKey(user.id, day))
      setError(null)
      try {
        if (existing) {
          const start = new Date(existing.absence.startDate)
          const end = new Date(existing.absence.endDate)
          const spansOneDay =
            start.getUTCFullYear() === end.getUTCFullYear() &&
            start.getUTCMonth() === end.getUTCMonth() &&
            start.getUTCDate() === end.getUTCDate()
          if (!spansOneDay) {
            setError('Cette absence couvre plusieurs jours : modifiez-la depuis la période complète.')
            return
          }
          if (!part) {
            await deleteAbsence(existing.absence.id)
          } else {
            const { startIso, endIso, reason } = boundsFor(day, part)
            await updateAbsence(existing.absence.id, startIso, endIso, reason, existing.absence.status || 'pending')
          }
        } else if (part) {
          const { startIso, endIso, reason } = boundsFor(day, part)
          const teamName = user.teamId ? (teams.find(t => t.id === user.teamId)?.name ?? '') : ''
          await createAbsence(user.id, startIso, endIso, reason, teamName)
        }
        setAbsenceIndex(await fetchAbsences())
      } catch {
        setError("L'enregistrement a échoué.")
      }
    },
    [absenceIndex, teams, fetchAbsences]
  )

  const onCycle = useCallback(
    (user: User, day: string) => {
      const current = absenceIndex.get(cellKey(user.id, day))?.part
      return applyPart(user, day, nextPart(current))
    },
    [absenceIndex, applyPart]
  )

  // Fenêtre de 15 jours ouvrés à partir d'aujourd'hui, pour « Prochaine tension ».
  const scanDays = useMemo(() => workingDays(new Date(), 15), [])

  return (
    <div className="offly" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Rail screen={screen} onScreenChange={setScreen} upcomingHolidays={upcomingHolidays} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {error && (
          <div className="o-alert" style={{ margin: '14px 22px 0' }} role="status">
            <span className="o-alert__dot" />
            <span style={{ font: "500 12px 'IBM Plex Sans', sans-serif" }}>{error}</span>
          </div>
        )}

        {screen === 'calendar' && (
          <CalendarScreen
            days={days}
            today={today}
            groups={groups}
            teams={teams}
            selectedTeam={selectedTeam}
            onSelectTeam={setSelectedTeam}
            absences={absenceIndex}
            holidays={holidayIndex}
            threshold={threshold}
            showCoverage
            peopleCount={visibleCount}
            onCycle={onCycle}
            onSet={applyPart}
            onPrev={() => setWindowStart(s => shiftWorkingDays(s, -WINDOW))}
            onNext={() => setWindowStart(s => shiftWorkingDays(s, WINDOW))}
            onToday={() => setWindowStart(startOfWeek(new Date()))}
            canEdit={canEdit}
            currentUser={currentUser}
          />
        )}

        {screen === 'teams' && (
          <TeamsScreen
            groups={groups}
            today={today}
            scanDays={scanDays}
            absences={absenceIndex}
            holidays={holidayIndex}
            threshold={threshold}
          />
        )}

        {screen === 'people' && (
          <PeopleScreen
            users={users}
            teams={teams}
            today={today}
            absences={absenceIndex}
            holidays={holidayIndex}
            selectedTeam={selectedTeam}
            onSelectTeam={setSelectedTeam}
            currentUser={currentUser}
          />
        )}

        {screen === 'holidays' && <HolidaysScreen holidays={holidays} users={users} year={year} />}
      </div>
    </div>
  )
}
