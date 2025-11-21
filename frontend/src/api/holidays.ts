import axios from 'axios'
import { Holiday } from '../types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getHolidays = async (country?: string, year?: number): Promise<Holiday[]> => {
  const params: any = {}
  if (country) params.country = country
  if (year) params.year = year
  
  const response = await api.get('/holidays', { params })
  return response.data.holidays || []
}

export const createHoliday = async (holiday: Omit<Holiday, 'id'>): Promise<Holiday> => {
  const response = await api.post('/holidays', holiday)
  return response.data
}

export const updateHoliday = async (id: string, holiday: Partial<Holiday>): Promise<Holiday> => {
  const response = await api.put(`/holidays/${id}`, { id, ...holiday })
  return response.data
}

export const deleteHoliday = async (id: string): Promise<void> => {
  await api.delete(`/holidays/${id}`)
}

export const importHolidays = async (holidays: Omit<Holiday, 'id'>[]): Promise<number> => {
  const response = await api.post('/holidays/import', { holidays })
  return response.data.imported_count || 0
}
