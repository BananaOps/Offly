import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon, faCircleHalfStroke } from '@fortawesome/free-solid-svg-icons'
import { useDarkMode } from '../hooks/useDarkMode'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useDarkMode()

  const themes = [
    { value: 'light' as const, icon: faSun, label: 'Light' },
    { value: 'auto' as const, icon: faCircleHalfStroke, label: 'Auto' },
    { value: 'dark' as const, icon: faMoon, label: 'Dark' },
  ]

  if (compact) {
    // Collapsed sidebar: show only the active theme icon as a single toggle button
    const active = themes.find(t => t.value === theme) ?? themes[0]
    const next = themes[(themes.findIndex(t => t.value === theme) + 1) % themes.length]
    return (
      <button
        onClick={() => setTheme(next.value)}
        title={`Switch to ${next.label}`}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100/80 dark:bg-gray-800/80 text-blue-500 dark:text-blue-400 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-all"
      >
        <FontAwesomeIcon icon={active.icon} className="text-sm" />
      </button>
    )
  }

  return (
    <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-full p-1 backdrop-blur-sm w-full justify-center">
      {themes.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-1.5 rounded-full transition-all flex-1 flex justify-center ${
            theme === value
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          title={label}
        >
          <FontAwesomeIcon icon={icon} className="text-sm" />
        </button>
      ))}
    </div>
  )
}
