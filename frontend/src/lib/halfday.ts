import { Absence, Holiday, User } from '../types'

// Le design raisonne en portions de journée (design.md §4 : « une valeur am | pm |
// full ; pas d'heures »). Le backend, lui, stocke des bornes RFC3339 plus un libellé.
// Ce module est le pont entre les deux : il lit le modèle stocké vers `Part`, et
// réécrit une `Part` vers les bornes que l'API attend.
export type Part = 'am' | 'pm' | 'full'

export const PART_LABEL: Record<Part, string> = {
  full: 'Journée',
  am: 'Matin',
  pm: 'Après-midi',
}

// Ordre imposé par design.md : « Journée / Matin / Après-midi, dans cet ordre ».
export const PART_ORDER: Part[] = ['full', 'am', 'pm']

// Libellés persistés. On conserve l'encodage historique (emoji compris) pour rester
// compatible avec les absences déjà en base et avec absenceKind() côté Go ; l'UI
// n'affiche jamais ce texte brut — design.md n'autorise que les drapeaux en emoji.
const STORED_REASON: Record<Part, string> = {
  full: 'Time Off',
  am: '☀️ Time Off (Morning)',
  pm: '🌙 Time Off (Afternoon)',
}

export const formatDay = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const parseDay = (day: string): Date => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const isWeekend = (day: Date): boolean => {
  const w = day.getDay()
  return w === 0 || w === 6
}

/** `n` jours ouvrés à partir de `start` inclus, week-ends exclus (comme la maquette). */
export const workingDays = (start: Date, n: number): string[] => {
  const out: string[] = []
  const cursor = new Date(start)
  while (out.length < n) {
    if (!isWeekend(cursor)) out.push(formatDay(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export const shiftWorkingDays = (start: Date, n: number): Date => {
  const cursor = new Date(start)
  let remaining = Math.abs(n)
  const step = n >= 0 ? 1 : -1
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + step)
    if (!isWeekend(cursor)) remaining--
  }
  return cursor
}

/** Lundi de la semaine contenant `date`. */
export const startOfWeek = (date: Date): Date => {
  const out = new Date(date)
  const shift = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - shift)
  out.setHours(0, 0, 0, 0)
  return out
}

export const cellKey = (userId: string, day: string): string => `${userId}|${day}`

/**
 * Déduit la portion d'une absence stockée. Le libellé fait foi (c'est ce qu'écrit
 * l'UI et ce que lit le serveur MCP) ; les bornes horaires servent de repli pour
 * les absences créées autrement.
 */
export const partOf = (absence: Absence): Part => {
  if (absence.reason?.includes('Morning')) return 'am'
  if (absence.reason?.includes('Afternoon')) return 'pm'
  const start = new Date(absence.startDate)
  const end = new Date(absence.endDate)
  if (start.getUTCHours() >= 12) return 'pm'
  if (end.getUTCHours() < 12) return 'am'
  return 'full'
}

export interface Placed {
  part: Part
  absence: Absence
}

/**
 * Index `${userId}|${YYYY-MM-DD}` -> portion. Une absence multi-jours est dépliée
 * sur chacun de ses jours ; la première rencontrée gagne en cas de recouvrement.
 */
export const buildAbsenceIndex = (absences: Absence[]): Map<string, Placed> => {
  const index = new Map<string, Placed>()
  for (const absence of absences) {
    const part = partOf(absence)
    const start = new Date(absence.startDate)
    const end = new Date(absence.endDate)
    // Les bornes sont écrites en UTC ; on itère sur les jours calendaires UTC.
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
    const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
    while (cursor.getTime() <= last) {
      const day = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`
      const key = cellKey(absence.userId, day)
      if (!index.has(key)) index.set(key, { part, absence })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }
  return index
}

/** Index `${COUNTRY}|${YYYY-MM-DD}` -> jour férié. */
export const buildHolidayIndex = (holidays: Holiday[]): Map<string, Holiday> => {
  const index = new Map<string, Holiday>()
  for (const holiday of holidays) {
    if (!holiday.country || !holiday.date) continue
    const key = `${holiday.country.toUpperCase()}|${holiday.date}`
    if (!index.has(key)) index.set(key, holiday)
  }
  return index
}

export const holidayFor = (
  index: Map<string, Holiday>,
  user: Pick<User, 'country'>,
  day: string
): Holiday | null => {
  const country = user.country?.toUpperCase()
  if (!country) return null
  return index.get(`${country}|${day}`) ?? null
}

/** Cycle de la maquette : libre → journée → matin → après-midi → libre. */
export const nextPart = (current?: Part): Part | undefined => {
  if (current === undefined) return 'full'
  if (current === 'full') return 'am'
  if (current === 'am') return 'pm'
  return undefined
}

/** Bornes UTC à envoyer à l'API pour une portion donnée. */
export const boundsFor = (day: string, part: Part): { startIso: string; endIso: string; reason: string } => {
  const [y, m, d] = day.split('-').map(Number)
  const at = (h: number, min: number, s: number) => new Date(Date.UTC(y, m - 1, d, h, min, s)).toISOString()
  if (part === 'am') return { startIso: at(0, 0, 0), endIso: at(11, 59, 59), reason: STORED_REASON.am }
  if (part === 'pm') return { startIso: at(12, 0, 0), endIso: at(23, 59, 59), reason: STORED_REASON.pm }
  return { startIso: at(0, 0, 0), endIso: at(23, 59, 59), reason: STORED_REASON.full }
}

export interface Coverage {
  /** Effectif au planning ce jour-là (les personnes en férié en sortent). */
  active: number
  amPercent: number
  pmPercent: number
  /** design.md §4 : on affiche le minimum des deux demi-journées, jamais la moyenne. */
  minPercent: number
  belowThreshold: boolean
}

/**
 * Couverture d'un groupe pour un jour. Conformément à design.md, un férié retire la
 * personne du dénominateur au lieu de la compter absente.
 */
export const coverageFor = (
  members: User[],
  day: string,
  absences: Map<string, Placed>,
  holidays: Map<string, Holiday>,
  threshold: number
): Coverage | null => {
  const active = members.filter(m => !holidayFor(holidays, m, day))
  if (active.length === 0) return null

  let amPresent = 0
  let pmPresent = 0
  for (const member of active) {
    const part = absences.get(cellKey(member.id, day))?.part
    if (part !== 'full' && part !== 'am') amPresent++
    if (part !== 'full' && part !== 'pm') pmPresent++
  }

  const amPercent = Math.round((amPresent / active.length) * 100)
  const pmPercent = Math.round((pmPresent / active.length) * 100)
  const minPercent = Math.min(amPercent, pmPercent)
  return { active: active.length, amPercent, pmPercent, minPercent, belowThreshold: minPercent < threshold }
}

export const countryFlag = (code?: string): string => {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))
}

/**
 * Nom de pays en français. L'annuaire du repo (utils/holidayManager) est en anglais ;
 * design.md impose une UI francophone, d'où la localisation via Intl avec repli.
 */
const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' })
  } catch {
    return null
  }
})()

export const countryName = (code: string | undefined, fallback?: string): string => {
  if (!code) return fallback ?? ''
  const upper = code.toUpperCase()
  try {
    return regionNames?.of(upper) ?? fallback ?? upper
  } catch {
    return fallback ?? upper
  }
}

export const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** « 1 jour », « 1,5 jours » — à partir d'un nombre de demi-journées. */
export const formatDays = (halves: number): string => {
  const days = halves / 2
  const label = days % 1 ? days.toFixed(1).replace('.', ',') : String(days)
  return `${label} ${days > 1 ? 'jours' : 'jour'}`
}

export const longDate = (day: string): string =>
  parseDay(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export const shortDow = (day: string): string =>
  parseDay(day).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
