import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserPlus, faUserGroup, faEdit, faTrash, faSave, faTimes, faGlobe, faMagnifyingGlass, faXmark, faFileImport, faSpinner, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { User, Team, JOB_PROFILES, JobProfile } from '../types'
import { createUser, assignUserToTeam, updateUser, deleteUser, createTeam } from '../api'
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
  const [search, setSearch] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterProfile, setFilterProfile] = useState('')

  // CSV import state
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)

  interface ImportRow {
    firstName: string
    lastName: string
    name: string
    email: string
    country: string
    profile: string
    teamName: string
    teamId: string
    status: 'pending' | 'ok' | 'error'
    error?: string
  }

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      // Detect separator
      const sep = lines[0].includes(';') ? ';' : ','
      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase())
      const rows: ImportRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
        const get = (key: string) => cols[headers.indexOf(key)] || ''
        const firstName = get('prénom') || get('prenom') || get('firstname') || get('first_name')
        const lastName = get('nom') || get('lastname') || get('last_name')
        const email = get('email') || get('mail')
        const profile = get('profile') || get('profil')
        const teamName = get('team') || get('équipe') || get('equipe')
        const country = get('pays') || get('country')
        if (!firstName && !lastName && !email) continue
        const matchedTeam = teams.find(t => t.name.toLowerCase() === teamName.toLowerCase())
        rows.push({
          firstName,
          lastName,
          name: [firstName, lastName].filter(Boolean).join(' '),
          email,
          country,
          profile,
          teamName,
          teamId: matchedTeam?.id || '',
          status: 'pending',
        })
      }
      setImportRows(rows)
      setImportDone(false)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const runImport = async () => {
    setImporting(true)
    const updated = [...importRows]

    // Build a local cache of team name -> id (including newly created ones)
    const teamCache: Record<string, string> = {}
    teams.forEach(t => { teamCache[t.name.toLowerCase()] = t.id })

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'ok') continue
      const row = updated[i]
      try {
        // 1. Create user
        const created = await createUser(row.name, row.email || '', row.country || undefined)
        // 2. Set job profile if present
        if (row.profile) {
          await updateUser(created.id, created.name, created.email, row.country || undefined, row.profile)
        }
        // 3. Resolve or create team, then assign
        if (row.teamName) {
          const key = row.teamName.toLowerCase()
          if (!teamCache[key]) {
            const newTeam = await createTeam(row.teamName)
            teamCache[key] = newTeam.id
          }
          await assignUserToTeam(created.id, teamCache[key])
        }
        updated[i] = { ...row, status: 'ok' }
      } catch (err: any) {
        updated[i] = { ...row, status: 'error', error: err?.response?.data?.message || err.message || 'Error' }
      }
      setImportRows([...updated])
    }
    setImporting(false)
    setImportDone(true)
    onUpdate()
  }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    if (filterTeam && u.teamId !== filterTeam) return false
    if (filterProfile && u.jobProfile !== filterProfile) return false
    return true
  })

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
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <FontAwesomeIcon icon={faUserGroup} className="text-blue-600 mr-3" />
            Users
          </span>
          {!getAuthConfig().enabled && (
            <button
              onClick={() => { setShowImport(true); setImportRows([]); setImportDone(false) }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded transition-colors"
            >
              <FontAwesomeIcon icon={faFileImport} />
              Import CSV
            </button>
          )}
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
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
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
        {/* Search & filters bar */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-gray-200/50 dark:border-gray-700/50 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full pl-8 pr-7 py-1.5 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            )}
          </div>
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="py-1.5 px-2 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            value={filterProfile}
            onChange={e => setFilterProfile(e.target.value)}
            className="py-1.5 px-2 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All profiles</option>
            {JOB_PROFILES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {(search || filterTeam || filterProfile) && (
            <span className="text-xs text-slate-400">{filteredUsers.length} / {users.length}</span>
          )}
        </div>
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
            {filteredUsers.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">No users match your search.</td></tr>
            )}
            {filteredUsers.map(user => (
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
      {/* CSV Import Modal — rendered via portal to escape scroll containers */}
      {showImport && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !importing && setShowImport(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FontAwesomeIcon icon={faFileImport} className="text-blue-600" />
                Import users from CSV
              </h3>
              <button onClick={() => !importing && setShowImport(false)} className="text-slate-400 hover:text-slate-600">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Accepted columns <span className="text-slate-400">(CSV or <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">;</code> separated)</span>
              </p>
              <div className="bg-slate-100 dark:bg-slate-700/60 rounded-lg p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 overflow-x-auto">
                <div className="text-slate-400 mb-1"># Required</div>
                <div><span className="text-blue-500">prénom</span> / <span className="text-blue-500">prenom</span> / <span className="text-blue-500">firstname</span></div>
                <div><span className="text-blue-500">nom</span> / <span className="text-blue-500">lastname</span></div>
                <div className="mt-2 text-slate-400"># Optional</div>
                <div><span className="text-slate-500">email</span> / <span className="text-slate-500">mail</span></div>
                <div><span className="text-slate-500">pays</span> / <span className="text-slate-500">country</span> &nbsp;<span className="text-slate-400">(2-letter code: FR, US…)</span></div>
                <div><span className="text-slate-500">profile</span> / <span className="text-slate-500">profil</span> &nbsp;<span className="text-slate-400">(dev, ops, design, qa, pm, data, codir, it_corp, bo, ml, instru, other)</span></div>
                <div><span className="text-slate-500">team</span> / <span className="text-slate-500">équipe</span> &nbsp;<span className="text-slate-400">(created if missing)</span></div>
              </div>
              <div className="mt-2 bg-slate-100 dark:bg-slate-700/60 rounded-lg p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 overflow-x-auto">
                <div className="text-slate-400 mb-1"># Example</div>
                <div>prénom;nom;email;pays;profile;team</div>
                <div>Jean;Dupont;jean@corp.fr;FR;dev;Backend</div>
                <div>Marie;Martin;;FR;pm;Product</div>
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer transition-colors">
                <FontAwesomeIcon icon={faFileImport} />
                Choose file
                <input type="file" accept=".csv,.txt" onChange={handleCSVFile} className="hidden" />
              </label>
            </div>

            {importRows.length > 0 && (
              <>
                <div className="overflow-y-auto flex-1 px-6 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                        <th className="pb-2 text-left font-medium">Name</th>
                        <th className="pb-2 text-left font-medium">Email</th>
                        <th className="pb-2 text-left font-medium">Country</th>
                        <th className="pb-2 text-left font-medium">Profile</th>
                        <th className="pb-2 text-left font-medium">Team</th>
                        <th className="pb-2 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {importRows.map((row, i) => (
                        <tr key={i} className="py-1">
                          <td className="py-1.5 pr-3 font-medium text-slate-800 dark:text-slate-100">{row.name || <span className="text-red-400">—</span>}</td>
                          <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300">{row.email || <span className="text-slate-400">—</span>}</td>
                          <td className="py-1.5 pr-3 text-slate-500">{row.country || '—'}</td>
                          <td className="py-1.5 pr-3 text-slate-500">{row.profile || '—'}</td>
                          <td className="py-1.5 pr-3">
                            {row.teamName ? (
                              row.teamId
                                ? <span className="text-emerald-600 dark:text-emerald-400">{row.teamName}</span>
                                : <span className="text-blue-500" title="Will be created">{row.teamName} <span className="text-xs">(new)</span></span>
                            ) : '—'}
                          </td>
                          <td className="py-1.5">
                            {row.status === 'pending' && <span className="text-slate-400 text-xs">Pending</span>}
                            {row.status === 'ok' && <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500" />}
                            {row.status === 'error' && (
                              <span className="text-red-500 text-xs flex items-center gap-1">
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                {row.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-sm text-slate-500">{importRows.length} row{importRows.length !== 1 ? 's' : ''} detected</span>
                  <div className="flex gap-2">
                    {importDone && (
                      <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded transition-colors">
                        Close
                      </button>
                    )}
                    {!importDone && (
                      <button
                        onClick={runImport}
                        disabled={importing}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded flex items-center gap-2 transition-colors"
                      >
                        {importing && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                        {importing ? 'Importing…' : 'Import'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      , document.body)}
      </CardContent>
    </Card>
  )
}
