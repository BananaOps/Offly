import { useState, useEffect } from 'react'
import Banner from './components/Banner'
import Sidebar from './components/Sidebar'
import AbsenceGrid from './components/AbsenceGrid'
import PresenceView from './components/PresenceView'
import UserManagement from './components/UserManagement'
import TeamManagement from './components/TeamManagement'
import HolidayManagement from './components/HolidayManagement'
import Footer from './components/Footer'
import { User, Team, Absence } from './types'
import { getUsers, getTeams, getAbsences } from './api'
import { handleCallback, setAuthConfig } from './auth'

function App() {
  const [activeTab, setActiveTab] = useState<'absences' | 'presences' | 'users' | 'teams' | 'holidays'>('absences')
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [absencesToday, setAbsencesToday] = useState<Absence[]>([])
  const [focusUserId, setFocusUserId] = useState<string | undefined>()
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
      const today = new Date().toISOString().split('T')[0]
      const [usersData, teamsData, absData] = await Promise.all([
        getUsers(),
        getTeams(),
        getAbsences(undefined, today, today)
      ])
      setUsers(usersData)
      setTeams(teamsData)
      setAbsencesToday(absData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  return (
    <div className="h-screen bg-slate-100 dark:bg-slate-950 flex flex-col transition-colors overflow-hidden">
      <Banner />
      <div className="flex flex-1 min-h-0">
        {/* Vertical sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isAuthenticated={isAuthenticated}
          onAuthChange={setIsAuthenticated}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          users={users}
          teams={teams}
          onSelectUser={(user) => { setFocusUserId(user.id); setActiveTab('absences') }}
        />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
          <main className="flex-grow py-6 px-6">
            {activeTab === 'presences' && (
              <PresenceView users={users} teams={teams} />
            )}
            {activeTab === 'absences' && (
              <AbsenceGrid users={users} teams={teams} focusUserId={focusUserId} />
            )}
            {activeTab === 'users' && (
              <UserManagement
                users={users}
                teams={teams}
                onUpdate={loadData}
              />
            )}
            {activeTab === 'teams' && (
              <TeamManagement
                teams={teams}
                users={users}
                absencesToday={absencesToday}
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
