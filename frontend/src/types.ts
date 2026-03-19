export const JOB_PROFILES = [
  { value: 'dev',     label: '💻 Developer' },
  { value: 'ops',     label: '⚙️ Ops / SRE' },
  { value: 'design',  label: '🎨 Designer' },
  { value: 'qa',      label: '🧪 QA Engineer' },
  { value: 'pm',      label: '📋 Product Manager' },
  { value: 'data',    label: '📊 Data' },
  { value: 'codir',   label: '🏛️ CoDir' },
  { value: 'it_corp', label: '🖥️ IT Corp' },
  { value: 'bo',      label: '💼 Business Owner' },
  { value: 'ml',      label: '🤖 ML' },
  { value: 'instru',  label: '🔬 Instrumentation' },
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
}

export interface Holiday {
  id?: string
  date: string
  name: string
  country: string
  year: number
}
