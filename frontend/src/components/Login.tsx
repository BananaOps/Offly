import { useEffect, useState } from 'react'
import { startLogin, logout, getCurrentUser } from '../auth'
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
