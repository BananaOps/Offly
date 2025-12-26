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
    <div className="flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-full p-1 backdrop-blur-sm">
      {themes.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-1.5 rounded-full transition-all ${
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
