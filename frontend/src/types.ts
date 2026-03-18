export interface User {
  id: string
  name: string
  email: string
  title?: string
  departmentId?: string
  teamId?: string
  country?: string
}

export interface Department {
  id: string
  name: string
}

export interface Team {
  id: string
  name: string
  departmentId: string
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
