import axios from 'axios'
import { Event } from '../types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
})

/** Champs modifiables d'un événement ; `id` absent = création. */
export interface EventDraft {
  id?: string
  name: string
  startDate: string
  endDate?: string
  category?: string
  location?: string
  url?: string
}

// La passerelle enveloppe la réponse dans `{ event: ... }`.
const unwrap = (data: { event?: Event } | Event): Event =>
  'event' in data && data.event ? data.event : (data as Event)

const body = (draft: EventDraft) => ({
  name: draft.name,
  startDate: draft.startDate,
  endDate: draft.endDate ?? '',
  category: draft.category ?? '',
  location: draft.location ?? '',
  url: draft.url ?? '',
})

/** Bornes incluses, `AAAA-MM-JJ` ; omises, tous les événements sont renvoyés. */
export const getEvents = async (from?: string, to?: string): Promise<Event[]> => {
  const params: Record<string, string> = {}
  if (from) params.from = from
  if (to) params.to = to

  const response = await api.get('/events', { params })
  return response.data.events || []
}

export const createEvent = async (draft: EventDraft): Promise<Event> => {
  const response = await api.post('/events', body(draft))
  return unwrap(response.data)
}

export const updateEvent = async (id: string, draft: EventDraft): Promise<Event> => {
  const response = await api.put(`/events/${id}`, { id, ...body(draft) })
  return unwrap(response.data)
}

export const deleteEvent = async (id: string): Promise<void> => {
  await api.delete(`/events/${id}`)
}
