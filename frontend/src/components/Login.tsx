import { useEffect, useState } from 'react'
import { startLogin, logout, getCurrentUser } from '../auth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faShieldAlt } from '@fortawesome/free-solid-svg-icons'
import UserProfile from './UserProfile'

interface LoginProps {
  isAuthenticated: boolean
  onAuthChange: (authenticated: boolean) => void
}

export default function Login({ isAuthenticated, onAuthChange }: LoginProps) {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  
  useEffect(() => {
    // Fetch user info from backend
    const fetchUser = async () => {
      const userData = await getCurrentUser()
      setUser(userData)
      onAuthChange(!!userData)
    }
    fetchUser()
  }, [isAuthenticated, onAuthChange])
  
  const handleLogout = async () => {
    await logout()
    setUser(null)
    onAuthChange(false)
  }

  const handleProfileClose = () => {
    setShowProfile(false)
    // Reload user data in case it was updated
    const fetchUser = async () => {
      const userData = await getCurrentUser()
      setUser(userData)
    }
    fetchUser()
  }
  
  return (
    <div className="flex items-center gap-3">
      {user ? (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user.name}
              </span>
              {user.role === 'admin' && (
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                  Admin
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
          {showProfile && user.email && (
            <UserProfile userEmail={user.email} onClose={handleProfileClose} />
          )}
        </>
      ) : (
        <button
          onClick={startLogin}
          className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Login
        </button>
      )}
    </div>
  )
}
