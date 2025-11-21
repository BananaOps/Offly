import axios from 'axios'
import { User, Department, Team, Absence } from './types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users')
  return response.data.users || []
}

export const createUser = async (name: string, email: string, country?: string): Promise<User> => {
  const response = await api.post('/users', { name, email, country })
  return response.data
}

export const assignUserToDepartment = async (userId: string, departmentId: string): Promise<User> => {
  const response = await api.post(`/users/${userId}/department`, { userId, departmentId })
  return response.data
}

export const assignUserToTeam = async (userId: string, teamId: string): Promise<User> => {
  const response = await api.post(`/users/${userId}/team`, { userId, teamId })
  return response.data
}

export const getDepartments = async (): Promise<Department[]> => {
  const response = await api.get('/departments')
  return response.data.departments || []
}

export const createDepartment = async (name: string): Promise<Department> => {
  const response = await api.post('/departments', { name })
  return response.data
}

export const getTeams = async (departmentId?: string): Promise<Team[]> => {
  const params = departmentId ? { departmentId } : {}
  const response = await api.get('/teams', { params })
  return response.data.teams || []
}

export const createTeam = async (name: string, departmentId: string): Promise<Team> => {
  const response = await api.post('/teams', { name, departmentId })
  return response.data
}

export const getAbsences = async (userId?: string, startDate?: string, endDate?: string): Promise<Absence[]> => {
  const params: any = {}
  if (userId) params.userId = userId
  if (startDate) {
    // Si la date contient déjà l'heure (format ISO complet), l'utiliser telle quelle
    // Sinon, convertir YYYY-MM-DD en RFC3339
    params.startDate = startDate.includes('T') ? startDate : `${startDate}T00:00:00Z`
  }
  if (endDate) {
    // Si la date contient déjà l'heure (format ISO complet), l'utiliser telle quelle
    // Sinon, convertir YYYY-MM-DD en RFC3339
    params.endDate = endDate.includes('T') ? endDate : `${endDate}T23:59:59Z`
  }
  
  const response = await api.get('/absences', { params })
  return response.data.absences || []
}

export const createAbsence = async (
  userId: string,
  startDate: string,
  endDate: string,
  reason: string
): Promise<Absence> => {
  const response = await api.post('/absences', {
    userId,
    startDate,
    endDate,
    reason,
  })
  return response.data
}

export const updateAbsence = async (
  id: string,
  startDate: string,
  endDate: string,
  reason: string,
  status: string
): Promise<Absence> => {
  const response = await api.put(`/absences/${id}`, {
    id,
    startDate,
    endDate,
    reason,
    status,
  })
  return response.data
}

export const deleteAbsence = async (id: string): Promise<void> => {
  await api.delete(`/absences/${id}`)
}

// User update and delete
export const updateUser = async (id: string, name: string, email: string, country?: string): Promise<User> => {
  const response = await api.put(`/users/${id}`, { id, name, email, country })
  return response.data
}

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`)
}

// Department update and delete
export const updateDepartment = async (id: string, name: string): Promise<Department> => {
  const response = await api.put(`/departments/${id}`, { id, name })
  return response.data
}

export const deleteDepartment = async (id: string): Promise<void> => {
  await api.delete(`/departments/${id}`)
}

// Team update and delete
export const updateTeam = async (id: string, name: string, departmentId: string): Promise<Team> => {
  const response = await api.put(`/teams/${id}`, { id, name, departmentId })
  return response.data
}

export const deleteTeam = async (id: string): Promise<void> => {
  await api.delete(`/teams/${id}`)
}
