import React from 'react'
import { startLogin, logout, getCurrentUser } from '../auth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faShieldAlt } from '@fortawesome/free-solid-svg-icons'

export default function Login() {
  const user = getCurrentUser()
  return (
    <div className="flex items-center gap-3">
      {user ? (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <FontAwesomeIcon icon={faUser} className="text-gray-500 dark:text-gray-400" />
            <span className="font-medium">{user.name}</span>
            {user.role === 'admin' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                <FontAwesomeIcon icon={faShieldAlt} className="text-xs" />
                Admin
              </span>
            )}
          </div>
          <button
            onClick={logout}
            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Logout
          </button>
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
