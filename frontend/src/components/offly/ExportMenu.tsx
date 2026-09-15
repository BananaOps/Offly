import { useEffect, useRef, useState } from 'react'
import { Absence, Team, User } from '../../types'
import { PART_LABEL, longDate, partOf } from '../../lib/halfday'
import { getAbsences } from '../../api'
import { downloadText, toCsv } from '../../lib/csv'
import { profileLabel } from '../../lib/profiles'

type Scope = 'all' | 'team' | 'person'

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'team', label: 'Équipe' },
  { id: 'person', label: 'Personne' },
]

const HEADER = ['Nom', 'Email', 'Équipe', 'Pays', 'Profil', 'Début', 'Fin', 'Portion']

interface Props {
  /** Bornes de la période affichée dans la grille, proposées par défaut. */
  windowFrom: string
  windowTo: string
  users: User[]
  teams: Team[]
}

const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()

/**
 * Export CSV des absences sur une plage de dates libre.
 * Les absences sont relues pour la plage demandée plutôt que prises dans l'index
 * de la grille : celui-ci ne couvre que l'année affichée, une plage à cheval
 * produirait sinon un fichier incomplet sans le dire.
 */
export default function ExportMenu({ windowFrom, windowTo, users, teams }: Props) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<Scope>('all')
  const [teamId, setTeamId] = useState('')
  const [userId, setUserId] = useState('')
  // Tant que l'utilisateur n'a pas touché aux dates, la plage suit la période
  // affichée dans la grille. On dérive plutôt que de synchroniser dans un effet.
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null)
  // Le résultat porte la plage qui l'a produit : on en déduit sa fraîcheur sans
  // avoir à le remettre à zéro depuis l'effet.
  const [result, setResult] = useState<{ key: string; list: Absence[]; failed: boolean }>({
    key: '',
    list: [],
    failed: false,
  })
  const root = useRef<HTMLDivElement>(null)

  const from = custom?.from ?? windowFrom
  const to = custom?.to ?? windowTo
  const setFrom = (v: string) => setCustom({ from: v, to })
  const setTo = (v: string) => setCustom({ from, to: v })
  const rangeValid = !!from && !!to && from <= to
  const rangeKey = `${from}|${to}`

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  // Relecture à chaque changement de plage, pour que le compteur affiché soit
  // bien celui du fichier qui sera produit.
  useEffect(() => {
    if (!open || !rangeValid) return
    let cancelled = false
    getAbsences(undefined, from, to)
      .then(list => {
        if (!cancelled) setResult({ key: rangeKey, list, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: rangeKey, list: [], failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [open, from, to, rangeValid, rangeKey])

  const fresh = result.key === rangeKey
  const failed = fresh && result.failed
  const loading = rangeValid && !fresh
  const absences = fresh && !result.failed ? result.list : []

  const teamNames = new Map(teams.map(t => [t.id, t.name]))
  const byId = new Map(users.map(u => [u.id, u]))

  const inScope = (user: User | undefined): boolean => {
    if (!user) return false
    if (scope === 'all') return true
    return scope === 'team' ? user.teamId === teamId : user.id === userId
  }

  const rows = absences
    .filter(a => inScope(byId.get(a.userId)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map(a => {
      const user = byId.get(a.userId)!
      return [
        user.name,
        user.email ?? '',
        user.teamId ? (teamNames.get(user.teamId) ?? '') : '',
        user.country ?? '',
        profileLabel(user.jobProfile),
        a.startDate.slice(0, 10),
        a.endDate.slice(0, 10),
        PART_LABEL[partOf(a)],
      ]
    })

  const scopeLabel =
    scope === 'team'
      ? (teamNames.get(teamId) ?? 'equipe')
      : scope === 'person'
        ? (users.find(u => u.id === userId)?.name ?? 'personne')
        : 'tout'

  const scopeChosen = scope === 'all' || (scope === 'team' ? !!teamId : !!userId)
  const ready = rangeValid && scopeChosen && !loading && !failed && rows.length > 0

  const run = () => {
    downloadText(`absences-${from}_${to}-${slugify(scopeLabel)}.csv`, toCsv(HEADER, rows))
    setOpen(false)
  }

  const onWindow = custom === null

  return (
    <div ref={root} style={{ position: 'relative' }}>
      <button
        type="button"
        className="o-btn o-btn--secondary"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(v => !v)}
      >
        Exporter
      </button>

      {open && (
        <div className="o-popover" role="dialog" aria-label="Exporter les absences">
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <label style={{ flex: 1, display: 'block' }}>
              <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
                Du
              </span>
              <input
                type="date"
                className="o-field"
                style={{ width: '100%' }}
                value={from}
                max={to || undefined}
                onChange={e => setFrom(e.target.value)}
              />
            </label>
            <label style={{ flex: 1, display: 'block' }}>
              <span className="o-label" style={{ display: 'block', marginBottom: 5 }}>
                Au
              </span>
              <input
                type="date"
                className="o-field"
                style={{ width: '100%' }}
                value={to}
                min={from || undefined}
                onChange={e => setTo(e.target.value)}
              />
            </label>
          </div>

          {!onWindow && (
            <button
              type="button"
              className="o-ghost"
              style={{ marginBottom: 12, paddingLeft: 0 }}
              onClick={() => setCustom(null)}
            >
              Revenir à la période affichée
            </button>
          )}

          <div className="o-label" style={{ marginBottom: 6 }}>
            Périmètre
          </div>
          <div className="o-segmented" style={{ marginBottom: 12 }}>
            {SCOPES.map(s => (
              <button
                key={s.id}
                type="button"
                className="o-segmented__item"
                aria-pressed={scope === s.id}
                onClick={() => setScope(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {scope === 'team' && (
            <select
              className="o-field"
              style={{ width: '100%', marginBottom: 12 }}
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              aria-label="Équipe à exporter"
            >
              <option value="">Choisir une équipe</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {scope === 'person' && (
            <select
              className="o-field"
              style={{ width: '100%', marginBottom: 12 }}
              value={userId}
              onChange={e => setUserId(e.target.value)}
              aria-label="Personne à exporter"
            >
              <option value="">Choisir une personne</option>
              {[...users]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          )}

          <div className="o-summary">
            <div className="o-summary__line">
              <span className="o-secondary">Période</span>
              <span className="o-mono" style={{ textAlign: 'right' }}>
                {rangeValid ? `${longDate(from)} → ${longDate(to)}` : '—'}
              </span>
            </div>
            <div className="o-summary__line">
              <span className="o-secondary">Absences</span>
              <span
                className="o-mono"
                style={{ color: failed || !rangeValid ? 'var(--alert-ink)' : undefined }}
              >
                {!rangeValid
                  ? 'Plage invalide'
                  : failed
                    ? 'Lecture impossible'
                    : loading
                      ? '…'
                      : rows.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="o-btn"
            style={{ width: '100%', marginTop: 12, opacity: ready ? 1 : 0.4 }}
            disabled={!ready}
            onClick={run}
          >
            Exporter le CSV
          </button>
        </div>
      )}
    </div>
  )
}
