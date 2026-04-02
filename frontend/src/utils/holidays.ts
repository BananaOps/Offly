// Public holidays by country (ISO 3166-1 alpha-2 codes)
// Format: YYYY-MM-DD

export interface Holiday {
  date: string
  name: string
  country: string
}

const holidays2025: Record<string, Holiday[]> = {
  FR: [
    { date: '2025-01-01', name: 'New Year\'s Day', country: 'FR' },
    { date: '2025-04-21', name: 'Easter Monday', country: 'FR' },
    { date: '2025-05-01', name: 'Labour Day', country: 'FR' },
    { date: '2025-05-08', name: 'Victory in Europe Day', country: 'FR' },
    { date: '2025-05-29', name: 'Ascension Day', country: 'FR' },
    { date: '2025-06-09', name: 'Whit Monday', country: 'FR' },
    { date: '2025-07-14', name: 'Bastille Day', country: 'FR' },
    { date: '2025-08-15', name: 'Assumption of Mary', country: 'FR' },
    { date: '2025-11-01', name: 'All Saints\' Day', country: 'FR' },
    { date: '2025-11-11', name: 'Armistice Day', country: 'FR' },
    { date: '2025-12-25', name: 'Christmas Day', country: 'FR' },
  ],
  US: [
    { date: '2025-01-01', name: 'New Year\'s Day', country: 'US' },
    { date: '2025-01-20', name: 'Martin Luther King Jr. Day', country: 'US' },
    { date: '2025-02-17', name: 'Presidents\' Day', country: 'US' },
    { date: '2025-05-26', name: 'Memorial Day', country: 'US' },
    { date: '2025-07-04', name: 'Independence Day', country: 'US' },
    { date: '2025-09-01', name: 'Labor Day', country: 'US' },
    { date: '2025-10-13', name: 'Columbus Day', country: 'US' },
    { date: '2025-11-11', name: 'Veterans Day', country: 'US' },
    { date: '2025-11-27', name: 'Thanksgiving', country: 'US' },
    { date: '2025-12-25', name: 'Christmas Day', country: 'US' },
  ],
  GB: [
    { date: '2025-01-01', name: 'New Year\'s Day', country: 'GB' },
    { date: '2025-04-18', name: 'Good Friday', country: 'GB' },
    { date: '2025-04-21', name: 'Easter Monday', country: 'GB' },
    { date: '2025-05-05', name: 'Early May Bank Holiday', country: 'GB' },
    { date: '2025-05-26', name: 'Spring Bank Holiday', country: 'GB' },
    { date: '2025-08-25', name: 'Summer Bank Holiday', country: 'GB' },
    { date: '2025-12-25', name: 'Christmas Day', country: 'GB' },
    { date: '2025-12-26', name: 'Boxing Day', country: 'GB' },
  ],
  DE: [
    { date: '2025-01-01', name: 'New Year\'s Day', country: 'DE' },
    { date: '2025-04-18', name: 'Good Friday', country: 'DE' },
    { date: '2025-04-21', name: 'Easter Monday', country: 'DE' },
    { date: '2025-05-01', name: 'Labour Day', country: 'DE' },
    { date: '2025-05-29', name: 'Ascension Day', country: 'DE' },
    { date: '2025-06-09', name: 'Whit Monday', country: 'DE' },
    { date: '2025-10-03', name: 'German Unity Day', country: 'DE' },
    { date: '2025-12-25', name: 'Christmas Day', country: 'DE' },
    { date: '2025-12-26', name: 'Boxing Day', country: 'DE' },
  ],
}

export const getHolidaysForCountry = (countryCode: string): Holiday[] => {
  return holidays2025[countryCode.toUpperCase()] || []
}

export const isHoliday = (date: Date, countryCode: string): Holiday | null => {
  const dateStr = date.toISOString().split('T')[0]
  const countryHolidays = getHolidaysForCountry(countryCode)
  return countryHolidays.find(h => h.date === dateStr) || null
}

export const countries = [
  { code: 'FR', name: 'France' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
]
