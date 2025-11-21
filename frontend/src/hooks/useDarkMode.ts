import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'auto'

export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme
    return stored || 'auto'
  })

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement

    const updateTheme = () => {
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setIsDark(prefersDark)
        root.classList.toggle('dark', prefersDark)
      } else {
        const dark = theme === 'dark'
        setIsDark(dark)
        root.classList.toggle('dark', dark)
      }
    }

    updateTheme()
    localStorage.setItem('theme', theme)

    // Listen for OS theme changes when in auto mode
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => updateTheme()
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [theme])

  return { theme, setTheme, isDark }
}
