import axios from 'axios'
import { User, Team, Absence } from './types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
})

/**
 * La passerelle gRPC émet du camelCase, mais certains chemins renvoient encore du
 * snake_case : on normalise ici plutôt que dans chaque écran.
 */
const normalizeUser = (u: any): User => ({
  ...u,
  teamId: u.teamId ?? u.team_id ?? '',
  jobProfile: u.jobProfile ?? u.job_profile,
})

export const getUsers = async (): Promise<User[]> => {
  const raw = (await api.get('/users')).data.users || []
  return raw.map(normalizeUser)
}

/** Champs modifiables d'une personne ; `id` absent = création. */
export interface UserDraft {
  id?: string
  name: string
  email: string
  country?: string
  teamId?: string
  jobProfile?: string
}

export const createUser = async (draft: UserDraft): Promise<User> => {
  const response = await api.post('/users', {
    name: draft.name,
    email: draft.email,
    country: draft.country ?? '',
    teamId: draft.teamId ?? '',
    jobProfile: draft.jobProfile ?? '',
  })
  return normalizeUser(response.data.user ?? response.data)
}

export const assignUserToTeam = async (userId: string, teamId: string): Promise<User> => {
  const response = await api.post(`/users/${userId}/team`, { userId, teamId })
  return normalizeUser(response.data.user ?? response.data)
}

export const getTeams = async (): Promise<Team[]> => {
  const response = await api.get('/teams')
  const teams = response.data.teams || []
  return teams.slice().sort((a: Team, b: Team) => a.name.localeCompare(b.name))
}

/** Champs modifiables d'une équipe ; `id` absent = création. */
export interface TeamDraft {
  id?: string
  name: string
}

// La passerelle enveloppe la réponse dans `{ team: ... }` ; le repli couvre les
// chemins qui renvoient l'objet nu.
const unwrapTeam = (data: { team?: Team } | Team): Team =>
  'team' in data && data.team ? data.team : (data as Team)

export const createTeam = async (name: string): Promise<Team> => {
  const response = await api.post('/teams', { name })
  return unwrapTeam(response.data)
}

export const getAbsences = async (
  userId?: string,
  startDate?: string,
  endDate?: string
): Promise<Absence[]> => {
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
export const updateUser = async (draft: UserDraft & { id: string }): Promise<User> => {
  // `jobProfile` est le champ retenu par le service ; `title` reste envoyé pour les
  // déploiements dont le backend est antérieur au champ explicite.
  const response = await api.put(`/users/${draft.id}`, {
    id: draft.id,
    name: draft.name,
    email: draft.email,
    country: draft.country ?? '',
    jobProfile: draft.jobProfile ?? '',
    title: draft.jobProfile ?? '',
  })
  return normalizeUser(response.data.user ?? response.data)
}

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`)
}

// Team update and delete
export const updateTeam = async (id: string, name: string): Promise<Team> => {
  const response = await api.put(`/teams/${id}`, { id, name })
  return unwrapTeam(response.data)
}

export const deleteTeam = async (id: string): Promise<void> => {
  await api.delete(`/teams/${id}`)
}
