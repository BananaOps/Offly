import { useState, useEffect } from 'react'
import Banner from './components/Banner'
import Sidebar from './components/Sidebar'
import AbsenceGrid from './components/AbsenceGrid'
import PresenceView from './components/PresenceView'
import UserManagement from './components/UserManagement'
import OrganizationManagement from './components/OrganizationManagement'
import HolidayManagement from './components/HolidayManagement'
import Footer from './components/Footer'
import { User, Department, Team } from './types'
import { getUsers, getDepartments, getTeams } from './api'
import { handleCallback, setAuthConfig, getAuthConfig } from './auth'

function App() {
  const [activeTab, setActiveTab] = useState<'absences' | 'presences' | 'users' | 'organization' | 'holidays'>('absences')
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    // Load auth config from backend, then handle possible OIDC callback
    const init = async () => {
      try {
        const res = await fetch('/api/v1/auth/config')
        if (res.ok) {
          const cfg = await res.json()
          setAuthConfig({ enabled: !!cfg.enabled, issuerUrl: cfg.issuerUrl || '', clientId: cfg.clientId || '' })
          
          // If auth enabled, fetch user info immediately to cache role
          if (cfg.enabled) {
            const { getCurrentUser } = await import('./auth')
            await getCurrentUser()
          }
        }
      } catch {}
      const authenticated = await handleCallback()
      setIsAuthenticated(authenticated || !!localStorage.getItem('id_token'))
      // Wait a bit after authentication to ensure user is created
      if (authenticated) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      loadData()
    }
    init()
  }, [])

  useEffect(() => {
    // Reload data when authentication state changes
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  const loadData = async () => {
    try {
      const [usersData, departmentsData, teamsData] = await Promise.all([
        getUsers(),
        getDepartments(),
        getTeams()
      ])
      setUsers(usersData)
      setDepartments(departmentsData)
      setTeams(teamsData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <Banner />
      <div className="flex flex-1 overflow-hidden">
        {/* Vertical sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isAuthenticated={isAuthenticated}
          onAuthChange={setIsAuthenticated}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
          <main className="flex-grow py-6 px-6">
            {activeTab === 'presences' && (
              <PresenceView users={users} departments={departments} teams={teams} />
            )}
            {activeTab === 'absences' && (
              <AbsenceGrid users={users} departments={departments} teams={teams} />
            )}
            {activeTab === 'users' && (
              <UserManagement
                users={users}
                departments={departments}
                teams={teams}
                onUpdate={loadData}
              />
            )}
            {activeTab === 'organization' && (
              <OrganizationManagement
                users={users}
                departments={departments}
                teams={teams}
                onUpdate={loadData}
              />
            )}
            {activeTab === 'holidays' && (
              <HolidayManagement />
            )}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  )
}

export default App
