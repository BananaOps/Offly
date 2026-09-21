import { useEffect, useMemo, useRef, useState } from 'react'
import { mediumDate } from '../../lib/halfday'
import { Preset, Range, matchPreset, presetsFor } from '../../lib/ranges'

interface Props {
  from: string
  to: string
  onChange: (range: Range) => void
}

/**
 * Sélecteur de plage du calendrier, sur le modèle éprouvé des consoles de
 * supervision : un déclencheur qui affiche la plage courante, un panneau à deux
 * colonnes — saisie absolue à gauche, raccourcis cherchables à droite.
 *
 * Les raccourcis sont le chemin normal ; la saisie absolue n'existe que pour la
 * plage que personne n'avait prévue. C'est l'inverse d'un champ date nu, qui
 * n'offre que le cas rare.
 */
export default function RangePicker({ from, to, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Brouillon de la saisie absolue : tant qu'on n'a pas cliqué « Appliquer », la
  // grille ne bouge pas. Une plage se compose de deux dates, l'appliquer à chaque
  // frappe ferait recharger l'année sur un état intermédiaire incohérent.
  const [draft, setDraft] = useState<Range>({ from, to })
  const root = useRef<HTMLDivElement>(null)

  const presets = useMemo(() => presetsFor(), [])
  const visible = presets.filter(p => matchPreset(p, query))
  const draftValid = !!draft.from && !!draft.to && draft.from <= draft.to
  const activeId = presets.find(p => p.range.from === from && p.range.to === to)?.id

  // À l'ouverture, le brouillon repart de la plage réellement affichée. C'est un
  // geste de l'utilisateur, pas une synchronisation : pas d'effet ici.
  const toggle = () => {
    if (!open) {
      setDraft({ from, to })
      setQuery('')
    }
    setOpen(v => !v)
  }

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

  const pick = (preset: Preset) => {
    onChange(preset.range)
    setOpen(false)
  }

  const apply = () => {
    if (!draftValid) return
    onChange(draft)
    setOpen(false)
  }

  return (
    <div ref={root} style={{ position: 'relative' }}>
      <button
        type="button"
        className="o-range"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
        title="Changer la période affichée"
      >
        <CalendarGlyph />
        <span className="o-range__value">
          {mediumDate(from)} → {mediumDate(to)}
        </span>
        <span className="o-range__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="o-popover o-popover--range" role="dialog" aria-label="Période affichée">
          <div className="o-range__cols">
            <div>
              <div className="o-label" style={{ marginBottom: 8 }}>
                Plage absolue
              </div>
              <label style={{ display: 'block', marginBottom: 10 }}>
                <span className="o-secondary" style={{ display: 'block', marginBottom: 4 }}>
                  Du
                </span>
                <input
                  type="date"
                  className="o-field"
                  style={{ width: '100%' }}
                  value={draft.from}
                  onChange={e => setDraft(d => ({ ...d, from: e.target.value }))}
                />
              </label>
              <label style={{ display: 'block', marginBottom: 10 }}>
                <span className="o-secondary" style={{ display: 'block', marginBottom: 4 }}>
                  Au
                </span>
                <input
                  type="date"
                  className="o-field"
                  style={{ width: '100%' }}
                  value={draft.to}
                  min={draft.from || undefined}
                  onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}
                />
              </label>
              {!draftValid && (
                <div className="o-secondary" style={{ color: 'var(--alert-ink)', marginBottom: 8 }}>
                  Plage invalide
                </div>
              )}
              <button
                type="button"
                className="o-btn"
                style={{ width: '100%', opacity: draftValid ? 1 : 0.4 }}
                disabled={!draftValid}
                onClick={apply}
              >
                Appliquer
              </button>
            </div>

            <div className="o-range__quick">
              <div className="o-label" style={{ marginBottom: 8 }}>
                Plages rapides
              </div>
              <input
                autoFocus
                type="search"
                className="o-field"
                style={{ width: '100%', marginBottom: 8 }}
                placeholder="Rechercher une période"
                aria-label="Rechercher une période"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <div className="o-range__list">
                {visible.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className="o-range__item"
                    aria-pressed={preset.id === activeId}
                    onClick={() => pick(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
                {visible.length === 0 && (
                  <div className="o-secondary" style={{ padding: '6px 9px' }}>
                    Aucune période ne correspond.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** design.md interdit l'emoji dans l'UI hors drapeaux : l'icône est un tracé. */
function CalendarGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
      <rect x="2" y="3.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7h12M5.5 1.8v3M10.5 1.8v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
