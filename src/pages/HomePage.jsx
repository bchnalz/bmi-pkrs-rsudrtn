import { Link } from 'react-router-dom'

const appMenus = [
  {
    name: 'Kalkulator BMI',
    description: 'Hitung BMI, lihat kategori, dan simpan data pengguna ke Supabase.',
    to: '/bmi',
    badge: 'Tersedia',
    accentClass: 'from-[#FF6B6B] to-[#ff8a65]',
    icon: '🩺',
  },
  {
    name: 'Estimasi Kalori Makanan',
    description: 'Upload atau ambil foto makanan untuk estimasi kalori dan makronutrien.',
    to: '/calorie-estimator',
    badge: 'Baru',
    accentClass: 'from-[#4ECDC4] to-[#45B7D1]',
    icon: '🍽️',
  },
]

function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F9FC] px-3 py-6 text-[#1A2E44]">
      <div className="mx-auto w-full max-w-[560px] space-y-4">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <img
              src="/pkrs-logo.png"
              alt="Logo PKRS RSUD RTN Sidoarjo"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div>
              <h1 className="text-2xl font-extrabold">Health Tools</h1>
              <p className="text-sm text-slate-500">Pilih menu aplikasi yang ingin digunakan.</p>
            </div>
          </div>
        </header>

        <section className="space-y-3">
          {appMenus.map((menu) => (
            <Link
              key={menu.to}
              to={menu.to}
              className="block rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                    {menu.icon}
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-extrabold">{menu.name}</h2>
                    <p className="text-sm text-slate-600">{menu.description}</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {menu.badge}
                </span>
              </div>
              <div className={`mt-3 h-1.5 rounded-full bg-linear-to-r ${menu.accentClass}`} />
            </Link>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm">
          Ruang ini disiapkan untuk aplikasi tambahan berikutnya. Tambahkan menu baru kapan pun saat
          fitur baru siap dirilis.
        </section>
      </div>
    </main>
  )
}

export default HomePage
