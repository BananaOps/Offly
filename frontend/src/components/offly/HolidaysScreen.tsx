import { useMemo, useState } from 'react'
import { Holiday, User } from '../../types'
import { countryFlag, countryName, isWeekend, parseDay } from '../../lib/halfday'
import { countries } from '../../utils/holidayManager'

interface Props {
  holidays: Holiday[]
  users: User[]
  year: number
}

const COUNTRY_NAMES = new Map(countries.map(c => [c.code, c.name]))

export default function HolidaysScreen({ holidays, users, year }: Props) {
  const [filter, setFilter] = useState('all')

  const grouped = useMemo(() => {
    const headcount = new Map<string, number>()
    for (const user of users) {
      const code = user.country?.toUpperCase()
      if (code) headcount.set(code, (headcount.get(code) ?? 0) + 1)
    }

    const byCountry = new Map<string, Holiday[]>()
    for (const holiday of holidays) {
      const code = holiday.country?.toUpperCase()
      if (!code) continue
      const bucket = byCountry.get(code)
      if (bucket) bucket.push(holiday)
      else byCountry.set(code, [holiday])
    }

    return [...byCountry.entries()]
      .map(([code, items]) => ({
        code,
        name: countryName(code, COUNTRY_NAMES.get(code)),
        heads: headcount.get(code) ?? 0,
        items: items.slice().sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [holidays, users])

  const visible = grouped.filter(c => filter === 'all' || c.code === filter)

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--hairline)' }}>
        <h1 className="o-h1">Jours fériés {year}</h1>
        <p className="o-sub">Un calendrier par pays. Une case hachurée dans le planning vient d'ici.</p>
      </div>

      <div style={{ padding: '16px 22px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" className="o-chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          Tous les pays
        </button>
        {grouped.map(country => (
          <button
            key={country.code}
            type="button"
            className="o-chip"
            aria-pressed={filter === country.code}
            onClick={() => setFilter(country.code)}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{countryFlag(country.code)}</span>
            {country.name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="o-secondary" style={{ padding: '22px' }}>
          Aucun jour férié enregistré pour {year}.
        </p>
      ) : (
        <div
          style={{
            padding: '16px 22px 22px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 14,
          }}
        >
          {visible.map(country => (
            <div key={country.code} className="o-card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '13px 16px',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--hairline)',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{countryFlag(country.code)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: "600 12.5px/1.2 'IBM Plex Sans', sans-serif" }}>{country.name}</div>
                  <div className="o-mono-sm" style={{ marginTop: 2 }}>
                    {country.items.length} {country.items.length > 1 ? 'jours' : 'jour'} ·{' '}
                    {country.heads} {country.heads > 1 ? 'personnes' : 'personne'}
                  </div>
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '3px 8px',
                    borderRadius: 5,
                    font: "500 10px 'IBM Plex Mono', monospace",
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-ink)',
                  }}
                >
                  {country.code}
                </span>
              </div>

              <div style={{ padding: '6px 16px 12px' }}>
                {country.items.map(holiday => {
                  const weekend = isWeekend(parseDay(holiday.date))
                  return (
                    <div
                      key={`${holiday.date}-${holiday.name}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 0',
                        borderBottom: '1px solid rgba(20,20,30,.05)',
                      }}
                    >
                      {/* design.md : un férié tombant un week-end porte le tag, pas un gris affaibli. */}
                      <span
                        style={{
                          width: 132,
                          flex: 'none',
                          font: "400 11.5px 'IBM Plex Mono', monospace",
                          color: weekend ? 'var(--faint)' : 'var(--ink)',
                        }}
                      >
                        {parseDay(holiday.date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <span
                        className="o-truncate"
                        style={{ flex: 1, font: "400 12px 'IBM Plex Sans', sans-serif", color: 'var(--ink-2)' }}
                      >
                        {holiday.name}
                      </span>
                      {weekend && (
                        <span className="o-mono-sm" style={{ flex: 'none', fontSize: 10 }}>
                          week-end
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
