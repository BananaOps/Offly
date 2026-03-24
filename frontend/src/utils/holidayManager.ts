import { Holiday } from '../types'
import * as holidayApi from '../api/holidays'

// Liste des pays supportés
export const countries = [
  // Europe
  { code: 'AL', name: 'Albania' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AT', name: 'Austria' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'SM', name: 'San Marino' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'VA', name: 'Vatican City' },
  // Rest of the world
  { code: 'AU', name: 'Australia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MX', name: 'Mexico' },
  { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
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
