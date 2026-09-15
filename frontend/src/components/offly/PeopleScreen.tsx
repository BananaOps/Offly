import { useMemo, useState } from 'react'
import { Holiday, Team, User } from '../../types'
import {
  PART_LABEL,
  Placed,
  cellKey,
  countryFlag,
  countryName,
  formatDays,
  holidayFor,
  initialsOf,
  parseDay,
} from '../../lib/halfday'
import { countries } from '../../utils/holidayManager'
import { profileLabel, usedProfiles } from '../../lib/profiles'

interface Props {
  users: User[]
  teams: Team[]
  today: string
  absences: Map<string, Placed>
  holidays: Map<string, Holiday>
  selectedTeam: string
  onSelectTeam: (id: string) => void
  selectedProfile: string
  onSelectProfile: (value: string) => void
  currentUser?: User
}

const COUNTRY_NAMES = new Map(countries.map(c => [c.code, c.name]))

const COLUMNS = [
  { label: 'Personne', width: 230 },
  { label: 'Équipe', width: 105 },
  { label: 'Profil', width: 130 },
  { label: 'Pays', width: 150 },
  { label: 'Posé', width: 110 },
  { label: 'Prochaine absence', flex: true },
  { label: "Aujourd'hui", width: 92, right: true },
]

export default function PeopleScreen({
  users,
  teams,
  today,
  absences,
  holidays,
  selectedTeam,
  onSelectTeam,
  selectedProfile,
  onSelectProfile,
  currentUser,
}: Props) {
  const [query, setQuery] = useState('')

  const teamNames = useMemo(() => new Map(teams.map(t => [t.id, t.name])), [teams])
  const profiles = useMemo(() => usedProfiles(users), [users])

  // Demi-journées posées et prochaine absence, dérivées de l'index d'absences.
  const rows = useMemo(() => {
    const postedBy = new Map<string, number>()
    const nextBy = new Map<string, { day: string; part: string }>()
    for (const [key, placed] of absences) {
      const [userId, day] = key.split('|')
      postedBy.set(userId, (postedBy.get(userId) ?? 0) + (placed.part === 'full' ? 2 : 1))
      if (day >= today) {
        const current = nextBy.get(userId)
        if (!current || day < current.day) nextBy.set(userId, { day, part: PART_LABEL[placed.part] })
      }
    }

    const q = query.trim().toLowerCase()
    return users
      .filter(u => selectedTeam === 'all' || u.teamId === selectedTeam)
      .filter(u => !selectedProfile || u.jobProfile === selectedProfile)
      .filter(
        u =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q) ||
          profileLabel(u.jobProfile).toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(user => {
        const holiday = holidayFor(holidays, user, today)
        const part = absences.get(cellKey(user.id, today))?.part
        const next = nextBy.get(user.id)
        return {
          user,
          posted: formatDays(postedBy.get(user.id) ?? 0),
          next: next
            ? `${parseDay(next.day).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })} · ${next.part.toLowerCase()}`
            : '—',
          status: holiday
            ? { label: 'Férié', className: 'o-pill o-pill--holiday' }
            : part
              ? { label: PART_LABEL[part], className: 'o-pill o-pill--off' }
              : { label: 'Présent', className: 'o-pill' },
        }
      })
  }, [users, absences, holidays, today, selectedTeam, selectedProfile, query])

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--hairline)' }}>
        <h1 className="o-h1">Personnes</h1>
        <p className="o-sub">
          {rows.length} {rows.length > 1 ? 'personnes' : 'personne'} · le pays détermine les jours fériés appliqués
        </p>
      </div>

      <div style={{ padding: '16px 22px 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input
          className="o-field"
          style={{ width: 230 }}
          placeholder="Rechercher une personne"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Rechercher une personne"
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="o-chip"
            aria-pressed={selectedTeam === 'all'}
            onClick={() => onSelectTeam('all')}
          >
            Toutes les équipes
          </button>
          {teams.map(team => (
            <button
              key={team.id}
              type="button"
              className="o-chip"
              aria-pressed={selectedTeam === team.id}
              onClick={() => onSelectTeam(team.id)}
            >
              {team.name}
            </button>
          ))}
        </div>
        {profiles.length > 0 && (
          <select
            className="o-field"
            style={{ height: 27, maxWidth: 200 }}
            value={selectedProfile}
            onChange={e => onSelectProfile(e.target.value)}
            aria-label="Filtrer par profil"
          >
            <option value="">Tous les profils</option>
            {profiles.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ padding: '16px 22px 22px', overflowX: 'auto' }}>
        <div style={{ minWidth: 900 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 10px 8px',
              borderBottom: '1px solid rgba(20,20,30,.08)',
            }}
          >
            {COLUMNS.map(col => (
              <span
                key={col.label}
                className="o-label"
                style={{
                  width: col.width,
                  flex: col.flex ? 1 : undefined,
                  textAlign: col.right ? 'right' : undefined,
                }}
              >
                {col.label}
              </span>
            ))}
          </div>

          {rows.length === 0 && (
            <p className="o-secondary" style={{ padding: '18px 10px' }}>
              Aucune personne ne correspond à ce filtre.
            </p>
          )}

          {rows.map(row => (
            <div
              key={row.user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 10px',
                borderBottom: '1px solid rgba(20,20,30,.05)',
              }}
            >
              <div style={{ width: 230, display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <div
                  className={`o-avatar o-avatar--lg${row.user.id === currentUser?.id ? ' o-avatar--self' : ''}`}
                  aria-hidden="true"
                >
                  {initialsOf(row.user.name)}
                </div>
                <span className="o-truncate o-body">{row.user.name}</span>
              </div>
              <span style={{ width: 105, font: "400 12px 'IBM Plex Sans', sans-serif", color: '#5a5a6b' }}>
                {row.user.teamId ? (teamNames.get(row.user.teamId) ?? '—') : '—'}
              </span>
              <span
                className="o-truncate"
                style={{ width: 130, font: "400 12px 'IBM Plex Sans', sans-serif", color: '#5a5a6b' }}
              >
                {profileLabel(row.user.jobProfile) || '—'}
              </span>
              <span
                style={{
                  width: 150,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  font: "400 12px 'IBM Plex Sans', sans-serif",
                  color: '#5a5a6b',
                }}
              >
                {row.user.country && <span style={{ fontSize: 14, lineHeight: 1 }}>{countryFlag(row.user.country)}</span>}
                <span className="o-truncate">
                  {row.user.country
                    ? countryName(row.user.country, COUNTRY_NAMES.get(row.user.country.toUpperCase()))
                    : '—'}
                </span>
              </span>
              <span style={{ width: 110 }} className="o-mono">
                {row.posted}
              </span>
              <span style={{ flex: 1 }} className="o-mono-sm">
                {row.next}
              </span>
              <span style={{ width: 92, display: 'flex', justifyContent: 'flex-end' }}>
                <span className={row.status.className}>{row.status.label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
