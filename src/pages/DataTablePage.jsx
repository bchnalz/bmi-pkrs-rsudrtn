import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { isAuthenticated, logout } from '../lib/auth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function buildWhatsAppUrl(name, phoneNumber) {
  const message = `Halo ${name}, semoga hari Anda menyenangkan. Salam hangat dari tim PKRS RSUD RTN Sidoarjo.`
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
}

function DataTablePage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const canFetch = useMemo(() => isSupabaseConfigured && Boolean(supabase), [])

  const handleExportExcel = useCallback(() => {
    if (rows.length === 0) {
      return
    }

    const exportRows = rows.map((row) => ({
      Nama: row.name ?? '',
      Instansi: row.instansi ?? '',
      Nomor: row.phone_number ?? '',
      Gender: row.gender ?? '',
      Usia: row.age ?? '',
      BMI: row.bmi ?? '',
      Kategori: row.category ?? '',
      Tanggal: row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data BMI')
    XLSX.writeFile(workbook, `data-bmi-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }, [rows])

  useEffect(() => {
    const loadData = async () => {
      if (!canFetch) {
        setError('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.')
        setLoading(false)
        return
      }

      const pageSize = 1000
      let from = 0
      let allRows = []

      while (true) {
        const { data, error: queryError } = await supabase
          .from('bmi_submissions')
          .select('id,name,instansi,phone_number,gender,age,bmi,category,created_at')
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1)

        if (queryError) {
          setError(`Gagal mengambil data: ${queryError.message}`)
          setLoading(false)
          return
        }

        const batch = data ?? []
        allRows = allRows.concat(batch)

        if (batch.length < pageSize) {
          break
        }

        from += pageSize
      }

      setRows(allRows)
      setLoading(false)
    }

    loadData()
  }, [canFetch])

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-3 py-6 text-[#1A2E44]">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <header className="sticky top-3 z-20 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">Data BMI Tersimpan</h1>
              <p className="text-sm text-slate-500">Kelola dan hubungi pengguna melalui WhatsApp</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={rows.length === 0}
                aria-label="Export ke Excel"
                title="Export ke Excel"
                className="rounded-full border border-slate-200 p-2 text-[#1A2E44] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M14.25 2.25H6A2.25 2.25 0 0 0 3.75 4.5v15A2.25 2.25 0 0 0 6 21.75h12A2.25 2.25 0 0 0 20.25 19.5V8.25L14.25 2.25ZM13.5 9V3.75L18.75 9H13.5ZM9.22 11.03l1.53 2.17 1.53-2.17h1.86l-2.45 3.46L14.25 18h-1.88l-1.62-2.31L9.12 18H7.25l2.54-3.56-2.43-3.4h1.86Z" />
                </svg>
              </button>
              <Link
                to="/"
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold"
              >
                Form BMI
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-[#1A2E44] px-3 py-2 text-xs font-bold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          {loading ? <p className="text-sm text-slate-500">Memuat data...</p> : null}
          {!loading && error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data tersimpan.</p>
          ) : null}

          {!loading && !error && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Nama</th>
                    <th className="px-3 py-3">Instansi</th>
                    <th className="px-3 py-3">Nomor</th>
                    <th className="px-3 py-3">BMI</th>
                    <th className="px-3 py-3">Kategori</th>
                    <th className="px-3 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-semibold">{row.name}</td>
                      <td className="px-3 py-3">{row.instansi}</td>
                      <td className="px-3 py-3">{row.phone_number}</td>
                      <td className="px-3 py-3">{row.bmi}</td>
                      <td className="px-3 py-3">{row.category}</td>
                      <td className="px-3 py-3">
                        <a
                          href={buildWhatsAppUrl(row.name, row.phone_number)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-bold text-white"
                        >
                          Chat WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

export default DataTablePage
