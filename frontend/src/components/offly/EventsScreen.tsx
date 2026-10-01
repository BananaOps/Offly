import { useMemo, useState } from 'react'
import { Event } from '../../types'
import { EventDraft } from '../../api/events'
import { EVENT_CATEGORIES, byDate, categoryLabel, formatEventDates } from '../../lib/events'
import EventForm from './EventForm'

interface Props {
  events: Event[]
  today: string
  /** Écriture ouverte à toute personne connectée (règle RBAC de `/events`). */
  canWrite: boolean
  onSaveEvent: (draft: EventDraft) => Promise<void>
  onDeleteEvent: (event: Event) => Promise<void>
}

/**
 * Une ligne d'événement : dates, nom, catégorie, lieu, lien, et « Modifier ».
 * Passé, l'événement garde sa place mais s'efface — la mémoire d'équipe vaut
 * mieux qu'une liste qui se vide.
 */
function Row({
  event,
  past,
  canWrite,
  onEdit,
}: {
  event: Event
  past: boolean
  canWrite: boolean
  onEdit: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '9px 10px',
        borderBottom: '1px solid var(--hairline)',
        opacity: past ? 0.55 : 1,
      }}
    >
      <span className="o-mono" style={{ width: 150, flex: 'none' }}>
        {formatEventDates(event)}
      </span>
      <span className="o-truncate" style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>
        {event.name}
      </span>
      <span style={{ width: 110, flex: 'none' }}>
        {event.category ? <span className="o-pill">{categoryLabel(event.category)}</span> : null}
      </span>
      <span className="o-truncate o-secondary" style={{ width: 130, flex: 'none' }}>
        {event.location || '—'}
      </span>
      <span style={{ width: 70, flex: 'none' }}>
        {event.url ? (
          <a className="o-ghost" href={event.url} target="_blank" rel="noreferrer noopener">
            Lien
          </a>
        ) : null}
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

  const { upcoming, past, categories } = useMemo(() => {
    const seen = new Set<string>()
    for (const event of events) if (event.category) seen.add(event.category)

    const kept = events.filter(e => category === 'all' || e.category === category)
    return {
      // À venir : du plus proche au plus lointain. Passés : du plus récent au
      // plus ancien — on cherche ce qui vient d'avoir lieu, pas l'origine.
      upcoming: kept.filter(e => e.endDate >= today).sort(byDate),
      past: kept.filter(e => e.endDate < today).sort((a, b) => byDate(b, a)),
      categories: EVENT_CATEGORIES.filter(c => seen.has(c.value)),
    }
  }, [events, today, category])

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
            Conférences, repas d'équipe, midis jeux · ils apparaissent aussi en tête du calendrier
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
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '16px 22px 22px', overflowX: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          <div className="o-label" style={{ padding: '0 10px 8px' }}>
            À venir
          </div>
          {upcoming.length === 0 ? (
            <p className="o-secondary" style={{ padding: '4px 10px 18px' }}>
              Aucun événement à venir.
              {canWrite ? ' Proposez-en un : conférence, repas, midi jeux.' : ''}
            </p>
          ) : (
            upcoming.map(event => (
              <Row
                key={event.id}
                event={event}
                past={false}
                canWrite={canWrite}
                onEdit={() => setEditing(event)}
              />
            ))
          )}

          {past.length > 0 && (
            <>
              <div className="o-label" style={{ padding: '22px 10px 8px' }}>
                Passés
              </div>
              {past.map(event => (
                <Row
                  key={event.id}
                  event={event}
                  past
                  canWrite={canWrite}
                  onEdit={() => setEditing(event)}
                />
              ))}
            </>
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
