import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import DataTablePage from './pages/DataTablePage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import AppLaunchSplash from './components/AppLaunchSplash'
import ThemeModeSwitcher from './components/ThemeModeSwitcher'

const SPLASH_SHOW_MS = 2900
const SPLASH_EXIT_MS = 650
const HOME_REVEAL_MS = 1500
const THEME_STORAGE_KEY = 'ui-theme-mode'
const THEME_OPTIONS = new Set(['light', 'colorful'])

function App() {
  const [splashPhase, setSplashPhase] = useState('show')
  const [animateHomeEntry, setAnimateHomeEntry] = useState(false)

  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null
    const themeMode = THEME_OPTIONS.has(savedTheme) ? savedTheme : 'light'
    document.documentElement.setAttribute('data-theme', themeMode)
    document.documentElement.style.colorScheme = 'light'

    const showTimer = window.setTimeout(() => {
      setSplashPhase('exit')
    }, SPLASH_SHOW_MS)

    const doneTimer = window.setTimeout(() => {
      setSplashPhase('done')
      setAnimateHomeEntry(true)
    }, SPLASH_SHOW_MS + SPLASH_EXIT_MS)

    const revealTimer = window.setTimeout(() => {
      setAnimateHomeEntry(false)
    }, SPLASH_SHOW_MS + SPLASH_EXIT_MS + HOME_REVEAL_MS)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(doneTimer)
      window.clearTimeout(revealTimer)
    }
  }, [])

  return (
    <>
      {splashPhase === 'done' && (
        <>
          <Routes>
            <Route path="/" element={<HomePage animateOnLoad={animateHomeEntry} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/data" element={<DataTablePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </>
      )}
      {splashPhase !== 'done' && <AppLaunchSplash isExiting={splashPhase === 'exit'} />}
      <ThemeModeSwitcher />
    </>
  )
}

export default App
