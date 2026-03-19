import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faCalendarAlt, 
  faPlus, 
  faEdit, 
  faTrash, 
  faSave, 
  faTimes,
  faGlobe,
  faDownload,
  faUpload,
  faFilter,
  faInfoCircle,
  faFileImport,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
import { Holiday } from '../types'
import {
  loadHolidays,
  addHoliday,
  updateHoliday,
  deleteHoliday,
  countries,
  exportHolidays,
} from '../utils/holidayManager'
import { getAuthConfig, getCurrentUser } from '../auth'

interface ImportRow {
  date: string
  name: string
  country: string
  year: number
  status: 'pending' | 'ok' | 'error'
  error?: string
}

export default function HolidayManagement() {
  const isSSO = getAuthConfig().enabled
  const [isAdmin, setIsAdmin] = useState(false)
  const canEdit = useMemo(() => !isSSO || isAdmin, [isSSO, isAdmin])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // JSON import modal state
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (isSSO) {
        const user = await getCurrentUser()
        setIsAdmin(user?.role === 'admin')
      }
    }
    checkAdmin()
  }, [isSSO])
  
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [newCountry, setNewCountry] = useState('')
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editName, setEditName] = useState('')
  const [editCountry, setEditCountry] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const data = await loadHolidays(selectedCountry || undefined, selectedYear)
    setHolidays(data)
  }

  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => {
      if (selectedCountry && h.country !== selectedCountry) return false
      if (h.year !== selectedYear) return false
      return true
    })
  }, [holidays, selectedCountry, selectedYear])

  const handleAdd = async () => {
    if (!newDate || !newName || !newCountry) return
    
    try {
      const year = new Date(newDate).getFullYear()
      await addHoliday({
        date: newDate,
        name: newName,
        country: newCountry,
        year
      })
      
      setNewDate('')
      setNewName('')
      setNewCountry('')
      loadData()
    } catch (error) {
      console.error('Error adding holiday:', error)
    }
  }

  const startEdit = (holiday: Holiday) => {
    setEditingId(holiday.id!)
    setEditDate(holiday.date)
    setEditName(holiday.name)
    setEditCountry(holiday.country)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDate('')
    setEditName('')
    setEditCountry('')
  }

  const handleUpdate = async () => {
    if (!editingId) return
    
    try {
      const year = new Date(editDate).getFullYear()
      await updateHoliday(editingId, {
        date: editDate,
        name: editName,
        country: editCountry,
        year
      })
      
      cancelEdit()
      loadData()
    } catch (error) {
      console.error('Error updating holiday:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      try {
        await deleteHoliday(id)
        loadData()
      } catch (error) {
        console.error('Error deleting holiday:', error)
      }
    }
  }

  const handleExport = async () => {
    try {
      const data = await exportHolidays()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `holidays-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting holidays:', error)
    }
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(data)) throw new Error('Expected a JSON array')
        const rows: ImportRow[] = data.map((item: any) => {
          const date = item.date || ''
          const name = item.name || ''
          const country = item.country || ''
          const year = item.year ?? (date ? new Date(date).getFullYear() : new Date().getFullYear())
          let error: string | undefined
          if (!date) error = 'Missing date'
          else if (!name) error = 'Missing name'
          else if (!country) error = 'Missing country'
          return { date, name, country, year, status: error ? 'error' : 'pending', error }
        })
        setImportRows(rows)
        setImportDone(false)
      } catch (err: any) {
        alert('Invalid JSON file: ' + (err.message || 'parse error'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const runImport = async () => {
    setImporting(true)
    const updated = [...importRows]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'ok') continue
      if (updated[i].error && updated[i].status === 'error') continue
      const row = updated[i]
      try {
        await addHoliday({ date: row.date, name: row.name, country: row.country, year: row.year })
        updated[i] = { ...row, status: 'ok' }
      } catch (err: any) {
        updated[i] = { ...row, status: 'error', error: err?.response?.data?.message || err.message || 'Error' }
      }
      setImportRows([...updated])
    }
    setImporting(false)
    setImportDone(true)
    loadData()
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i - 2)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-600" />
          Holidays
          <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
            {filteredHolidays.length}
          </span>
        </h2>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
            >
              <FontAwesomeIcon icon={faDownload} className="text-xs" />
              Export
            </button>
            <button
              onClick={() => { setShowImport(true); setImportRows([]); setImportDone(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-colors font-medium"
            >
              <FontAwesomeIcon icon={faUpload} className="text-xs" />
              Import
            </button>
          </div>
        )}
      </div>

      {isSSO && !canEdit && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
          <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-0.5 text-sm shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Holiday management is disabled in SSO mode. Contact an administrator.
          </p>
        </div>
      )}

      {canEdit && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Add holiday</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              className="px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">Country…</option>
              {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Holiday name…"
              className="flex-1 min-w-[160px] px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors font-medium"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              Add
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <FontAwesomeIcon icon={faFilter} className="mr-1" />Filters
          </p>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="py-1.5 px-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All countries</option>
            {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="py-1.5 px-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Country</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Name</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredHolidays.map(holiday => (
              <tr key={holiday.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-2.5 whitespace-nowrap text-sm">
                  {editingId === holiday.id ? (
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="px-2 py-1 text-sm rounded border border-blue-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  ) : (
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {countries.find(c => c.code === holiday.country)?.name || holiday.country}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {editingId === holiday.id ? (
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="px-2 py-1 text-sm rounded border border-blue-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  ) : (
                    new Date(holiday.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200">
                  {editingId === holiday.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border border-blue-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  ) : holiday.name}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm">
                  {canEdit && (
                    editingId === holiday.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleUpdate} className="text-green-600 hover:text-green-500 dark:text-green-400 transition-colors" title="Save">
                          <FontAwesomeIcon icon={faSave} />
                        </button>
                        <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="Cancel">
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(holiday)} className="text-slate-300 hover:text-blue-500 transition-colors" title="Edit">
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button onClick={() => handleDelete(holiday.id!)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete">
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
        {filteredHolidays.length === 0 && (
          <div className="text-center py-10 text-sm text-slate-400">No holidays found</div>
        )}
      </div>

      {/* Import JSON modal */}
      {showImport && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FontAwesomeIcon icon={faFileImport} className="text-green-600" />
                Import Holidays (JSON)
              </h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* Format guide */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
                <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Expected JSON format</p>
                <pre className="bg-slate-900 text-green-300 rounded-lg p-3 text-xs overflow-x-auto leading-relaxed">{`[
  {
    "date": "2025-12-25",   // required — YYYY-MM-DD
    "name": "Christmas Day", // required
    "country": "FR",         // required — 2-letter code
    "year": 2025             // optional — inferred from date if absent
  }
]`}</pre>
                <p className="mt-2 text-slate-400 text-xs">
                  Use <span className="font-semibold text-blue-500">Export</span> to get a valid file from your current data.
                </p>
              </div>

              {/* File picker */}
              {importRows.length === 0 && (
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 cursor-pointer hover:border-green-500 transition-colors">
                  <FontAwesomeIcon icon={faUpload} className="text-3xl text-slate-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Click to select a <span className="font-semibold">.json</span> file</span>
                  <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                </label>
              )}

              {/* Preview table */}
              {importRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Preview — {importRows.length} row{importRows.length !== 1 ? 's' : ''}
                      {importDone && (
                        <span className="ml-3 text-green-600 dark:text-green-400">
                          <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                          {importRows.filter(r => r.status === 'ok').length} imported
                          {importRows.filter(r => r.status === 'error').length > 0 && (
                            <span className="text-red-500 ml-2">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                              {importRows.filter(r => r.status === 'error').length} failed
                            </span>
                          )}
                        </span>
                      )}
                    </p>
                    {!importing && !importDone && (
                      <label className="text-xs text-blue-600 cursor-pointer hover:underline">
                        Change file
                        <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Country</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Year</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {importRows.map((row, i) => (
                          <tr key={i} className={row.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : row.status === 'ok' ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {row.status === 'pending' && <span className="text-slate-400 text-xs">⏳ Pending</span>}
                              {row.status === 'ok' && <span className="text-green-600 text-xs font-semibold"><FontAwesomeIcon icon={faCheckCircle} className="mr-1" />OK</span>}
                              {row.status === 'error' && (
                                <span className="text-red-600 text-xs font-semibold" title={row.error}>
                                  <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />{row.error || 'Error'}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-700 dark:text-slate-200">{row.date || <span className="text-red-400">—</span>}</td>
                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.name || <span className="text-red-400">—</span>}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{row.country || <span className="text-red-400">—</span>}</span>
                              {row.country && (
                                <span className="ml-1 text-xs text-slate-400">
                                  {countries.find(c => c.code === row.country)?.name}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-500">{row.year}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {importDone ? 'Close' : 'Cancel'}
              </button>
              {importRows.length > 0 && !importDone && (
                <button
                  onClick={runImport}
                  disabled={importing || importRows.every(r => r.status === 'error')}
                  className="px-5 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {importing
                    ? <><FontAwesomeIcon icon={faSpinner} spin /> Importing…</>
                    : <><FontAwesomeIcon icon={faFileImport} /> Import {importRows.filter(r => r.status !== 'error' || !r.error).length} holidays</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
