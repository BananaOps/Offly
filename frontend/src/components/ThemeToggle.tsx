import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon, faCircleHalfStroke } from '@fortawesome/free-solid-svg-icons'
import { useDarkMode } from '../hooks/useDarkMode'

export default function ThemeToggle() {
  const { theme, setTheme } = useDarkMode()

  const themes = [
    { value: 'light' as const, icon: faSun, label: 'Light' },
    { value: 'auto' as const, icon: faCircleHalfStroke, label: 'Auto' },
    { value: 'dark' as const, icon: faMoon, label: 'Dark' },
  ]

  return (
    <div className="flex bg-background dark:bg-gray-800 rounded-lg p-1 border-2 border-gray-200 dark:border-gray-700 shadow-sm">
      {themes.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            theme === value
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-text dark:hover:text-white'
          }`}
          title={label}
        >
          <FontAwesomeIcon icon={icon} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
