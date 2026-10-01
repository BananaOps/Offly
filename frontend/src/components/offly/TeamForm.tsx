import { useEffect, useRef, useState } from 'react'
import { Team, User } from '../../types'
import { TeamDraft } from '../../api'

interface Props {
  /** Équipe à renommer ; absente, le formulaire en crée une. */
  team?: Team
  /** Membres actuels : la confirmation de suppression dit ce qu'ils deviennent. */
  members: User[]
  onSave: (draft: TeamDraft) => Promise<void>
  onDelete: (team: Team) => Promise<void>
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
 * Fiche d'une équipe : son nom, et rien d'autre — l'appartenance se règle dans
 * `PersonForm`, côté personne, parce que c'est la personne qui change d'équipe.
 *
 * Création, renommage et suppression sont réservés aux administrateurs : c'est
 * la règle du `rbacMiddleware`, qui n'ouvre `/teams` en écriture qu'à eux.
 */
export default function TeamForm({ team, members, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(team?.name ?? '')
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

  const ready = name.trim().length > 0 && !busy

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      await onSave({ id: team?.id, name: name.trim() })
      onClose()
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!team) return
    setBusy(true)
    setError(null)
    try {
      await onDelete(team)
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
        aria-label={team ? "Modifier l'équipe" : 'Créer une équipe'}
        onSubmit={submit}
      >
        <h2 className="o-card-title" style={{ marginBottom: 14 }}>
          {team ? team.name : 'Créer une équipe'}
        </h2>

        {error && (
          <div className="o-alert" style={{ marginBottom: 12 }} role="status">
            <span className="o-alert__dot" />
            <span style={{ font: "500 12px 'IBM Plex Sans', sans-serif" }}>{error}</span>
          </div>
        )}

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
            Nom
          </span>
          <input
            ref={firstField}
            className="o-field"
            style={{ width: '100%' }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Plateforme"
          />
        </label>

        {!team && (
          <p className="o-secondary" style={{ marginBottom: 14 }}>
            L'équipe est créée vide : les membres s'y rattachent depuis leur fiche, écran
            Personnes.
          </p>
        )}

        {confirming && team ? (
          <div className="o-alert" style={{ marginBottom: 12 }}>
            <span className="o-alert__dot" />
            <span style={{ font: "400 12px 'IBM Plex Sans', sans-serif" }}>
              Supprimer {team.name} ?{' '}
              {members.length === 0
                ? 'Elle ne compte aucun membre.'
                : members.length === 1
                  ? 'Son seul membre repasse en « Sans équipe » ; ses absences sont conservées.'
                  : `Ses ${members.length} membres repassent en « Sans équipe » ; leurs absences sont conservées.`}
            </span>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {team && !confirming && (
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
            Annuler
          </button>
          {!confirming && (
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
