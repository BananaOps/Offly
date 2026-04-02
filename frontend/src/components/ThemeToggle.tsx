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
    const active = themes.find(t => t.value === theme) ?? themes[0]
    const next = themes[(themes.findIndex(t => t.value === theme) + 1) % themes.length]
    return (
      <button
        onClick={() => setTheme(next.value)}
        title={`Switch to ${next.label}`}
        className="w-9 h-9 flex items-center justify-center rounded-md bg-slate-700 text-blue-400 hover:bg-slate-600 hover:text-blue-300 transition-colors"
      >
        <FontAwesomeIcon icon={active.icon} className="text-sm" />
      </button>
    )
  }

  return (
    <div className="flex items-center bg-slate-700 rounded-md p-0.5 w-full">
      {themes.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-1.5 rounded transition-colors flex-1 flex justify-center text-xs ${
            theme === value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={label}
        >
          <FontAwesomeIcon icon={icon} />
        </button>
      ))}
    </div>
  )
}
