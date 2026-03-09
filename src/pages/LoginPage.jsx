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
    <main className="min-h-screen bg-[#F7F9FC] px-3 py-6 text-[#1A2E44]">
      <div className="mx-auto w-full max-w-[430px] space-y-4">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-extrabold">Login Admin</h1>
          <p className="text-sm text-slate-500">Akses data pengguna BMI</p>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-base font-semibold focus:outline-none"
                placeholder="Masukkan username"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-base font-semibold focus:outline-none"
                placeholder="Masukkan password"
              />
            </div>

            {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

            <button
              type="submit"
              className="min-h-12 w-full rounded-full bg-[#1A2E44] px-4 text-sm font-bold text-white"
            >
              Masuk
            </button>
          </form>
        </section>

        <Link
          to="/"
          className="block rounded-2xl bg-white p-4 text-center text-sm font-bold shadow-sm"
        >
          Kembali ke Form BMI
        </Link>
      </div>
    </main>
  )
}

export default LoginPage
