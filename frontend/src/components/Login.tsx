import { useEffect, useState } from 'react'
import { startLogin, logout, getCurrentUser } from '../auth'
import UserProfile from './UserProfile'

interface LoginProps {
  isAuthenticated: boolean
  onAuthChange: (authenticated: boolean) => void
  compact?: boolean
}

export default function Login({ isAuthenticated, onAuthChange, compact = false }: LoginProps) {
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
  
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1">
        {user ? (
          <>
            <button
              onClick={() => setShowProfile(true)}
              title={user.name}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm hover:opacity-80 transition-all"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
            {showProfile && user.email && (
              <UserProfile userEmail={user.email} onClose={handleProfileClose} />
            )}
          </>
        ) : (
          <button
            onClick={startLogin}
            title="Login"
            className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white hover:opacity-90 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {user ? (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 backdrop-blur-sm transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user.name}
              </span>
              {user.role === 'admin' && (
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                  Admin
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-full backdrop-blur-sm transition-all"
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
          className="px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          Login
        </button>
      )}
    </div>
  )
}
