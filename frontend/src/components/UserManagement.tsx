import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserPlus, faBuilding, faUserGroup, faEdit, faTrash, faSave, faTimes, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { User, Department, Team } from '../types'
import { createUser, assignUserToDepartment, assignUserToTeam, updateUser, deleteUser } from '../api'
import { countries } from '../utils/holidayManager'

interface Props {
  users: User[]
  departments: Department[]
  teams: Team[]
  onUpdate: () => void
}

export default function UserManagement({ users, departments, teams, onUpdate }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCountry, setEditCountry] = useState('')

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

  const handleAssignDepartment = async (userId: string, departmentId: string) => {
    try {
      await assignUserToDepartment(userId, departmentId)
      onUpdate()
    } catch (error) {
      console.error('Error assigning department:', error)
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
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setEditName('')
    setEditEmail('')
    setEditCountry('')
  }

  const handleUpdateUser = async (userId: string) => {
    try {
      await updateUser(userId, editName, editEmail, editCountry)
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
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-100 dark:border-gray-700 transition-colors">
      <h2 className="text-2xl font-bold text-text dark:text-white mb-6 flex items-center">
        <FontAwesomeIcon icon={faUserGroup} className="text-primary mr-3" />
        Users
      </h2>

      <form onSubmit={handleCreateUser} className="mb-8 p-6 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 text-text dark:text-white bg-white dark:bg-gray-800 transition-all"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 text-text dark:text-white bg-white dark:bg-gray-800 transition-all"
            required
          />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 text-text dark:text-white bg-white dark:bg-gray-800 transition-all cursor-pointer"
          >
            <option value="">Select country</option>
            {countries.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-2.5 rounded-lg hover:shadow-lg transition-all shadow-md inline-flex items-center gap-2 font-medium hover:scale-105"
        >
          <FontAwesomeIcon icon={faUserPlus} />
          Create User
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-background dark:bg-gray-900">
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <FontAwesomeIcon icon={faBuilding} className="text-primary" />
                Department
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase tracking-wider">
                <FontAwesomeIcon icon={faUserGroup} className="text-secondary mr-2" />
                Team
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
                  <select
                    value={user.departmentId || ''}
                    onChange={(e) => handleAssignDepartment(user.id, e.target.value)}
                    className="px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 text-sm transition-all cursor-pointer hover:border-primary bg-white dark:bg-gray-700 text-text dark:text-white"
                  >
                    <option value="">None</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <select
                    value={user.teamId || ''}
                    onChange={(e) => handleAssignTeam(user.id, e.target.value)}
                    className="px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 text-sm transition-all cursor-pointer hover:border-secondary bg-white dark:bg-gray-700 text-text dark:text-white"
                  >
                    <option value="">None</option>
                    {teams.filter(t => !user.departmentId || t.departmentId === user.departmentId).map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {editingUser === user.id ? (
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
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
