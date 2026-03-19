import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserPlus, faUserGroup, faEdit, faTrash, faSave, faTimes, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { User, Team, JOB_PROFILES, JobProfile } from '../types'
import { createUser, assignUserToTeam, updateUser, deleteUser } from '../api'
import { countries } from '../utils/holidayManager'
import { getAuthConfig } from '../auth'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'

interface Props {
  users: User[]
  teams: Team[]
  onUpdate: () => void
}

export default function UserManagement({ users, teams, onUpdate }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCountry, setEditCountry] = useState('')
  const [editJobProfile, setEditJobProfile] = useState<JobProfile | ''>('')

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createUser(name, email, country)
      setName('')
      setEmail('')
      setCountry('')
      onUpdate()
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const handleAssignTeam = async (userId: string, teamId: string) => {
    try {
      await assignUserToTeam(userId, teamId)
      onUpdate()
    } catch (error) {
      console.error('Error assigning team:', error)
    }
  }

  const startEdit = (user: User) => {
    setEditingUser(user.id)
    setEditName(user.name)
    setEditEmail(user.email)
    setEditCountry(user.country || '')
    setEditJobProfile(user.jobProfile || '')
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setEditName('')
    setEditEmail('')
    setEditCountry('')
    setEditJobProfile('')
  }

  const handleUpdateUser = async (userId: string) => {
    try {
      await updateUser(userId, editName, editEmail, editCountry, editJobProfile || undefined)
      setEditingUser(null)
      onUpdate()
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId)
        onUpdate()
      } catch (error) {
        console.error('Error deleting user:', error)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FontAwesomeIcon icon={faUserGroup} className="text-blue-600 mr-3" />
          Users
        </CardTitle>
      </CardHeader>
      <CardContent>
      {!getAuthConfig().enabled && (
        <form onSubmit={handleCreateUser} className="mb-8 p-6 bg-gray-50/80 dark:bg-gray-900/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm transition-colors">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <Select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">Select country</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="gap-2">
            <FontAwesomeIcon icon={faUserPlus} />
            Create User
          </Button>
        </form>
      )}

      {getAuthConfig().enabled && (
        <div className="mb-6 p-4 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-2xl backdrop-blur-sm">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <FontAwesomeIcon icon={faUserGroup} className="mr-2" />
            SSO Authentication is enabled. Users are automatically created upon first login.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
        <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
          <thead className="bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase tracking-wider">
                <FontAwesomeIcon icon={faGlobe} className="text-accent mr-2" />
                Country
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase tracking-wider">
                <FontAwesomeIcon icon={faUserGroup} className="text-secondary mr-2" />
                Team
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase tracking-wider">
                Profile
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-text dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-background dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text dark:text-white">
                  {editingUser === user.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-1 rounded border-2 border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-text dark:text-white"
                    />
                  ) : (
                    user.name
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {editingUser === user.id ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="px-3 py-1 rounded border-2 border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-text dark:text-white"
                    />
                  ) : (
                    user.email
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {editingUser === user.id ? (
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="px-3 py-1 rounded border-2 border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-text dark:text-white"
                    >
                      <option value="">None</option>
                      {countries.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    user.country ? countries.find(c => c.code === user.country)?.name : '-'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getAuthConfig().enabled ? (
                    <span className="text-gray-600 dark:text-gray-400">
                      {user.teamId ? teams.find(t => t.id === user.teamId)?.name : '-'}
                    </span>
                  ) : (
                    <select
                      value={user.teamId || ''}
                      onChange={(e) => handleAssignTeam(user.id, e.target.value)}
                      className="px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 text-sm transition-all cursor-pointer hover:border-secondary bg-white dark:bg-gray-700 text-text dark:text-white"
                    >
                      <option value="">None</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {editingUser === user.id ? (
                    <select
                      value={editJobProfile}
                      onChange={e => setEditJobProfile(e.target.value as JobProfile)}
                      className="px-2 py-1 rounded border border-blue-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none text-xs"
                    >
                      <option value="">None</option>
                      {JOB_PROFILES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {user.jobProfile
                        ? JOB_PROFILES.find(p => p.value === user.jobProfile)?.label ?? user.jobProfile
                        : <span className="text-slate-400">—</span>
                      }
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {!getAuthConfig().enabled && (
                    editingUser === user.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdateUser(user.id)}
                          className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded transition-all shadow-md hover:shadow-lg"
                          title="Save"
                        >
                          <FontAwesomeIcon icon={faSave} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 text-white rounded transition-all shadow-md hover:shadow-lg"
                          title="Cancel"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </CardContent>
    </Card>
  )
}
