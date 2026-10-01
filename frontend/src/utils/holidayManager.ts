import { Holiday } from '../types'
import * as holidayApi from '../api/holidays'

// Les pays vivent dans lib/countries (liste ISO complète, noms localisés) ;
// ré-exportés ici pour les appelants historiques.
export { countries } from '../lib/countries'

// Charger les jours fériés depuis l'API
export const loadHolidays = async (country?: string, year?: number): Promise<Holiday[]> => {
  try {
    return await holidayApi.getHolidays(country, year)
  } catch (error) {
    console.error('Error loading holidays:', error)
    return []
  }
}

// Cache des jours fériés par pays/année.
// On mémorise la promesse et non le résultat afin que des appels concurrents
// (un pays partagé par plusieurs utilisateurs) ne déclenchent qu'une seule requête.
const holidayCache = new Map<string, Promise<Holiday[]>>()

// Vider le cache après toute mutation des jours fériés
export const invalidateHolidayCache = (): void => {
  holidayCache.clear()
}

// Ajouter un jour férié
export const addHoliday = async (holiday: Omit<Holiday, 'id'>): Promise<Holiday> => {
  const created = await holidayApi.createHoliday(holiday)
  invalidateHolidayCache()
  return created
}

// Mettre à jour un jour férié
export const updateHoliday = async (id: string, updates: Partial<Holiday>): Promise<void> => {
  await holidayApi.updateHoliday(id, updates)
  invalidateHolidayCache()
}

// Supprimer un jour férié
export const deleteHoliday = async (id: string): Promise<void> => {
  await holidayApi.deleteHoliday(id)
  invalidateHolidayCache()
}

// Obtenir les jours fériés pour un pays et une année
export const getHolidaysForCountryAndYear = async (countryCode: string, year: number): Promise<Holiday[]> => {
  const key = `${countryCode.toUpperCase()}-${year}`
  const cached = holidayCache.get(key)
  if (cached) return cached

  const pending = holidayApi.getHolidays(countryCode.toUpperCase(), year).catch(error => {
    // Ne pas mettre un échec en cache : le prochain appel doit pouvoir réessayer
    holidayCache.delete(key)
    console.error('Error loading holidays:', error)
    return [] as Holiday[]
  })
  holidayCache.set(key, pending)
  return pending
}

// Vérifier si une date est un jour férié pour un pays
export const isHoliday = async (date: Date, countryCode: string): Promise<Holiday | null> => {
  const dateStr = date.toISOString().split('T')[0]
  const year = date.getFullYear()
  const holidays = await getHolidaysForCountryAndYear(countryCode, year)
  return holidays.find(h => h.date === dateStr) || null
}

// Importer des jours fériés en masse
export const importHolidays = async (holidays: Omit<Holiday, 'id'>[]): Promise<number> => {
  const imported = await holidayApi.importHolidays(holidays)
  invalidateHolidayCache()
  return imported
}

// Exporter les jours fériés
export const exportHolidays = async (): Promise<Holiday[]> => {
  return await loadHolidays()
}
