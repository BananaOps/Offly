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
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {themes.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-2 rounded-md transition-all ${
            theme === value
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
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
