import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { isAuthenticated, login } from '../lib/auth'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  if (isAuthenticated()) {
    return <Navigate to="/data" replace />
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const ok = login(username, password)
    if (!ok) {
      setError('Username atau password salah.')
      return
    }
    navigate('/data', { replace: true })
  }

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <header className="rounded-xl bg-[var(--card)] p-5 text-[var(--card-foreground)] ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]">
          <h1 className="text-2xl font-semibold">Login Admin</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Akses data pengguna BMI</p>
        </header>

        <section className="rounded-xl bg-[var(--card)] p-5 text-[var(--card-foreground)] ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-base font-medium ring-1 ring-transparent hover:border-[var(--foreground)]/20 md:text-sm"
                placeholder="Masukkan username"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-base font-medium ring-1 ring-transparent hover:border-[var(--foreground)]/20 md:text-sm"
                placeholder="Masukkan password"
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger-foreground)]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="min-h-12 w-full rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] hover:brightness-105 active:translate-y-px"
            >
              Masuk
            </button>
          </form>
        </section>

        <Link
          to="/"
          className="block rounded-xl bg-[var(--card)] p-4 text-center text-sm font-medium text-[var(--card-foreground)] ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] hover:bg-[var(--muted)]/40"
        >
          Kembali ke Menu Utama
        </Link>
        <Link
          to="/"
          className="block rounded-xl bg-[var(--card)] p-4 text-center text-sm font-medium text-[var(--card-foreground)] ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] hover:bg-[var(--muted)]/40"
        >
          Buka Menu Aplikasi
        </Link>
      </div>
    </main>
  )
}

export default LoginPage
