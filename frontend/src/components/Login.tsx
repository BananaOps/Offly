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
              className="w-9 h-9 rounded-md bg-blue-700 flex items-center justify-center text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
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
            className="w-9 h-9 rounded-md bg-blue-700 flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
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
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <div className="w-6 h-6 rounded bg-blue-700 flex items-center justify-center text-white text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-200">
                {user.name}
              </span>
              {user.role === 'admin' && (
                <span className="px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded text-xs font-medium border border-blue-700">
                  Admin
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-red-900/40 hover:text-red-400 rounded-md transition-colors"
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
          className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
        >
          Login
        </button>
      )}
    </div>
  )
}
