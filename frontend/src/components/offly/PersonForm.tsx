import { useEffect, useMemo, useRef, useState } from 'react'
import { JOB_PROFILES, Team, User } from '../../types'
import { UserDraft } from '../../api'
import { countryFlag, countryOptions } from '../../lib/countries'
import { profileLabel } from '../../lib/profiles'

interface Props {
  /** Personne à modifier ; absente, le formulaire crée une fiche. */
  person?: User
  teams: Team[]
  /** La suppression est réservée aux administrateurs (règle RBAC du backend). */
  canDelete: boolean
  onSave: (draft: UserDraft) => Promise<void>
  onDelete: (person: User) => Promise<void>
  onClose: () => void
}

const PROFILE_OPTIONS = JOB_PROFILES.map(p => ({
  value: p.value,
  label: profileLabel(p.value),
})).sort((a, b) => a.label.localeCompare(b.label))

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
 * Fiche d'une personne : nom, e-mail, pays, équipe, profil.
 *
 * C'est le seul chemin d'administration de l'annuaire depuis l'interface ; la
 * grille reste la surface de saisie des absences (design.md §1.1), ce formulaire
 * n'est qu'un chemin secondaire.
 */
export default function PersonForm({ person, teams, canDelete, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(person?.name ?? '')
  const [email, setEmail] = useState(person?.email ?? '')
  const [country, setCountry] = useState(person?.country?.toUpperCase() ?? '')
  const [teamId, setTeamId] = useState(person?.teamId ?? '')
  const [jobProfile, setJobProfile] = useState<string>(person?.jobProfile ?? '')
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

  // Le code déjà porté par la fiche est injecté : s'il sort de la liste ISO
  // (import ancien), une modification ne doit pas l'effacer en silence.
  const countryList = useMemo(() => countryOptions([person?.country]), [person?.country])

  const teamOptions = useMemo(
    () => teams.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  )

  const ready = name.trim().length > 0 && !busy

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      await onSave({
        id: person?.id,
        name: name.trim(),
        email: email.trim(),
        country,
        teamId,
        jobProfile,
      })
      onClose()
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!person) return
    setBusy(true)
    setError(null)
    try {
      await onDelete(person)
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
        aria-label={person ? 'Modifier la personne' : 'Ajouter une personne'}
        onSubmit={submit}
      >
        <h2 className="o-card-title" style={{ marginBottom: 14 }}>
          {person ? person.name : 'Ajouter une personne'}
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
            placeholder="Camille Durand"
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
            E-mail
          </span>
          <input
            type="email"
            className="o-field"
            style={{ width: '100%' }}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="camille.durand@exemple.fr"
          />
        </label>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <label style={{ flex: 1, minWidth: 0, display: 'block' }}>
            <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
              Équipe
            </span>
            <select
              className="o-field"
              style={{ width: '100%' }}
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
            >
              <option value="">Sans équipe</option>
              {teamOptions.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 0, display: 'block' }}>
            <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
              Profil
            </span>
            <select
              className="o-field"
              style={{ width: '100%' }}
              value={jobProfile}
              onChange={e => setJobProfile(e.target.value)}
            >
              <option value="">Non renseigné</option>
              {PROFILE_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
            Pays
          </span>
          <select
            className="o-field"
            style={{ width: '100%' }}
            value={country}
            onChange={e => setCountry(e.target.value)}
          >
            <option value="">Aucun — pas de jours fériés appliqués</option>
            {countryList.map(c => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.name}
              </option>
            ))}
          </select>
        </label>

        {confirming && person ? (
          <div className="o-alert" style={{ marginBottom: 12 }}>
            <span className="o-alert__dot" />
            <span style={{ font: "400 12px 'IBM Plex Sans', sans-serif" }}>
              Supprimer {person.name} ? Ses absences sont supprimées avec la fiche.
            </span>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {person && canDelete && !confirming && (
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
