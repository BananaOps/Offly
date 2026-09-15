import { Holiday } from '../../types'
import { parseDay } from '../../lib/halfday'

export type ScreenId = 'calendar' | 'teams' | 'people' | 'holidays'

const ENTRIES: { id: ScreenId; label: string }[] = [
  { id: 'calendar', label: 'Calendrier' },
  { id: 'teams', label: 'Équipes' },
  { id: 'people', label: 'Personnes' },
  { id: 'holidays', label: 'Jours fériés' },
]

interface Props {
  screen: ScreenId
  onScreenChange: (screen: ScreenId) => void
  upcomingHolidays: Holiday[]
}

/** Rail de navigation : logo, 4 entrées, bloc « Prochains fériés » en pied (design.md §3). */
export default function Rail({ screen, onScreenChange, upcomingHolidays }: Props) {
  return (
    <div className="o-rail">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '18px 18px 16px' }}>
        <img src="/favicon.svg" alt="" width={26} height={26} style={{ display: 'block' }} />
        <div>
          <div style={{ font: "600 15px/1 'IBM Plex Sans', sans-serif", letterSpacing: '-0.01em' }}>Offly</div>
          <div className="o-label" style={{ letterSpacing: '0.09em', marginTop: 2 }}>
            Time off
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 10px' }}>
        {ENTRIES.map(entry => (
          <button
            key={entry.id}
            type="button"
            className="o-rail__item"
            aria-current={screen === entry.id ? 'page' : undefined}
            onClick={() => onScreenChange(entry.id)}
          >
            <span className="o-rail__dot" />
            {entry.label}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: '14px 16px', borderTop: '1px solid var(--hairline)' }}>
        <div className="o-label" style={{ letterSpacing: '0.09em', marginBottom: 8 }}>
          Prochains fériés
        </div>
        {upcomingHolidays.length === 0 ? (
          <div className="o-secondary">Aucun à venir</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcomingHolidays.map(holiday => (
              <div
                key={`${holiday.country}-${holiday.date}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  font: "400 11px 'IBM Plex Sans', sans-serif",
                  color: '#5a5a6b',
                }}
              >
                <span style={{ flex: 'none' }}>
                  {parseDay(holiday.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ·{' '}
                  {holiday.country}
                </span>
                <span className="o-truncate" style={{ color: 'var(--muted)', textAlign: 'right' }} title={holiday.name}>
                  {holiday.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
