import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faUsers, faSitemap, faCalendarAlt } from '@fortawesome/free-solid-svg-icons'
import Logo from './components/Logo'
import Banner from './components/Banner'
import ThemeToggle from './components/ThemeToggle'
import Login from './components/Login'
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
    <div className="min-h-screen bg-background dark:bg-gray-900 flex flex-col transition-colors">
      <Banner />
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Logo className="h-10" />
              </div>
              <div className="ml-8 flex space-x-4">
                {/* Temporarily hidden - Attendance page
                <button
                  onClick={() => setActiveTab('presences')}
                  className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === 'presences'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-text dark:hover:text-white'
                  }`}
                >
                  <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
                  Attendance
                </button>
                */}
                <button
                  onClick={() => setActiveTab('absences')}
                  className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === 'absences'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-text dark:hover:text-white'
                  }`}
                >
                  <FontAwesomeIcon icon={faCalendarDays} className="mr-2" />
                  Time Off
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-text dark:hover:text-white'
                  }`}
                >
                  <FontAwesomeIcon icon={faUsers} className="mr-2" />
                  Users
                </button>
                <button
                  onClick={() => setActiveTab('organization')}
                  className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === 'organization'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-text dark:hover:text-white'
                  }`}
                >
                  <FontAwesomeIcon icon={faSitemap} className="mr-2" />
                  Organization
                </button>
                <button
                  onClick={() => setActiveTab('holidays')}
                  className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                    activeTab === 'holidays'
                      ? 'border-primary text-primary dark:text-primary'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-text dark:hover:text-white'
                  }`}
                >
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                  Holidays
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getAuthConfig().enabled && <Login isAuthenticated={isAuthenticated} onAuthChange={setIsAuthenticated} />}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
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
  )
}

export default App
