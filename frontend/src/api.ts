import axios from 'axios'
import { User, Team, Absence } from './types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
})

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users')
  const raw = response.data.users || []
  return raw.map((u: any) => ({
    ...u,
    teamId: u.teamId ?? u.team_id,
    jobProfile: u.jobProfile ?? u.job_profile,
  }))
}

export const createUser = async (name: string, email: string, country?: string): Promise<User> => {
  const response = await api.post('/users', { name, email, country })
  return response.data
}

export const assignUserToTeam = async (userId: string, teamId: string): Promise<User> => {
  const response = await api.post(`/users/${userId}/team`, { userId, teamId })
  return response.data
}

export const getTeams = async (): Promise<Team[]> => {
  const response = await api.get('/teams')
  return response.data.teams || []
}

export const createTeam = async (name: string): Promise<Team> => {
  const response = await api.post('/teams', { name })
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
  reason: string,
  teamName?: string
): Promise<Absence> => {
  const response = await api.post('/absences', {
    userId,
    startDate,
    endDate,
    reason,
    team_name: teamName,
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
export const updateUser = async (id: string, name: string, email: string, country?: string, jobProfile?: string): Promise<User> => {
  const response = await api.put(`/users/${id}`, { id, name, email, country, title: jobProfile })
  return response.data
}

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`)
}

// Team update and delete
export const updateTeam = async (id: string, name: string): Promise<Team> => {
  const response = await api.put(`/teams/${id}`, { id, name })
  return response.data
}

export const deleteTeam = async (id: string): Promise<void> => {
  await api.delete(`/teams/${id}`)
}
