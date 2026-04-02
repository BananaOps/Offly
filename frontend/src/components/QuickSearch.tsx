import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faXmark, faUser, faUserGroup } from '@fortawesome/free-solid-svg-icons'
import { User, Team, JOB_PROFILES } from '../types'

interface Props {
  users: User[]
  teams: Team[]
  onSelectUser?: (user: User) => void
}

function getFlag(country: string): string {
  if (!country || country.length !== 2) return ''
  return country.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
  )
}

export default function QuickSearch({ users, teams, onSelectUser }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.jobProfile && u.jobProfile.toLowerCase().includes(q))
    ).slice(0, 10)
  }, [query, users])

  const getTeamName = (teamId?: string) =>
    teamId ? teams.find(t => t.id === teamId)?.name : undefined

  const getProfileLabel = (profile?: string) =>
    profile ? JOB_PROFILES.find(p => p.value === profile)?.label : undefined

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && results[cursor]) {
      select(results[cursor])
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const item = listRef.current?.children[cursor] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const select = (user: User) => {
    onSelectUser?.(user)
    setOpen(false)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      title="Quick search (Ctrl+K)"
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors w-full"
    >
      <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" />
      <span className="flex-1 text-left truncate">Search…</span>
      <kbd className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 font-mono">⌘K</kbd>
    </button>
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, email, profile…"
            className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none text-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
          <kbd className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-mono flex-shrink-0">Esc</kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <ul ref={listRef} className="max-h-80 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">No results for "{query}"</li>
            ) : (
              results.map((user, i) => {
                const teamName = getTeamName(user.teamId)
                const profileLabel = getProfileLabel(user.jobProfile)
                return (
                  <li key={user.id}>
                    <button
                      onClick={() => select(user)}
                      onMouseEnter={() => setCursor(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === cursor
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{user.name}</span>
                          {user.country && <span className="text-sm flex-shrink-0">{getFlag(user.country)}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                          {user.email && <span>{user.email}</span>}
                          {teamName && (
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faUserGroup} className="text-[9px]" />
                              {teamName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Profile badge */}
                      {profileLabel && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex-shrink-0">
                          {profileLabel}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        )}

        {!query.trim() && (
          <div className="px-4 py-5 text-center text-xs text-slate-400">
            <FontAwesomeIcon icon={faUser} className="text-slate-300 text-xl mb-2 block mx-auto" />
            Type to search among {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
        )}

        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex gap-4 text-[10px] text-slate-400">
          <span><kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded">↵</kbd> select</span>
          <span><kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded">Esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
