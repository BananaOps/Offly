export const JOB_PROFILES = [
  { value: 'dev',     label: '💻 Developer' },
  { value: 'ops',     label: '⚙️ Ops / SRE' },
  { value: 'design',  label: '🎨 Designer' },
  { value: 'qa',      label: '🧪 QA Engineer' },
  { value: 'po',      label: '📋 Product Owner' },
  { value: 'data',    label: '📊 Data' },
  { value: 'codir',   label: '🏛️ CoDir' },
  { value: 'it_corp', label: '🖥️ IT Corp' },
  { value: 'bo',      label: '💼 Business Owner' },
  { value: 'ml',      label: '🤖 ML' },
  { value: 'instru',  label: '🔬 Instrumentation' },
  { value: 'optim',   label: '📈 Optimisation' },
  { value: 'helpdesk', label: '🎧 Helpdesk' },
  { value: 'support', label: '🛟 Support' },
  { value: 'other',   label: '👤 Other' },
] as const

export type JobProfile = typeof JOB_PROFILES[number]['value']

export interface User {
  id: string
  name: string
  email: string
  title?: string
  jobProfile?: JobProfile
  teamId?: string
  country?: string
}

export interface Team {
  id: string
  name: string
}

export interface Absence {
  id: string
  userId: string
  startDate: string
  endDate: string
  reason: string
  status: string
  teamName?: string
}

export interface Holiday {
  id?: string
  date: string
  name: string
  country: string
  year: number
}

/**
 * Événement d'équipe : conférence, repas, midi jeux. Daté au jour comme un
 * férié — l'application ne manipule pas d'heures (design.md §4) — et `endDate`
 * vaut `startDate` pour un événement d'une seule journée, le backend s'en assure.
 */
export interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
  category?: string
  location?: string
  url?: string
}
