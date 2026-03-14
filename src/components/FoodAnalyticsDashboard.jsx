import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const ROWS_PER_PAGE = 20
const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]
const MEAL_TYPE_LABELS = {
  sarapan: 'Sarapan',
  'makan siang': 'Makan Siang',
  'makan malam': 'Makan Malam',
  snack: 'Snack',
}

function normalizeMealType(value) {
  const normalized = String(value || '').toLowerCase().trim()
  return MEAL_TYPE_LABELS[normalized] ?? value ?? '-'
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function startOfCurrentMonth() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID')
}

function formatDayLabel(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })
}

function compareValues(a, b, direction) {
  if (a < b) return direction === 'asc' ? -1 : 1
  if (a > b) return direction === 'asc' ? 1 : -1
  return 0
}

function buildLast30DaysSeries(rows) {
  const now = new Date()
  const dateMap = new Map()

  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - offset)
    const key = day.toISOString().slice(0, 10)
    dateMap.set(key, 0)
  }

  for (const row of rows) {
    const key = new Date(row.submitted_at).toISOString().slice(0, 10)
    if (dateMap.has(key)) {
      dateMap.set(key, dateMap.get(key) + 1)
    }
  }

  return Array.from(dateMap.entries()).map(([day, submissions]) => ({
    day,
    label: formatDayLabel(day),
    submissions,
  }))
}

function extractErrorMessage(error) {
  const message = String(error?.message || '')
  if (message.includes('source')) {
    return 'Kolom "source" belum tersedia, metrik AI vs cache ditampilkan sebagai N/A.'
  }
  return ''
}

function SortButton({ active, direction, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded px-1 font-semibold hover:bg-[var(--muted)]/70"
    >
      <span>{children}</span>
      {active ? <span className="text-[10px]">{direction === 'asc' ? '▲' : '▼'}</span> : null}
    </button>
  )
}

function FoodAnalyticsDashboard({ canFetch, supabase }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceAvailable, setSourceAvailable] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'submitted_at', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const loadData = async () => {
      if (!canFetch || !supabase) {
        setError('Supabase belum dikonfigurasi.')
        setLoading(false)
        return
      }

      const pageSize = 1000
      let from = 0
      let allRows = []
      let includeSource = true

      while (true) {
        const selectFields = includeSource
          ? 'id,food_item_id,food_name,estimated_grams,total_calories,total_carbs,total_protein,total_fat,ai_confidence,was_corrected,meal_type,submitted_at,source'
          : 'id,food_item_id,food_name,estimated_grams,total_calories,total_carbs,total_protein,total_fat,ai_confidence,was_corrected,meal_type,submitted_at'

        const { data, error: queryError } = await supabase
          .from('food_logs')
          .select(selectFields)
          .order('submitted_at', { ascending: false })
          .range(from, from + pageSize - 1)

        if (queryError) {
          if (includeSource && String(queryError.message).toLowerCase().includes('source')) {
            includeSource = false
            from = 0
            allRows = []
            continue
          }
          setError(`Gagal memuat data food logs: ${queryError.message}`)
          setLoading(false)
          return
        }

        const batch = data ?? []
        allRows = allRows.concat(batch)
        if (batch.length < pageSize) break
        from += pageSize
      }

      setRows(allRows)
      setSourceAvailable(includeSource)
      setError(includeSource ? '' : 'Kolom source belum tersedia, AI vs cache ditandai N/A.')
      setLoading(false)
    }

    loadData()
  }, [canFetch, supabase])

  const thisMonthRows = useMemo(() => {
    const start = startOfCurrentMonth().getTime()
    return rows.filter((row) => new Date(row.submitted_at).getTime() >= start)
  }, [rows])

  const overview = useMemo(() => {
    const totalSubmissions = thisMonthRows.length
    const totalCalories = thisMonthRows.reduce((acc, row) => acc + toNumber(row.total_calories), 0)
    const averageCalories = totalSubmissions > 0 ? totalCalories / totalSubmissions : 0

    const foodCountMap = new Map()
    for (const row of thisMonthRows) {
      const key = String(row.food_name || '-')
      foodCountMap.set(key, (foodCountMap.get(key) ?? 0) + 1)
    }

    const mostLoggedFood = Array.from(foodCountMap.entries()).sort((a, b) => b[1] - a[1])[0] ?? null

    let aiCalls = null
    let cacheHits = null
    if (sourceAvailable) {
      aiCalls = thisMonthRows.filter((row) => {
        const source = String(row.source || '').toLowerCase()
        return source === 'openai' || source === 'ai'
      }).length
      cacheHits = thisMonthRows.filter((row) => String(row.source || '').toLowerCase() === 'database').length
    }

    return {
      totalSubmissions,
      mostLoggedFood,
      averageCalories,
      aiCalls,
      cacheHits,
    }
  }, [sourceAvailable, thisMonthRows])

  const topFoodsData = useMemo(() => {
    const map = new Map()
    for (const row of thisMonthRows) {
      const name = String(row.food_name || '-')
      map.set(name, (map.get(name) ?? 0) + 1)
    }

    return Array.from(map.entries())
      .map(([food, count]) => ({ food, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .reverse()
  }, [thisMonthRows])

  const submissionsTrendData = useMemo(() => buildLast30DaysSeries(rows), [rows])

  const mealDistributionData = useMemo(() => {
    const map = new Map()
    for (const row of thisMonthRows) {
      const label = normalizeMealType(row.meal_type)
      map.set(label, (map.get(label) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [thisMonthRows])

  const caloriesPerMealTypeData = useMemo(() => {
    const map = new Map()
    for (const row of thisMonthRows) {
      const label = normalizeMealType(row.meal_type)
      const existing = map.get(label) ?? { totalCalories: 0, count: 0 }
      existing.totalCalories += toNumber(row.total_calories)
      existing.count += 1
      map.set(label, existing)
    }

    return Array.from(map.entries()).map(([mealType, stats]) => ({
      mealType,
      averageCalories: stats.count > 0 ? Number((stats.totalCalories / stats.count).toFixed(1)) : 0,
    }))
  }, [thisMonthRows])

  const sortedRows = useMemo(() => {
    const sorted = [...rows]
    sorted.sort((a, b) => {
      if (sortConfig.key === 'submitted_at') {
        return compareValues(
          new Date(a.submitted_at).getTime(),
          new Date(b.submitted_at).getTime(),
          sortConfig.direction,
        )
      }
      if (sortConfig.key === 'food_name' || sortConfig.key === 'meal_type') {
        return compareValues(
          String(a[sortConfig.key] || '').toLowerCase(),
          String(b[sortConfig.key] || '').toLowerCase(),
          sortConfig.direction,
        )
      }
      if (sortConfig.key === 'was_corrected') {
        return compareValues(Boolean(a.was_corrected), Boolean(b.was_corrected), sortConfig.direction)
      }
      return compareValues(toNumber(a[sortConfig.key]), toNumber(b[sortConfig.key]), sortConfig.direction)
    })
    return sorted
  }, [rows, sortConfig])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / ROWS_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (activePage - 1) * ROWS_PER_PAGE
    return sortedRows.slice(start, start + ROWS_PER_PAGE)
  }, [activePage, sortedRows])

  const handleSort = (key) => {
    setSortConfig((previous) => {
      if (previous.key === key) {
        return { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'desc' }
    })
  }

  if (loading) {
    return (
      <section className="rounded-xl bg-[var(--card)] p-5 ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]">
        <p className="text-sm text-[var(--muted-foreground)]">Memuat analytics makanan...</p>
      </section>
    )
  }

  return (
    <section className="space-y-6 rounded-xl bg-[var(--card)] p-5 ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]">
      <header>
        <h2 className="text-2xl font-semibold">Dashboard Estimasi Makanan</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Ringkasan bulan berjalan dan tren 30 hari terakhir</p>
      </header>

      {error ? (
        <p className="rounded-xl bg-[var(--warning-surface)] p-3 text-sm text-[var(--warning-foreground)]">
          {extractErrorMessage({ message: error }) || error}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Total submissions (bulan ini)</p>
          <p className="mt-2 text-3xl font-extrabold">{overview.totalSubmissions}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Most logged food</p>
          <p className="mt-2 text-lg font-extrabold">{overview.mostLoggedFood?.[0] || '-'}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{overview.mostLoggedFood?.[1] ?? 0} kali</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">Avg calories / submission</p>
          <p className="mt-2 text-3xl font-extrabold">{overview.averageCalories.toFixed(1)}</p>
          <p className="text-xs text-[var(--muted-foreground)]">kkal</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">AI calls vs DB cache hits</p>
          <p className="mt-2 text-2xl font-extrabold">
            {overview.aiCalls !== null ? `${overview.aiCalls} : ${overview.cacheHits}` : 'N/A'}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">Bulan ini</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <h3 className="text-sm font-bold">Top 10 makanan terpopuler bulan ini</h3>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFoodsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="food" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-4">
          <h3 className="text-sm font-bold">Tren submission per hari (30 hari terakhir)</h3>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={submissionsTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="submissions" stroke="var(--chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-4">
          <h3 className="text-sm font-bold">Distribusi meal type</h3>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mealDistributionData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {mealDistributionData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-4">
          <h3 className="text-sm font-bold">Rata-rata kalori per meal type</h3>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caloriesPerMealTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mealType" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="averageCalories" fill="var(--chart-4)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
        <h3 className="text-sm font-bold">Recent submissions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                <th className="px-3 py-3">
                  <SortButton
                    active={sortConfig.key === 'submitted_at'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('submitted_at')}
                  >
                    Waktu
                  </SortButton>
                </th>
                <th className="px-3 py-3">
                  <SortButton
                    active={sortConfig.key === 'food_name'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('food_name')}
                  >
                    Nama Makanan
                  </SortButton>
                </th>
                <th className="px-3 py-3">
                  <SortButton
                    active={sortConfig.key === 'estimated_grams'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('estimated_grams')}
                  >
                    Gram
                  </SortButton>
                </th>
                <th className="px-3 py-3">
                  <SortButton
                    active={sortConfig.key === 'total_calories'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('total_calories')}
                  >
                    Kalori
                  </SortButton>
                </th>
                <th className="px-3 py-3">
                  <SortButton
                    active={sortConfig.key === 'meal_type'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('meal_type')}
                  >
                    Meal Type
                  </SortButton>
                </th>
                <th className="px-3 py-3">
                  <SortButton
                    active={sortConfig.key === 'was_corrected'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('was_corrected')}
                  >
                    Dikoreksi User?
                  </SortButton>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(row.submitted_at)}</td>
                  <td className="px-3 py-3 font-semibold">{row.food_name || '-'}</td>
                  <td className="px-3 py-3">{toNumber(row.estimated_grams).toFixed(1)}</td>
                  <td className="px-3 py-3">{Math.round(toNumber(row.total_calories))}</td>
                  <td className="px-3 py-3">{normalizeMealType(row.meal_type)}</td>
                  <td className="px-3 py-3">{row.was_corrected ? 'Ya' : 'Tidak'}</td>
                </tr>
              ))}
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[var(--muted-foreground)]">
                    Belum ada submission makanan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--muted-foreground)]">
            Halaman {activePage} dari {totalPages} - {ROWS_PER_PAGE} baris per halaman
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={activePage === 1}
              className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--muted)]/40 disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
              disabled={activePage === totalPages}
              className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--muted)]/40 disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FoodAnalyticsDashboard
