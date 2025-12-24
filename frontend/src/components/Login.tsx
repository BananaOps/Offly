import React from 'react'
import { startLogin, logout, getIdToken } from '../auth'

export default function Login() {
  const token = getIdToken()
  return (
    <div className="flex items-center gap-2">
      {token ? (
        <button
          onClick={logout}
          className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Logout
        </button>
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
