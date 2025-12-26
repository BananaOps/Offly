import { useState, useEffect, useMemo } from 'react'
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
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons'
import { Holiday } from '../types'
import {
  loadHolidays,
  addHoliday,
  updateHoliday,
  deleteHoliday,
  countries,
  exportHolidays,
  importHolidays
} from '../utils/holidayManager'
import { getAuthConfig, getCurrentUser } from '../auth'

export default function HolidayManagement() {
  const isSSO = getAuthConfig().enabled
  const [isAdmin, setIsAdmin] = useState(false)
  const canEdit = useMemo(() => !isSSO || isAdmin, [isSSO, isAdmin])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        const count = await importHolidays(data)
        loadData()
        alert(`${count} holidays imported successfully!`)
      } catch (error) {
        alert('Error importing holidays. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i - 2)

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-100 dark:border-gray-700 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-text dark:text-white flex items-center">
          <FontAwesomeIcon icon={faCalendarAlt} className="text-primary mr-3" />
          Holiday Management
        </h2>
        
        {canEdit && (
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faDownload} />
            Export
          </button>
          <label className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer">
            <FontAwesomeIcon icon={faUpload} />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
        )}
      </div>

      {isSSO && !canEdit && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">SSO Authentication Mode</p>
              <p>Holiday management is disabled when SSO is enabled. Holidays should be managed through your centralized configuration or by an administrator.</p>
            </div>
          </div>
        </div>
      )}

      {canEdit && (
      <div className="mb-6 p-6 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-text dark:text-white">Add New Holiday</h3>
        <div className="grid grid-cols-4 gap-4">
          <select
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            className="px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-text dark:text-white"
          >
            <option value="">Select country</option>
            {countries.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-text dark:text-white"
          />
          
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Holiday name"
            className="px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-text dark:text-white"
          />
          
          <button
            onClick={handleAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all shadow-md flex items-center justify-center gap-2 font-medium"
          >
            <FontAwesomeIcon icon={faPlus} />
            Add
          </button>
        </div>
      </div>
      )}

      {/* Filters */}
      <div className="mb-6 p-6 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <h3 className="text-lg font-semibold mb-4 text-text dark:text-white flex items-center">
          <FontAwesomeIcon icon={faFilter} className="text-primary mr-2" />
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FontAwesomeIcon icon={faGlobe} className="text-accent mr-2" />
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 transition-all cursor-pointer bg-white dark:bg-gray-800 text-text dark:text-white hover:border-primary"
            >
              <option value="">All countries</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-secondary mr-2" />
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-600 shadow-sm focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 transition-all cursor-pointer bg-white dark:bg-gray-800 text-text dark:text-white hover:border-secondary"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Holidays list */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-background dark:bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase">Country</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text dark:text-gray-300 uppercase">Name</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-text dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {filteredHolidays.map(holiday => (
              <tr key={holiday.id} className="hover:bg-background dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {editingId === holiday.id ? (
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="px-3 py-1 rounded border-2 border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-text dark:text-white"
                    >
                      {countries.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium text-text dark:text-white">
                      {countries.find(c => c.code === holiday.country)?.name || holiday.country}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {editingId === holiday.id ? (
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="px-3 py-1 rounded border-2 border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-text dark:text-white"
                    />
                  ) : (
                    new Date(holiday.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-text dark:text-white">
                  {editingId === holiday.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1 rounded border-2 border-primary focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-text dark:text-white"
                    />
                  ) : (
                    holiday.name
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {canEdit && (
                  editingId === holiday.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleUpdate}
                        className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded transition-all shadow-md hover:shadow-lg"
                      >
                        <FontAwesomeIcon icon={faSave} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 text-white rounded transition-all shadow-md hover:shadow-lg"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(holiday)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleDelete(holiday.id!)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
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
        
        {filteredHolidays.length === 0 && (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            No holidays found for the selected filters
          </div>
        )}
      </div>
    </div>
  )
}
