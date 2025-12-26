import { Holiday } from '../types'
import * as holidayApi from '../api/holidays'

// Liste des pays supportés
export const countries = [
  { code: 'FR', name: 'France' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'MA', name: 'Morocco' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'MX', name: 'Mexico' },
]

// Charger les jours fériés depuis l'API
export const loadHolidays = async (country?: string, year?: number): Promise<Holiday[]> => {
  try {
    return await holidayApi.getHolidays(country, year)
  } catch (error) {
    console.error('Error loading holidays:', error)
    return []
  }
}

// Ajouter un jour férié
export const addHoliday = async (holiday: Omit<Holiday, 'id'>): Promise<Holiday> => {
  return await holidayApi.createHoliday(holiday)
}

// Mettre à jour un jour férié
export const updateHoliday = async (id: string, updates: Partial<Holiday>): Promise<void> => {
  await holidayApi.updateHoliday(id, updates)
}

// Supprimer un jour férié
export const deleteHoliday = async (id: string): Promise<void> => {
  await holidayApi.deleteHoliday(id)
}

// Obtenir les jours fériés pour un pays et une année
export const getHolidaysForCountryAndYear = async (countryCode: string, year: number): Promise<Holiday[]> => {
  try {
    return await holidayApi.getHolidays(countryCode, year)
  } catch (error) {
    console.error('Error loading holidays:', error)
    return []
  }
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
  return await holidayApi.importHolidays(holidays)
}

// Exporter les jours fériés
export const exportHolidays = async (): Promise<Holiday[]> => {
  return await loadHolidays()
}
