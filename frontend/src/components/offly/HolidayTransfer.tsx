import { useRef, useState } from 'react'
import { Holiday } from '../../types'
import { downloadText, headerIndex, parseCsv, toCsv } from '../../lib/csv'
import { importHolidays } from '../../utils/holidayManager'

const HEADER = ['Date', 'Nom', 'Pays', 'Année']

/** Alias tolérés à la lecture : fichiers produits par Offly, ou ailleurs. */
const ALIASES = {
  date: ['date'],
  name: ['nom', 'name', 'libelle', 'libellé'],
  country: ['pays', 'country', 'code'],
  year: ['annee', 'année', 'year'],
}

interface Row {
  date: string
  name: string
  country: string
  year: number
  error?: string
}

interface Props {
  holidays: Holiday[]
  year: number
  onImported: () => void
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Valide une ligne et normalise le pays en ISO majuscule. */
const check = (date: string, name: string, country: string, yearRaw: string): Row => {
  const code = country.trim().toUpperCase()
  const year = Number(yearRaw) || Number(date.slice(0, 4)) || 0
  let error: string | undefined
  if (!ISO_DATE.test(date.trim())) error = 'Date attendue au format AAAA-MM-JJ'
  else if (!name.trim()) error = 'Nom manquant'
  else if (!/^[A-Z]{2}$/.test(code)) error = 'Code pays ISO à 2 lettres attendu'
  else if (!year) error = 'Année illisible'
  return { date: date.trim(), name: name.trim(), country: code, year, error }
}

/**
 * Import et export des jours fériés.
 * Le CSV est le format courant ; le JSON reste accepté en lecture parce que
 * l'ancienne interface n'exportait que cela.
 */
export default function HolidayTransfer({ holidays, year, onImported }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const valid = rows?.filter(r => !r.error) ?? []
  const invalid = rows?.filter(r => r.error) ?? []

  const read = async (file: File) => {
    setResult(null)
    const text = await file.text()
    try {
      let parsed: Row[]
      if (file.name.toLowerCase().endsWith('.json') || text.trimStart().startsWith('[')) {
        const data = JSON.parse(text)
        if (!Array.isArray(data)) throw new Error('tableau JSON attendu')
        parsed = data.map((it: Record<string, unknown>) =>
          check(String(it.date ?? ''), String(it.name ?? ''), String(it.country ?? ''), String(it.year ?? ''))
        )
      } else {
        const cells = parseCsv(text)
        if (cells.length === 0) throw new Error('fichier vide')
        const idx = headerIndex(cells[0], ALIASES)
        if (idx.date < 0 || idx.name < 0 || idx.country < 0) {
          throw new Error('colonnes Date, Nom et Pays requises')
        }
        parsed = cells.slice(1).map(c =>
          check(c[idx.date] ?? '', c[idx.name] ?? '', c[idx.country] ?? '', idx.year >= 0 ? (c[idx.year] ?? '') : '')
        )
      }
      setRows(parsed)
    } catch (e) {
      setRows(null)
      setResult(`Fichier illisible : ${e instanceof Error ? e.message : 'format inconnu'}`)
    }
  }

  const run = async () => {
    if (valid.length === 0) return
    setBusy(true)
    try {
      const count = await importHolidays(
        valid.map(r => ({ date: r.date, name: r.name, country: r.country, year: r.year }))
      )
      setResult(`${count || valid.length} jour(s) férié(s) importé(s).`)
      setRows(null)
      onImported()
    } catch {
      setResult("L'import a échoué.")
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    const sorted = [...holidays].sort(
      (a, b) => (a.country ?? '').localeCompare(b.country ?? '') || a.date.localeCompare(b.date)
    )
    downloadText(
      `jours-feries-${year}.csv`,
      toCsv(HEADER, sorted.map(h => [h.date, h.name, h.country, h.year]))
    )
  }

  return (
    <div className="o-card o-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="o-card-title">Import / export</span>
        <span className="o-mono-sm">CSV · JSON accepté en lecture</span>
        <button
          type="button"
          className="o-btn o-btn--secondary"
          style={{ marginLeft: 'auto' }}
          onClick={exportCsv}
          disabled={holidays.length === 0}
        >
          Exporter
        </button>
      </div>

      {!rows && (
        <label
          className="o-drop"
          data-over={over || undefined}
          onDragOver={e => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={e => {
            e.preventDefault()
            setOver(false)
            const file = e.dataTransfer.files?.[0]
            if (file) read(file)
          }}
        >
          <span className="o-body">Déposer un fichier, ou cliquer pour choisir</span>
          <span className="o-mono-sm">Colonnes : Date · Nom · Pays · Année</span>
          <input
            ref={input}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) read(file)
              e.target.value = ''
            }}
          />
        </label>
      )}

      {rows && (
        <>
          <div className="o-summary">
            <div className="o-summary__line">
              <span className="o-secondary">Lignes lues</span>
              <span className="o-mono">{rows.length}</span>
            </div>
            <div className="o-summary__line">
              <span className="o-secondary">Prêtes à importer</span>
              <span className="o-mono">{valid.length}</span>
            </div>
            {invalid.length > 0 && (
              <div className="o-summary__line">
                <span className="o-secondary">Rejetées</span>
                <span className="o-mono" style={{ color: 'var(--alert-ink)' }}>
                  {invalid.length}
                </span>
              </div>
            )}
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {rows.slice(0, 200).map((r, i) => (
              <div
                key={`${r.date}-${r.country}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(20,20,30,.05)',
                }}
              >
                <span className="o-mono-sm" style={{ width: 92, flex: 'none' }}>
                  {r.date || '—'}
                </span>
                <span className="o-truncate" style={{ flex: 1, font: "400 12px 'IBM Plex Sans', sans-serif" }}>
                  {r.name || '—'}
                </span>
                <span className="o-mono-sm" style={{ width: 28, flex: 'none' }}>
                  {r.country || '—'}
                </span>
                <span className={r.error ? 'o-pill' : 'o-pill o-pill--off'} style={
                  r.error ? { background: 'var(--alert-soft)', color: 'var(--alert-ink)' } : undefined
                }>
                  {r.error ?? 'Prêt'}
                </span>
              </div>
            ))}
            {rows.length > 200 && (
              <p className="o-mono-sm" style={{ paddingTop: 8 }}>
                {rows.length - 200} ligne(s) supplémentaire(s) non affichée(s) — toutes seront importées.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="o-btn"
              style={{ flex: 1, opacity: valid.length && !busy ? 1 : 0.4 }}
              disabled={valid.length === 0 || busy}
              onClick={run}
            >
              {busy ? 'Import en cours…' : `Importer ${valid.length} jour(s) férié(s)`}
            </button>
            <button type="button" className="o-btn o-btn--secondary" onClick={() => setRows(null)} disabled={busy}>
              Annuler
            </button>
          </div>
        </>
      )}

      {result && (
        <p className="o-secondary" role="status" style={{ margin: 0 }}>
          {result}
        </p>
      )}
    </div>
  )
}
