import { Event } from '../types'
import { addDays, daysBetween, formatDay, parseDay } from './halfday'

/**
 * Catégories proposées à la saisie. La valeur stockée est la clé ; le backend
 * ne valide rien, si bien qu'une catégorie inconnue (import, version plus
 * récente) reste lisible plutôt que d'être effacée — voir `categoryLabel`.
 */
export const EVENT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'conference', label: 'Conférence' },
  { value: 'team', label: 'Équipe' },
  { value: 'social', label: 'Convivial' },
  { value: 'training', label: 'Formation' },
]

const LABELS = new Map(EVENT_CATEGORIES.map(c => [c.value, c.label]))

export const categoryLabel = (value?: string): string =>
  !value ? '' : (LABELS.get(value) ?? value)

/**
 * Variables CSS portant la teinte de la catégorie (jetons `--ev-*` d'offly.css).
 * Le composant les pose en style inline et les primitives `.o-ev-tag` /
 * `.o-ev-bar` les consomment : une seule règle CSS pour toutes les catégories,
 * et une catégorie inconnue retombe sur le gris du système plutôt que de
 * disparaître.
 */
export const categoryStyle = (value?: string): Record<string, string> => {
  const key = value && LABELS.has(value) ? value : 'none'
  return {
    '--ev': `var(--ev-${key})`,
    '--ev-soft': `var(--ev-${key}-soft)`,
    '--ev-ink': `var(--ev-${key}-ink)`,
  }
}

/** Les jours couverts par l'événement, bornes incluses. */
export const eventDays = (event: Event): string[] => {
  const days: string[] = []
  // Garde-fou : une borne de fin aberrante ne doit pas boucler sans fin.
  for (
    let day = event.startDate;
    day <= event.endDate && days.length < 366;
    day = addDays(day, 1)
  ) {
    days.push(day)
  }
  return days.length > 0 ? days : [event.startDate]
}

/**
 * Index jour → événements, pour le bandeau du calendrier. Un événement de
 * plusieurs jours figure sur chacun de ses jours : la grille lit une colonne à
 * la fois et n'a pas à retrouver l'événement qui l'enjambe.
 */
export const buildEventIndex = (events: Event[]): Map<string, Event[]> => {
  const index = new Map<string, Event[]>()
  for (const event of events) {
    for (const day of eventDays(event)) {
      const list = index.get(day)
      if (list) list.push(event)
      else index.set(day, [event])
    }
  }
  for (const list of index.values()) list.sort(byDate)
  return index
}

export const byDate = (a: Event, b: Event): number =>
  a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name)

/** Nombre de jours couverts, bornes incluses. */
export const eventLength = (event: Event): number => eventDays(event).length

/**
 * Position d'un jour dans un événement, pour le bandeau du calendrier. La
 * grille n'affiche que les jours ouvrés : « start » vaut donc pour le premier
 * jour *visible*, pas pour la date de début — sinon un événement commençant un
 * samedi, ou avant la période affichée, n'aurait jamais de filet de gauche.
 */
export const segmentAt = (
  event: Event,
  days: string[],
  index: number
): { start: boolean; end: boolean } => {
  const covers = (i: number) =>
    i >= 0 && i < days.length && days[i] >= event.startDate && days[i] <= event.endDate
  return { start: !covers(index - 1), end: !covers(index + 1) }
}

/**
 * Répartit les événements d'une période en lignes superposables, à la façon
 * d'un agenda : deux événements qui se chevauchent ne peuvent pas partager une
 * ligne, sinon l'un masquerait l'autre. Au-delà de `maxLanes`, les jours
 * concernés remontent un compte d'excédent plutôt que de faire grandir le
 * bandeau sans fin — la grille reste la surface de saisie (design.md §1.1).
 *
 * Les positions sont des *index de colonne* : la grille n'affiche que les jours
 * ouvrés, deux dates à cheval sur un week-end y sont donc voisines.
 */
export const layoutBand = (
  events: Event[],
  days: string[],
  maxLanes = 3
): { lanes: Event[][]; overflow: Map<string, number> } => {
  const span = (event: Event) => {
    let first = -1
    let last = -1
    for (let i = 0; i < days.length; i++) {
      if (days[i] >= event.startDate && days[i] <= event.endDate) {
        if (first < 0) first = i
        last = i
      }
    }
    return { first, last }
  }

  const placed = events
    .filter(e => span(e).first >= 0)
    .sort(byDate)
    .map(event => ({ event, ...span(event) }))

  const lanes: Event[][] = []
  const ends: number[] = [] // dernière colonne occupée, par ligne
  const overflow = new Map<string, number>()

  for (const item of placed) {
    let lane = ends.findIndex(end => end < item.first)
    if (lane < 0) {
      lane = ends.length
      ends.push(-1)
      lanes.push([])
    }
    if (lane < maxLanes) {
      lanes[lane].push(item.event)
      ends[lane] = item.last
    } else {
      // Ligne de trop : l'événement n'est pas affiché, mais chacun de ses jours
      // doit le dire — un événement tu est pire qu'un événement résumé.
      for (let i = item.first; i <= item.last; i++) {
        overflow.set(days[i], (overflow.get(days[i]) ?? 0) + 1)
      }
      ends[lane] = item.last
    }
  }

  return { lanes: lanes.slice(0, maxLanes), overflow }
}

/** Un événement est « à venir » tant que son dernier jour n'est pas passé. */
export const isUpcoming = (event: Event, today: string = formatDay(new Date())): boolean =>
  event.endDate >= today

/**
 * Où en est l'événement par rapport à aujourd'hui. C'est l'information que l'on
 * cherche d'abord dans une liste d'agenda — « c'est quand ? » avant « c'est
 * quoi ? » — et une date seule oblige à la calculer de tête.
 */
export const relativeTo = (
  event: Event,
  today: string = formatDay(new Date())
): { label: string; ongoing: boolean } | null => {
  if (event.endDate < today) return null
  if (event.startDate <= today) {
    // Un événement de plusieurs jours déjà commencé n'est pas « aujourd'hui ».
    return { label: event.startDate === event.endDate ? "Aujourd'hui" : 'En cours', ongoing: true }
  }
  const days = daysBetween(today, event.startDate) - 1
  if (days === 1) return { label: 'Demain', ongoing: false }
  if (days <= 7) return { label: `Dans ${days} jours`, ongoing: false }
  return null
}

/** « OCTOBRE 2026 » — l'en-tête de groupe de la liste. */
export const monthKey = (day: string): string => day.slice(0, 7)
export const monthLabel = (day: string): string =>
  parseDay(day).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

/** « 17 nov. 2026 », ou « 2 → 3 avr. 2026 » pour un événement de plusieurs jours. */
export const formatEventDates = (event: Event): string => {
  const day = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    parseDay(iso).toLocaleDateString('fr-FR', opts)
  const full: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }

  if (event.startDate === event.endDate) return day(event.startDate, full)
  // Même mois : on ne répète ni le mois ni l'année — « 2 → 3 avr. 2026 ».
  if (event.startDate.slice(0, 7) === event.endDate.slice(0, 7)) {
    return `${day(event.startDate, { day: 'numeric' })} → ${day(event.endDate, full)}`
  }
  return `${day(event.startDate, { day: 'numeric', month: 'short' })} → ${day(event.endDate, full)}`
}
