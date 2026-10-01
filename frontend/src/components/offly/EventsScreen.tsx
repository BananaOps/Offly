import { useMemo, useState } from 'react'
import { Event } from '../../types'
import { EventDraft } from '../../api/events'
import {
  EVENT_CATEGORIES,
  byDate,
  categoryLabel,
  categoryStyle,
  eventLength,
  monthKey,
  monthLabel,
  relativeTo,
} from '../../lib/events'
import { parseDay } from '../../lib/halfday'
import EventForm from './EventForm'

interface Props {
  events: Event[]
  today: string
  /** Écriture ouverte à toute personne connectée (règle RBAC de `/events`). */
  canWrite: boolean
  onSaveEvent: (draft: EventDraft) => Promise<void>
  onDeleteEvent: (event: Event) => Promise<void>
}

/** « lun 5 » — jour de semaine abrégé sans point, puis quantième. */
const dayLabel = (day: string): string => {
  const d = parseDay(day)
  const dow = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
  return `${dow} ${d.getDate()}`
}

/**
 * Une entrée de l'agenda. Le rail vertical porte un repère par événement : un
 * point pour une journée, une capsule étirée pour une période — la durée se lit
 * alors dans la forme, avant d'être écrite.
 */
function Entry({
  event,
  today,
  past,
  canWrite,
  onEdit,
}: {
  event: Event
  today: string
  past: boolean
  canWrite: boolean
  onEdit: () => void
}) {
  const tint = categoryStyle(event.category) as React.CSSProperties
  const when = past ? null : relativeTo(event, today)
  const days = eventLength(event)

  return (
    <div
      style={{
        ...tint,
        display: 'flex',
        alignItems: 'stretch',
        gap: 12,
        padding: '10px 10px 10px 0',
        opacity: past ? 0.6 : 1,
      }}
    >
      {/* Gouttière du rail : le trait la traverse, le repère s'y pose. */}
      <div
        style={{
          width: 30,
          flex: 'none',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 3,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 9,
            minHeight: 9,
            alignSelf: days > 1 ? 'stretch' : 'flex-start',
            borderRadius: 5,
            background: 'var(--ev)',
            border: '2px solid var(--surface)',
            boxSizing: 'content-box',
          }}
        />
      </div>

      <span style={{ width: 104, flex: 'none' }}>
        <span className="o-mono" style={{ display: 'block' }}>
          {dayLabel(event.startDate)}
        </span>
        {days > 1 && (
          <span
            style={{
              display: 'block',
              marginTop: 3,
              font: "400 10px 'IBM Plex Mono', monospace",
              color: 'var(--faint)',
            }}
          >
            → {dayLabel(event.endDate)} · {days} j
          </span>
        )}
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="o-truncate" style={{ display: 'block', fontWeight: 500 }}>
          {event.name}
        </span>
        {(event.location || event.url) && (
          <span
            className="o-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}
          >
            {event.location && <span className="o-truncate">{event.location}</span>}
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: 'var(--accent-ink)', flex: 'none' }}
              >
                Lien
              </a>
            )}
          </span>
        )}
      </span>

      <span style={{ width: 118, flex: 'none', paddingTop: 1 }}>
        {event.category ? <span className="o-ev-tag">{categoryLabel(event.category)}</span> : null}
      </span>

      <span style={{ width: 92, flex: 'none', display: 'flex', justifyContent: 'flex-end' }}>
        {when && (
          <span
            className="o-pill"
            style={
              when.ongoing
                ? ({ background: 'var(--ev-ink)', color: '#fff' } as React.CSSProperties)
                : undefined
            }
          >
            {when.label}
          </span>
        )}
      </span>

      <span style={{ width: 76, flex: 'none', display: 'flex', justifyContent: 'flex-end' }}>
        {canWrite && (
          <button
            type="button"
            className="o-ghost"
            onClick={onEdit}
            aria-label={`Modifier ${event.name}`}
          >
            Modifier
          </button>
        )}
      </span>
    </div>
  )
}

/** Un mois de l'agenda : son titre, puis le rail et ses entrées. */
function Month({
  label,
  items,
  today,
  past,
  canWrite,
  onEdit,
}: {
  label: string
  items: Event[]
  today: string
  past: boolean
  canWrite: boolean
  onEdit: (event: Event) => void
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="o-label" style={{ padding: '0 0 6px 42px' }}>
        {label}
      </div>
      {/* Le rail est un fond, pas un élément par ligne : il reste continu quelle
          que soit la hauteur des entrées. */}
      <div
        style={{
          backgroundImage: 'linear-gradient(var(--border), var(--border))',
          backgroundSize: '1px 100%',
          backgroundPosition: '15px 0',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {items.map(event => (
          <Entry
            key={event.id}
            event={event}
            today={today}
            past={past}
            canWrite={canWrite}
            onEdit={() => onEdit(event)}
          />
        ))}
      </div>
    </div>
  )
}

export default function EventsScreen({
  events,
  today,
  canWrite,
  onSaveEvent,
  onDeleteEvent,
}: Props) {
  // `null` = aucune fiche ouverte, `undefined` = fiche vierge (création).
  const [editing, setEditing] = useState<Event | undefined | null>(null)
  const [category, setCategory] = useState('all')
  // Les passés sont repliés : on vient sur cet écran pour ce qui arrive.
  const [showPast, setShowPast] = useState(false)

  const { months, pastMonths, pastCount, categories, upcomingCount } = useMemo(() => {
    const seen = new Set<string>()
    for (const event of events) if (event.category) seen.add(event.category)

    const kept = events.filter(c => category === 'all' || c.category === category)
    const byMonth = (list: Event[]) => {
      const out: { key: string; label: string; items: Event[] }[] = []
      for (const event of list) {
        const key = monthKey(event.startDate)
        const last = out[out.length - 1]
        if (last && last.key === key) last.items.push(event)
        else out.push({ key, label: monthLabel(event.startDate), items: [event] })
      }
      return out
    }

    const upcoming = kept.filter(e => e.endDate >= today).sort(byDate)
    // Passés : du plus récent au plus ancien — on cherche ce qui vient d'avoir
    // lieu, pas l'origine.
    const past = kept.filter(e => e.endDate < today).sort((a, b) => byDate(b, a))

    return {
      months: byMonth(upcoming),
      pastMonths: byMonth(past),
      pastCount: past.length,
      categories: EVENT_CATEGORIES.filter(c => seen.has(c.value)),
      upcomingCount: upcoming.length,
    }
  }, [events, today, category])

  const countLabel = [
    `${upcomingCount} à venir`,
    pastCount > 0 ? `${pastCount} passé${pastCount > 1 ? 's' : ''}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
    >
      <div
        style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="o-h1">Événements</h1>
          <p className="o-sub">
            {countLabel} · conférences, repas d'équipe, midis jeux — ils apparaissent aussi en tête
            du calendrier
          </p>
        </div>
        {canWrite && (
          <button type="button" className="o-btn" onClick={() => setEditing(undefined)}>
            Ajouter un événement
          </button>
        )}
      </div>

      {/* Le filtre ne propose que les catégories réellement portées : un filtre
          qui ne peut rien renvoyer n'a pas sa place (design.md §3). */}
      {categories.length > 0 && (
        <div style={{ padding: '16px 22px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="o-chip"
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            Toutes les catégories
          </button>
          {categories.map(c => (
            <button
              key={c.value}
              type="button"
              className="o-chip"
              aria-pressed={category === c.value}
              onClick={() => setCategory(c.value)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span
                aria-hidden="true"
                style={{
                  ...(categoryStyle(c.value) as React.CSSProperties),
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--ev)',
                  flex: 'none',
                }}
              />
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '18px 22px 22px', overflowX: 'auto' }}>
        <div style={{ minWidth: 780 }}>
          {months.length === 0 ? (
            <p className="o-secondary" style={{ padding: '4px 0 18px 42px' }}>
              Aucun événement à venir.
              {canWrite ? ' Proposez-en un : conférence, repas, midi jeux.' : ''}
            </p>
          ) : (
            months.map(month => (
              <Month
                key={month.key}
                label={month.label}
                items={month.items}
                today={today}
                past={false}
                canWrite={canWrite}
                onEdit={setEditing}
              />
            ))
          )}

          {pastCount > 0 && (
            <div style={{ marginTop: 6, paddingLeft: 20 }}>
              <button
                type="button"
                className="o-ghost"
                aria-expanded={showPast}
                onClick={() => setShowPast(v => !v)}
              >
                {showPast ? 'Masquer' : 'Afficher'}{' '}
                {pastCount > 1 ? `les ${pastCount} événements passés` : "l'événement passé"}
              </button>
              {showPast && (
                <div style={{ marginTop: 10, marginLeft: -20 }}>
                  {pastMonths.map(month => (
                    <Month
                      key={month.key}
                      label={month.label}
                      items={month.items}
                      today={today}
                      past
                      canWrite={canWrite}
                      onEdit={setEditing}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editing !== null && (
        <EventForm
          event={editing}
          defaultDay={today}
          canWrite={canWrite}
          onSave={onSaveEvent}
          onDelete={onDeleteEvent}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
