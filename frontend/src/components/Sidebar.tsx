import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import Login from './Login'
import QuickSearch from './QuickSearch'
import { getAuthConfig } from '../auth'
import { User, Team } from '../types'

type Tab = 'absences' | 'presences' | 'users' | 'teams' | 'holidays'

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  isAuthenticated: boolean
  onAuthChange: (v: boolean) => void
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
  users: User[]
  teams: Team[]
  onSelectUser?: (user: User) => void
}

const navItems: { id: Tab; label: string; emoji: string }[] = [
  { id: 'absences',     label: 'Time Off',      emoji: '🗓️' },
  { id: 'teams',        label: 'Teams',          emoji: '🏷️' },
  { id: 'users',        label: 'Users',          emoji: '👥' },
  { id: 'holidays',     label: 'Holidays',       emoji: '🌍' },
]

export default function Sidebar({
  activeTab,
  onTabChange,
  isAuthenticated,
  onAuthChange,
  collapsed,
  onCollapsedChange,
  users,
  teams,
  onSelectUser,
}: SidebarProps) {
  return (
    <aside
      className={`
        relative flex flex-col h-screen sticky top-0 z-30
        transition-all duration-300 ease-in-out
        bg-slate-900 dark:bg-slate-950
        border-r border-slate-700/60
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-3 border-b border-slate-700/60 ${
        collapsed ? 'justify-center' : 'gap-3'
      }`}>
        <Logo className="h-7" iconOnly={collapsed} />
      </div>

      {/* Nav section label */}
      {!collapsed && (
        <div className="px-4 pt-5 pb-1">
          <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Navigation</span>
        </div>
      )}

      {/* Quick search */}
      <div className={`px-2 ${collapsed ? 'hidden' : 'pt-2 pb-1'}`}>
        <QuickSearch users={users} teams={teams} onSelectUser={onSelectUser} />
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-2 overflow-y-auto">
        {navItems.map(({ id, label, emoji }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={collapsed ? label : undefined}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                transition-colors duration-100 text-left w-full
                ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className="text-base leading-none flex-shrink-0">{emoji}</span>
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-slate-700/60" />

      {/* Bottom: ThemeToggle + Login */}
      <div className={`flex flex-col gap-2 px-2 py-3 ${
        collapsed ? 'items-center' : ''
      }`}>
        <div className={collapsed ? '' : 'px-1'}>
          <ThemeToggle compact={collapsed} />
        </div>
        {getAuthConfig().enabled && (
          <Login
            isAuthenticated={isAuthenticated}
            onAuthChange={onAuthChange}
            compact={collapsed}
          />
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="
          absolute -right-3 top-16
          w-6 h-6 rounded
          bg-slate-800
          border border-slate-600
          shadow flex items-center justify-center
          text-slate-400
          hover:text-blue-400
          hover:border-blue-500
          transition-colors text-xs z-10
        "
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
      </button>
    </aside>
  )
}
