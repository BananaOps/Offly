/**
 * Sérialisation et lecture CSV, suffisantes pour les échanges RH d'Offly.
 * Conforme RFC 4180 sur l'essentiel : guillemets doublés, champs multilignes,
 * CRLF en sortie.
 */

/** Échappe un champ : guillemets si séparateur, guillemet, ou saut de ligne. */
const escapeField = (value: unknown): string => {
  const s = value == null ? '' : String(value)
  return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Construit le contenu d'un fichier CSV.
 * Le BOM UTF-8 est indispensable : sans lui Excel lit « Fête » comme « FÃªte ».
 */
export const toCsv = (header: string[], rows: (string | number)[][]): string =>
  '\ufeff' + [header, ...rows].map(r => r.map(escapeField).join(',')).join('\r\n') + '\r\n'

/** Déclenche le téléchargement d'un contenu texte. */
export const downloadText = (filename: string, content: string, mime = 'text/csv;charset=utf-8'): void => {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Découpe un CSV en cellules. Gère les guillemets, les guillemets doublés et les
 * champs contenant des sauts de ligne ; accepte `,` ou `;` comme séparateur.
 */
export const parseCsv = (text: string): string[][] => {
  const src = text.replace(/^\ufeff/, '')
  // Séparateur : on retient celui qui domine sur la première ligne hors guillemets.
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const outside = firstLine.replace(/"[^"]*"/g, '')
  const delimiter = (outside.match(/;/g)?.length ?? 0) > (outside.match(/,/g)?.length ?? 0) ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
      continue
    }
    if (c === '"') quoted = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Une ligne vide en fin de fichier n'est pas une donnée.
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

/**
 * Indexe une ligne d'en-tête : libellé normalisé -> position. Accepte plusieurs
 * alias par colonne pour rester tolérant aux fichiers produits ailleurs.
 */
export const headerIndex = (header: string[], aliases: Record<string, string[]>): Record<string, number> => {
  const normalize = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  const positions = new Map(header.map((h, i) => [normalize(h), i]))
  const out: Record<string, number> = {}
  for (const [key, names] of Object.entries(aliases)) {
    out[key] = -1
    for (const name of names) {
      const at = positions.get(normalize(name))
      if (at !== undefined) {
        out[key] = at
        break
      }
    }
  }
  return out
}
