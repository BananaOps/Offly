import { addDays, formatDay, startOfWeek } from './halfday'

/** Plage affichée par la grille, bornes incluses, au format `YYYY-MM-DD`. */
export interface Range {
  from: string
  to: string
}

/**
 * Plafond de colonnes. La grille est un tableau de cases cliquables : au-delà,
 * la lecture d'une ligne devient impossible et le nombre de nœuds explose. Une
 * plage plus large est tronquée, et l'écran le dit plutôt que de le taire.
 */
export const MAX_COLUMNS = 70

const firstOfMonth = (year: number, month: number): string => formatDay(new Date(year, month, 1))
const lastOfMonth = (year: number, month: number): string => formatDay(new Date(year, month + 1, 0))

/** Lundi de la semaine courante → vendredi de la semaine suivante : la vue par défaut. */
export const defaultRange = (today: Date = new Date()): Range => {
  const monday = formatDay(startOfWeek(today))
  return { from: monday, to: addDays(monday, 11) }
}

export interface Preset {
  id: string
  label: string
  range: Range
}

const MONTH_LABEL = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/**
 * Raccourcis du sélecteur, calculés à la date du jour. Les douze mois à venir
 * sont listés un par un : c'est ce qui rend l'année suivante atteignable en une
 * frappe dans la recherche, sans avoir à saisir deux dates à la main.
 */
export const presetsFor = (today: Date = new Date()): Preset[] => {
  const monday = formatDay(startOfWeek(today))
  const todayStr = formatDay(today)
  const year = today.getFullYear()
  const month = today.getMonth()
  const quarter = Math.floor(month / 3)

  const fixed: Preset[] = [
    { id: 'week', label: 'Cette semaine', range: { from: monday, to: addDays(monday, 4) } },
    { id: 'two-weeks', label: 'Les deux prochaines semaines', range: defaultRange(today) },
    { id: 'next-30', label: 'Les 30 prochains jours', range: { from: todayStr, to: addDays(todayStr, 29) } },
    { id: 'month', label: 'Ce mois-ci', range: { from: firstOfMonth(year, month), to: lastOfMonth(year, month) } },
    {
      id: 'next-quarter',
      label: 'Trimestre prochain',
      range: { from: firstOfMonth(year, quarter * 3 + 3), to: lastOfMonth(year, quarter * 3 + 5) },
    },
  ]

  const months: Preset[] = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, month + i, 1)
    const label = MONTH_LABEL.format(date)
    return {
      id: `m${date.getFullYear()}-${date.getMonth()}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      range: { from: firstOfMonth(date.getFullYear(), date.getMonth()), to: lastOfMonth(date.getFullYear(), date.getMonth()) },
    }
  })

  return [...fixed, ...months]
}

/** Comparaison insensible à la casse et aux accents, pour la recherche. */
const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const matchPreset = (preset: Preset, query: string): boolean =>
  !query.trim() || fold(preset.label).includes(fold(query.trim()))
