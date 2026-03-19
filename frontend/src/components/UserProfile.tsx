import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faEnvelope, faGlobe, faUserGroup, faTimes, faSave } from '@fortawesome/free-solid-svg-icons'
import { User, Team } from '../types'
import { getUsers, getTeams, updateUser, assignUserToTeam } from '../api'
import { countries } from '../utils/holidayManager'

interface UserProfileProps {
  userEmail: string
  onClose: () => void
}

export default function UserProfile({ userEmail, onClose }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [country, setCountry] = useState('')
  const [teamId, setTeamId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [userEmail])

  const loadData = async () => {
    try {
      const [usersData, teamsData] = await Promise.all([
        getUsers(),
        getTeams()
      ])
      
      const currentUser = usersData.find(u => u.email === userEmail)
      if (currentUser) {
        setUser(currentUser)
        setCountry(currentUser.country || '')
        setTeamId(currentUser.teamId || '')
      }
      
      setTeams(teamsData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading profile:', error)
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    try {
      await updateUser(user.id, user.name, user.email, country)
      
      if (teamId !== user.teamId) {
        await assignUserToTeam(user.id, teamId)
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving profile:', error)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }



  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FontAwesomeIcon icon={faUser} className="text-primary" />
            My Profile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FontAwesomeIcon icon={faUser} className="mr-2 text-primary" />
              Name
            </label>
            <input
              type="text"
              value={user.name}
              disabled
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-primary" />
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FontAwesomeIcon icon={faGlobe} className="mr-2 text-accent" />
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer transition-all"
            >
              <option value="">Select country</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Team */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FontAwesomeIcon icon={faUserGroup} className="mr-2 text-secondary" />
              Team
            </label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer transition-all"
            >
              <option value="">None</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-4 py-2.5 rounded-lg hover:shadow-lg transition-all shadow-md inline-flex items-center justify-center gap-2 font-medium"
          >
            <FontAwesomeIcon icon={faSave} />
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
