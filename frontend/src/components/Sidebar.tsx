import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faUsers,
  faSitemap,
  faCalendarAlt,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import Login from './Login'
import { getAuthConfig } from '../auth'

type Tab = 'absences' | 'presences' | 'users' | 'organization' | 'holidays'

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  isAuthenticated: boolean
  onAuthChange: (v: boolean) => void
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
}

const navItems: { id: Tab; label: string; icon: typeof faCalendarDays }[] = [
  { id: 'absences', label: 'Time Off', icon: faCalendarDays },
  { id: 'users', label: 'Users', icon: faUsers },
  { id: 'organization', label: 'Organization', icon: faSitemap },
  { id: 'holidays', label: 'Holidays', icon: faCalendarAlt },
]

export default function Sidebar({
  activeTab,
  onTabChange,
  isAuthenticated,
  onAuthChange,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  return (
    <aside
      className={`
        relative flex flex-col h-screen sticky top-0 z-30
        transition-all duration-300 ease-in-out
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
        border-r border-gray-200/50 dark:border-gray-700/50
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-3 border-b border-gray-200/50 dark:border-gray-700/50 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <Logo className={collapsed ? 'h-7' : 'h-7'} iconOnly={collapsed} />
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-4 overflow-y-auto">
        {navItems.map(({ id, label, icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={collapsed ? label : undefined}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 text-left w-full
                ${active
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-100'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <FontAwesomeIcon
                icon={icon}
                className={`flex-shrink-0 text-base ${active ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Bottom: ThemeToggle + Login */}
      <div className={`flex flex-col gap-2 px-2 py-3 border-t border-gray-200/50 dark:border-gray-700/50 ${collapsed ? 'items-center' : ''}`}>
        {/* Theme toggle */}
        <div className={collapsed ? '' : 'px-1'}>
          <ThemeToggle compact={collapsed} />
        </div>

        {/* Login / user */}
        {getAuthConfig().enabled && (
          <Login
            isAuthenticated={isAuthenticated}
            onAuthChange={onAuthChange}
            compact={collapsed}
          />
        )}
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="
          absolute -right-3 top-1/2 -translate-y-1/2
          w-6 h-6 rounded-full
          bg-white dark:bg-gray-800
          border border-gray-200/80 dark:border-gray-700/80
          shadow-sm flex items-center justify-center
          text-gray-400 dark:text-gray-500
          hover:text-blue-500 dark:hover:text-blue-400
          hover:border-blue-300 dark:hover:border-blue-600
          transition-all text-xs z-10
        "
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
      </button>
    </aside>
  )
}
