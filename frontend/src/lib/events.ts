import { Event } from '../types'
import { addDays, formatDay, parseDay } from './halfday'

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

/** Un événement est « à venir » tant que son dernier jour n'est pas passé. */
export const isUpcoming = (event: Event, today: string = formatDay(new Date())): boolean =>
  event.endDate >= today

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
