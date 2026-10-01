import { useEffect, useRef, useState } from 'react'
import { Event } from '../../types'
import { EventDraft } from '../../api/events'
import { EVENT_CATEGORIES } from '../../lib/events'

interface Props {
  /** Événement à modifier ; absent, le formulaire en crée un. */
  event?: Event
  /** Date pré-remplie à la création — le jour cliqué, ou aujourd'hui. */
  defaultDay: string
  /** Faux pour un visiteur non identifié : la fiche devient une consultation. */
  canWrite: boolean
  onSave: (draft: EventDraft) => Promise<void>
  onDelete: (event: Event) => Promise<void>
  onClose: () => void
}

const messageOf = (err: unknown): string => {
  const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string }
  return (
    e?.response?.data?.error ??
    e?.response?.data?.message ??
    e?.message ??
    "L'enregistrement a échoué."
  )
}

/**
 * Fiche d'un événement : nom, dates, catégorie, lieu, lien.
 *
 * Toute personne connectée peut en créer un — un midi jeux se propose, il ne
 * s'administre pas — c'est la règle que `rbacMiddleware` applique sur `/events`.
 */
export default function EventForm({
  event,
  defaultDay,
  canWrite,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState(event?.name ?? '')
  const [startDate, setStartDate] = useState(event?.startDate ?? defaultDay)
  // Vide tant que l'événement tient sur un jour : la date de fin est le cas rare,
  // et le backend la recopie de la date de début quand elle n'est pas fournie.
  const [endDate, setEndDate] = useState(
    event && event.endDate !== event.startDate ? event.endDate : ''
  )
  const [category, setCategory] = useState(event?.category ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [url, setUrl] = useState(event?.url ?? '')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstField.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const inverted = endDate !== '' && endDate < startDate
  const ready = canWrite && name.trim().length > 0 && startDate !== '' && !inverted && !busy

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      await onSave({
        id: event?.id,
        name: name.trim(),
        startDate,
        endDate,
        category,
        location: location.trim(),
        url: url.trim(),
      })
      onClose()
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!event) return
    setBusy(true)
    setError(null)
    try {
      await onDelete(event)
      onClose()
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <div
      className="o-scrim"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        className="o-modal"
        role="dialog"
        aria-modal="true"
        aria-label={event ? "Modifier l'événement" : 'Ajouter un événement'}
        onSubmit={submit}
      >
        <h2 className="o-card-title" style={{ marginBottom: 14 }}>
          {event ? event.name : 'Ajouter un événement'}
        </h2>

        {error && (
          <div className="o-alert" style={{ marginBottom: 12 }} role="status">
            <span className="o-alert__dot" />
            <span style={{ font: "500 12px 'IBM Plex Sans', sans-serif" }}>{error}</span>
          </div>
        )}

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
            Nom
          </span>
          <input
            ref={firstField}
            className="o-field"
            style={{ width: '100%' }}
            value={name}
            onChange={e => setName(e.target.value)}
            readOnly={!canWrite}
            placeholder="DevOps REX"
          />
        </label>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <label style={{ flex: 1, minWidth: 0, display: 'block' }}>
            <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
              Date
            </span>
            <input
              type="date"
              className="o-field"
              style={{ width: '100%' }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              readOnly={!canWrite}
            />
          </label>
          <label style={{ flex: 1, minWidth: 0, display: 'block' }}>
            <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
              Fin (optionnel)
            </span>
            <input
              type="date"
              className="o-field"
              style={{ width: '100%' }}
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              readOnly={!canWrite}
            />
          </label>
        </div>

        {inverted && (
          <div className="o-alert" style={{ marginBottom: 12 }} role="status">
            <span className="o-alert__dot" />
            <span style={{ font: "400 12px 'IBM Plex Sans', sans-serif" }}>
              La date de fin précède la date de début.
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <label style={{ flex: 1, minWidth: 0, display: 'block' }}>
            <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
              Catégorie
            </span>
            <select
              className="o-field"
              style={{ width: '100%' }}
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={!canWrite}
            >
              <option value="">Non renseignée</option>
              {EVENT_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
              {/* Une catégorie stockée hors de la liste reste sélectionnable. */}
              {category && !EVENT_CATEGORIES.some(c => c.value === category) && (
                <option value={category}>{category}</option>
              )}
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 0, display: 'block' }}>
            <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
              Lieu
            </span>
            <input
              className="o-field"
              style={{ width: '100%' }}
              value={location}
              onChange={e => setLocation(e.target.value)}
              readOnly={!canWrite}
              placeholder="Paris, visio…"
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
            Lien
          </span>
          <input
            type="url"
            className="o-field"
            style={{ width: '100%' }}
            value={url}
            onChange={e => setUrl(e.target.value)}
            readOnly={!canWrite}
            placeholder="https://…"
          />
        </label>

        {confirming && event ? (
          <div className="o-alert" style={{ marginBottom: 12 }}>
            <span className="o-alert__dot" />
            <span style={{ font: "400 12px 'IBM Plex Sans', sans-serif" }}>
              Supprimer {event.name} ? L'événement disparaît du calendrier pour tout le monde.
            </span>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {event && canWrite && !confirming && (
            <button
              type="button"
              className="o-ghost o-ghost--danger"
              onClick={() => setConfirming(true)}
            >
              Supprimer
            </button>
          )}
          {confirming && (
            <button type="button" className="o-btn o-btn--danger" disabled={busy} onClick={remove}>
              Supprimer définitivement
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="o-btn o-btn--secondary"
            onClick={() => (confirming ? setConfirming(false) : onClose())}
          >
            {canWrite ? 'Annuler' : 'Fermer'}
          </button>
          {canWrite && !confirming && (
            <button
              type="submit"
              className="o-btn"
              style={{ opacity: ready ? 1 : 0.4 }}
              disabled={!ready}
            >
              Enregistrer
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
