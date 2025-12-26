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
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <FontAwesomeIcon icon={faUser} className="text-gray-500 dark:text-gray-400" />
            <button
              onClick={() => setShowProfile(true)}
              className="font-medium hover:text-primary dark:hover:text-primary transition-colors cursor-pointer"
            >
              {user.name}
            </button>
            {user.role === 'admin' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                <FontAwesomeIcon icon={faShieldAlt} className="text-xs" />
                Admin
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Logout
          </button>
          {showProfile && user.email && (
            <UserProfile userEmail={user.email} onClose={handleProfileClose} />
          )}
        </>
      ) : (
        <button
          onClick={startLogin}
          className="px-3 py-2 text-sm bg-primary text-white rounded hover:opacity-90"
        >
          Login
        </button>
      )}
    </div>
  )
}
