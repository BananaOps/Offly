import { Holiday, User } from '../../types'
import {
  PART_LABEL,
  Placed,
  cellKey,
  countryFlag,
  coverageFor,
  holidayFor,
  initialsOf,
  longDate,
} from '../../lib/halfday'
import { Group } from './CalendarScreen'

interface Props {
  groups: Group[]
  today: string
  scanDays: string[]
  absences: Map<string, Placed>
  holidays: Map<string, Holiday>
  threshold: number
}

/** État du jour d'une personne : férié, portion posée, ou présent (design.md §3). */
function statusToday(
  member: User,
  today: string,
  absences: Map<string, Placed>,
  holidays: Map<string, Holiday>
): { label: string; className: string } {
  if (holidayFor(holidays, member, today)) return { label: 'Férié', className: 'o-pill o-pill--holiday' }
  const part = absences.get(cellKey(member.id, today))?.part
  if (part) return { label: PART_LABEL[part], className: 'o-pill o-pill--off' }
  return { label: 'Présent', className: 'o-pill' }
}

export default function TeamsScreen({ groups, today, scanDays, absences, holidays, threshold }: Props) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--hairline)' }}>
        <h1 className="o-h1">Équipes</h1>
        <p className="o-sub">Couverture du jour, demi-journée par demi-journée · seuil {threshold}%</p>
      </div>

      <div
        style={{
          padding: '18px 22px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 14,
        }}
      >
        {groups.map(group => {
          const cov = coverageFor(group.members, today, absences, holidays, threshold)
          const amPercent = cov?.amPercent ?? 100
          const pmPercent = cov?.pmPercent ?? 100

          const byCountry = new Map<string, number>()
          for (const member of group.members) {
            const country = member.country?.toUpperCase()
            if (country) byCountry.set(country, (byCountry.get(country) ?? 0) + 1)
          }

          // Prochaine tension : premier jour à venir sous le seuil.
          let tension = '—'
          for (const day of scanDays) {
            const c = coverageFor(group.members, day, absences, holidays, threshold)
            if (c?.belowThreshold) {
              tension = longDate(day)
              break
            }
          }

          return (
            <div key={group.id} className="o-card o-card--pad">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="o-card-title">{group.name}</span>
                <span className="o-mono-sm">
                  {group.members.length} {group.members.length > 1 ? 'personnes' : 'personne'}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
                  {[...byCountry.entries()].map(([code, count]) => (
                    <span
                      key={code}
                      title={code}
                      className="o-mono-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1 }}>{countryFlag(code)}</span>
                      {count}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                {[
                  { label: 'Matin', value: amPercent },
                  { label: 'Après-midi', value: pmPercent },
                ].map(bar => {
                  const low = bar.value < threshold
                  return (
                    <div key={bar.label} style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span className="o-label">{bar.label}</span>
                        <span className="o-mono" style={{ color: low ? 'var(--alert-ink)' : 'var(--ink)' }}>
                          {bar.value}%
                        </span>
                      </div>
                      <div className="o-bar">
                        <div
                          className={`o-bar__fill${low ? ' o-bar__fill--low' : ''}`}
                          style={{ width: `${bar.value}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 14 }}>
                {group.members.map(member => {
                  const status = statusToday(member, today, absences, holidays)
                  return (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                      <div className="o-avatar" aria-hidden="true">
                        {initialsOf(member.name)}
                      </div>
                      {member.country && (
                        <span title={member.country} style={{ fontSize: 12, lineHeight: 1, flex: 'none' }}>
                          {countryFlag(member.country)}
                        </span>
                      )}
                      <span
                        className="o-truncate"
                        style={{ flex: 1, font: "400 12px 'IBM Plex Sans', sans-serif", color: 'var(--ink-2)' }}
                      >
                        {member.name}
                      </span>
                      <span className={status.className} style={{ flex: 'none' }}>
                        {status.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(20,20,30,.06)',
                }}
              >
                <span className="o-secondary">Prochaine tension</span>
                <span
                  className="o-mono"
                  style={{ marginLeft: 'auto', color: tension === '—' ? 'var(--muted)' : 'var(--alert-ink)' }}
                >
                  {tension}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
