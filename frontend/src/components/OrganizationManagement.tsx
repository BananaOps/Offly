import { useState, useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBuilding, faUserGroup, faPlus, faEdit, faTrash, faSave, faTimes, faInfoCircle, faSitemap } from '@fortawesome/free-solid-svg-icons'
import { Department, Team, User } from '../types'
import { createDepartment, createTeam, updateDepartment, updateTeam, deleteDepartment, deleteTeam } from '../api'
import { getAuthConfig, getCurrentUser } from '../auth'
import OrganizationDiagram from './OrganizationDiagram'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'

interface Props {
  users: User[]
  departments: Department[]
  teams: Team[]
  onUpdate: () => void
}

export default function OrganizationManagement({ users, departments, teams, onUpdate }: Props) {
  const isSSO = getAuthConfig().enabled
  const [isAdmin, setIsAdmin] = useState(false)
  const canEdit = useMemo(() => !isSSO || isAdmin, [isSSO, isAdmin])
  const [activeView, setActiveView] = useState<'manage' | 'diagram'>('diagram')
  const [deptName, setDeptName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (isSSO) {
        const user = await getCurrentUser()
        setIsAdmin(user?.role === 'admin')
      }
    }
    checkAdmin()
  }, [isSSO])
  
  const [editingDept, setEditingDept] = useState<string | null>(null)
  const [editDeptName, setEditDeptName] = useState('')
  
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [editTeamName, setEditTeamName] = useState('')
  const [editTeamDept, setEditTeamDept] = useState('')

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createDepartment(deptName)
      setDeptName('')
      onUpdate()
    } catch (error) {
      console.error('Error creating department:', error)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDept) return
    try {
      await createTeam(teamName, selectedDept)
      setTeamName('')
      onUpdate()
    } catch (error) {
      console.error('Error creating team:', error)
    }
  }

  const startEditDept = (dept: Department) => {
    setEditingDept(dept.id)
    setEditDeptName(dept.name)
  }

  const cancelEditDept = () => {
    setEditingDept(null)
    setEditDeptName('')
  }

  const handleUpdateDept = async (deptId: string) => {
    try {
      await updateDepartment(deptId, editDeptName)
      setEditingDept(null)
      onUpdate()
    } catch (error) {
      console.error('Error updating department:', error)
    }
  }

  const handleDeleteDept = async (deptId: string) => {
    if (confirm('Are you sure you want to delete this department? All associated teams will also be affected.')) {
      try {
        await deleteDepartment(deptId)
        onUpdate()
      } catch (error) {
        console.error('Error deleting department:', error)
      }
    }
  }

  const startEditTeam = (team: Team) => {
    setEditingTeam(team.id)
    setEditTeamName(team.name)
    setEditTeamDept(team.departmentId)
  }

  const cancelEditTeam = () => {
    setEditingTeam(null)
    setEditTeamName('')
    setEditTeamDept('')
  }

  const handleUpdateTeam = async (teamId: string) => {
    try {
      await updateTeam(teamId, editTeamName, editTeamDept)
      setEditingTeam(null)
      onUpdate()
    } catch (error) {
      console.error('Error updating team:', error)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      try {
        await deleteTeam(teamId)
        onUpdate()
      } catch (error) {
        console.error('Error deleting team:', error)
      }
    }
  }

  return (
    <Card>
      <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center">
          <FontAwesomeIcon icon={faBuilding} className="text-blue-600 mr-3" />
          Organization
        </CardTitle>
        
        <div className="flex gap-2 bg-gray-100/80 dark:bg-gray-800/80 rounded-full p-1 backdrop-blur-sm">
          <button
            onClick={() => setActiveView('diagram')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeView === 'diagram'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <FontAwesomeIcon icon={faSitemap} className="mr-2 text-xs" />
            Organization Chart
          </button>
          <button
            onClick={() => setActiveView('manage')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeView === 'manage'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <FontAwesomeIcon icon={faEdit} className="mr-2 text-xs" />
            Manage Structure
          </button>
        </div>
        </div>
      </CardHeader>
      <CardContent>

      {activeView === 'diagram' ? (
        <OrganizationDiagram users={users} departments={departments} teams={teams} />
      ) : (
        <>
      {isSSO && !canEdit && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">SSO Authentication Mode</p>
              <p>Department and team management is disabled when SSO is enabled. Organization structure should be managed through your identity provider or by an administrator.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-text dark:text-white flex items-center">
            <FontAwesomeIcon icon={faBuilding} className="text-primary mr-2" />
            Departments
          </h3>
          {canEdit && (
          <form onSubmit={handleCreateDepartment} className="mb-6 p-4 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <input
              type="text"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="Department name"
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 mb-3 transition-all bg-white dark:bg-gray-800 text-text dark:text-white"
              required
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-accent text-white px-4 py-2.5 rounded-lg hover:shadow-lg transition-all shadow-md inline-flex items-center justify-center gap-2 font-medium hover:scale-105"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create Department
            </button>
          </form>
          )}

          <ul className="space-y-2">
            {departments.map(dept => (
              <li key={dept.id} className="p-4 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary transition-colors">
                {editingDept === dept.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editDeptName}
                      onChange={(e) => setEditDeptName(e.target.value)}
                      className="w-full px-3 py-2 rounded border-2 border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-text dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateDept(dept.id)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faSave} />
                        Save
                      </button>
                      <button
                        onClick={cancelEditDept}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 text-white rounded transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faBuilding} className="text-primary mr-3" />
                      <span className="font-medium text-text dark:text-white">{dept.name}</span>
                    </div>
                    {canEdit && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditDept(dept)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-2"
                        title="Edit"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-2"
                        title="Delete"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-text dark:text-white flex items-center">
            <FontAwesomeIcon icon={faUserGroup} className="text-secondary mr-2" />
            Teams
          </h3>
          {canEdit && (
          <form onSubmit={handleCreateTeam} className="mb-6 p-4 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 mb-3 transition-all cursor-pointer bg-white dark:bg-gray-800 text-text dark:text-white"
              required
            >
              <option value="">Select a department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 mb-3 transition-all bg-white dark:bg-gray-800 text-text dark:text-white"
              required
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-secondary to-primary text-white px-4 py-2.5 rounded-lg hover:shadow-lg transition-all shadow-md inline-flex items-center justify-center gap-2 font-medium hover:scale-105"
            >
              <FontAwesomeIcon icon={faPlus} />
              Create Team
            </button>
          </form>
          )}

          <ul className="space-y-2">
            {teams.map(team => {
              const dept = departments.find(d => d.id === team.departmentId)
              return (
                <li key={team.id} className="p-4 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-secondary transition-colors">
                  {editingTeam === team.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        className="w-full px-3 py-2 rounded border-2 border-secondary focus:ring-2 focus:ring-secondary bg-white dark:bg-gray-700 text-text dark:text-white"
                        placeholder="Team name"
                      />
                      <select
                        value={editTeamDept}
                        onChange={(e) => setEditTeamDept(e.target.value)}
                        className="w-full px-3 py-2 rounded border-2 border-secondary focus:ring-2 focus:ring-secondary bg-white dark:bg-gray-700 text-text dark:text-white"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateTeam(team.id)}
                          className="flex-1 px-3 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <FontAwesomeIcon icon={faSave} />
                          Save
                        </button>
                        <button
                          onClick={cancelEditTeam}
                          className="flex-1 px-3 py-2 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 text-white rounded transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faUserGroup} className="text-secondary mr-3" />
                        <div>
                          <div className="font-medium text-text dark:text-white">{team.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                            <FontAwesomeIcon icon={faBuilding} className="mr-1 text-xs" />
                            {dept?.name}
                          </div>
                      </div>
                    </div>
                      {canEdit && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditTeam(team)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-2"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-2"
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
        </>
      )}
      </CardContent>
    </Card>
  )
}
