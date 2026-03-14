import { useEffect, useState } from 'react'

const THEME_STORAGE_KEY = 'ui-theme-mode'
const THEME_OPTIONS = ['light', 'colorful']

function ThemeModeSwitcher() {
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    return THEME_OPTIONS.includes(savedTheme) ? savedTheme : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
    document.documentElement.style.colorScheme = 'light'
    localStorage.setItem(THEME_STORAGE_KEY, themeMode)
  }, [themeMode])

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-1 rounded-xl bg-[var(--card)] p-1.5 text-[var(--card-foreground)] shadow-lg ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_12%,transparent)] backdrop-blur md:top-6 md:right-6">
      <button
        type="button"
        aria-label="Use light color mode"
        title="Light mode"
        onClick={() => setThemeMode('light')}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          themeMode === 'light'
            ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)]/50'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Use colorful color mode"
        title="Colorful mode"
        onClick={() => setThemeMode('colorful')}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          themeMode === 'colorful'
            ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)]/50'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3a9 9 0 1 0 9 9c0-1.4-1.1-2.5-2.5-2.5H16a2 2 0 0 1-2-2V5.5C14 4.1 12.9 3 11.5 3H12Z" />
          <circle cx="7.5" cy="12" r="1" />
          <circle cx="10" cy="7.5" r="1" />
          <circle cx="15" cy="7.5" r="1" />
        </svg>
      </button>
    </div>
  )
}

export default ThemeModeSwitcher
