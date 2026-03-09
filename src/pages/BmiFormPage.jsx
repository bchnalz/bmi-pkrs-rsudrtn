import { useEffect, useMemo, useRef, useState } from 'react'
import NumberInputWithStepper from '../components/NumberInputWithStepper'
import { CATEGORY_CONFIG, clamp, classifyBMI } from '../lib/bmi'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function BmiFormPage() {
  const [name, setName] = useState('')
  const [instansi, setInstansi] = useState('')
  const [number, setNumber] = useState('')
  const [gender, setGender] = useState('Laki-laki')
  const [weight, setWeight] = useState('60')
  const [height, setHeight] = useState('165')
  const [age, setAge] = useState('25')
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const [isResultVisible, setIsResultVisible] = useState(false)
  const [animatedBmi, setAnimatedBmi] = useState(0)
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' })
  const [isSaving, setIsSaving] = useState(false)
  const hideResultTimeoutRef = useRef(null)
  const bmiAnimationFrameRef = useRef(null)

  const bmiProgress = useMemo(() => {
    if (!result) return 0
    const minBmi = 12
    const maxBmi = 40
    return ((clamp(result.bmi, minBmi, maxBmi) - minBmi) / (maxBmi - minBmi)) * 100
  }, [result])

  const handleNumberChange = (rawValue) => {
    const digitsOnly = rawValue.replace(/\D/g, '')
    const normalizedLocal = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly
    const limitedNumber = normalizedLocal.slice(0, 12)
    setNumber(limitedNumber)
  }

  const smoothScrollToTop = () => {
    const startY = window.scrollY
    if (startY <= 0) return

    const duration = 500
    const startTime = performance.now()

    const step = (timestamp) => {
      const elapsed = timestamp - startTime
      const progress = clamp(elapsed / duration, 0, 1)
      const easedProgress = 1 - (1 - progress) * (1 - progress)
      const nextY = startY * (1 - easedProgress)

      window.scrollTo(0, nextY)

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        window.scrollTo(0, 0)
      }
    }

    requestAnimationFrame(step)
  }

  const validate = () => {
    const nextErrors = {}
    const weightNum = Number(weight)
    const heightNum = Number(height)
    const ageNum = Number(age)

    if (!name.trim()) {
      nextErrors.name = 'Nama wajib diisi.'
    }

    if (!instansi.trim()) {
      nextErrors.instansi = 'Instansi wajib diisi.'
    }

    const normalizedPhoneNumber = `62${number.trim()}`

    if (!number.trim()) {
      nextErrors.number = 'Nomor WhatsApp wajib diisi.'
    } else if (!/^62\d{8,12}$/.test(normalizedPhoneNumber)) {
      nextErrors.number = 'Nomor WhatsApp harus 8-12 digit setelah 62.'
    }

    if (!weight || Number.isNaN(weightNum)) {
      nextErrors.weight = 'Berat badan wajib diisi.'
    } else if (weightNum < 20 || weightNum > 300) {
      nextErrors.weight = 'Berat badan harus di antara 20-300 kg.'
    }

    if (!height || Number.isNaN(heightNum)) {
      nextErrors.height = 'Tinggi badan wajib diisi.'
    } else if (heightNum < 80 || heightNum > 250) {
      nextErrors.height = 'Tinggi badan harus di antara 80-250 cm.'
    }

    if (!age || Number.isNaN(ageNum)) {
      nextErrors.age = 'Usia wajib diisi.'
    } else if (ageNum < 5 || ageNum > 120) {
      nextErrors.age = 'Usia harus di antara 5-120 tahun.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitStatus({ type: '', message: '' })

    if (!validate()) return

    const weightNum = Number(weight)
    const heightInMeter = Number(height) / 100
    const bmi = weightNum / (heightInMeter * heightInMeter)
    const roundedBmi = Number(bmi.toFixed(1))
    const category = classifyBMI(roundedBmi)

    if (!isSupabaseConfigured || !supabase) {
      setSubmitStatus({
        type: 'error',
        message:
          'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY terlebih dahulu.',
      })
      return
    }

    setIsSaving(true)
    const payload = {
      name: name.trim(),
      instansi: instansi.trim(),
      phone_number: `62${number.trim()}`,
      gender,
      weight_kg: weightNum,
      height_cm: Number(height),
      age: Number(age),
      bmi: roundedBmi,
      category,
    }

    const { error } = await supabase.from('bmi_submissions').insert(payload)
    setIsSaving(false)

    if (error) {
      setSubmitStatus({
        type: 'error',
        message: `Gagal menyimpan data: ${error.message}`,
      })
      return
    }

    if (hideResultTimeoutRef.current) {
      clearTimeout(hideResultTimeoutRef.current)
      hideResultTimeoutRef.current = null
    }

    setResult({
      bmi: roundedBmi,
      category,
      gender,
      age: Number(age),
    })
    setAnimatedBmi(0)
    setSubmitStatus({ type: 'success', message: 'Data berhasil disimpan.' })
    setIsResultVisible(false)
    smoothScrollToTop()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsResultVisible(true))
    })
  }

  const resetCalculation = () => {
    setIsResultVisible(false)
    setAnimatedBmi(0)
    hideResultTimeoutRef.current = setTimeout(() => {
      setResult(null)
      hideResultTimeoutRef.current = null
    }, 400)
    setErrors({})
  }

  useEffect(() => {
    return () => {
      if (hideResultTimeoutRef.current) {
        clearTimeout(hideResultTimeoutRef.current)
      }
      if (bmiAnimationFrameRef.current) {
        cancelAnimationFrame(bmiAnimationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!result || !isResultVisible) return

    const target = result.bmi
    const duration = 700
    const start = performance.now()

    const animate = (timestamp) => {
      const elapsed = timestamp - start
      const progress = clamp(elapsed / duration, 0, 1)
      const easedProgress = 1 - (1 - progress) * (1 - progress)
      const value = Number((target * easedProgress).toFixed(1))
      setAnimatedBmi(value)

      if (progress < 1) {
        bmiAnimationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setAnimatedBmi(target)
        bmiAnimationFrameRef.current = null
      }
    }

    bmiAnimationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (bmiAnimationFrameRef.current) {
        cancelAnimationFrame(bmiAnimationFrameRef.current)
        bmiAnimationFrameRef.current = null
      }
    }
  }, [result, isResultVisible])

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-3 py-6 text-[#1A2E44]">
      <div className="mx-auto w-full max-w-[430px] space-y-4">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <img
              src="/pkrs-logo.png"
              alt="Logo PKRS RSUD RTN Sidoarjo"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div>
              <h1 className="text-2xl font-extrabold">Kalkulator BMI</h1>
              <p className="text-sm text-slate-500">Instalasi PKRS - RSUD RTN Sidoarjo</p>
            </div>
          </div>
        </header>

        {result ? (
          <section
            className={`overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all duration-400 ${
              isResultVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
            aria-hidden={!result}
          >
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-slate-500">Hasil BMI Anda</p>
                <p className={`text-5xl font-extrabold ${CATEGORY_CONFIG[result.category].colorClass}`}>
                  {animatedBmi.toFixed(1)}
                </p>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${CATEGORY_CONFIG[result.category].badgeClass}`}
                >
                  {result.category}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div className="w-[23.21%] bg-sky-400" />
                  <div className="w-[15.72%] bg-emerald-400" />
                  <div className="w-[16.08%] bg-amber-400" />
                  <div className="flex-1 bg-rose-400" />
                </div>
                <div className="relative h-4">
                  <div className="h-1 rounded-full bg-slate-200" />
                  <div
                    className="absolute top-0 h-1 rounded-full bg-[#1A2E44] transition-all duration-700"
                    style={{ width: `${bmiProgress}%` }}
                  />
                  <div
                    className="absolute -top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-[#1A2E44] shadow-sm transition-all duration-700"
                    style={{ left: `${bmiProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                  <span>Kurus &lt;18.5</span>
                  <span>Normal 18.5-22.9</span>
                  <span>Gemuk 23-27.4</span>
                  <span>Obesitas &ge;27.5</span>
                </div>
              </div>

              <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {CATEGORY_CONFIG[result.category].tip}
              </p>
              {submitStatus.type === 'success' && submitStatus.message ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                  {submitStatus.message}
                </p>
              ) : null}

              <button
                type="button"
                onClick={resetCalculation}
                className="min-h-12 w-full rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-[#1A2E44] active:scale-[0.99]"
              >
                Hitung Ulang
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold text-[#1A2E44]">
                Nama
              </label>
              <div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 w-full border-0 bg-transparent text-base font-semibold text-[#1A2E44] focus:outline-none"
                  placeholder="Masukkan nama"
                />
              </div>
              {errors.name ? <p className="text-xs text-rose-500">{errors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="instansi" className="block text-sm font-semibold text-[#1A2E44]">
                Instansi
              </label>
              <div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                <input
                  id="instansi"
                  type="text"
                  value={instansi}
                  onChange={(event) => setInstansi(event.target.value)}
                  className="h-12 w-full border-0 bg-transparent text-base font-semibold text-[#1A2E44] focus:outline-none"
                  placeholder="Masukkan instansi"
                />
              </div>
              {errors.instansi ? <p className="text-xs text-rose-500">{errors.instansi}</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="number" className="block text-sm font-semibold text-[#1A2E44]">
                Nomor WhatsApp
              </label>
              <div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                <span className="mr-2 text-base font-bold text-slate-500">62</span>
                <input
                  id="number"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={number}
                  onChange={(event) => handleNumberChange(event.target.value)}
                  className="h-12 w-full border-0 bg-transparent text-base font-semibold text-[#1A2E44] focus:outline-none"
                  placeholder="Contoh 8123456789"
                />
              </div>
              {errors.number ? <p className="text-xs text-rose-500">{errors.number}</p> : null}
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-semibold">Jenis Kelamin</span>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                {['Laki-laki', 'Perempuan'].map((option) => {
                  const active = gender === option
                  const activeClass =
                    option === 'Perempuan'
                      ? 'bg-pink-400 text-white shadow-sm'
                      : 'bg-[#4ECDC4] text-[#1A2E44] shadow-sm'
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGender(option)}
                      className={`min-h-12 rounded-xl px-3 text-sm font-bold transition ${
                        active ? activeClass : 'bg-transparent text-slate-600'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>

            <NumberInputWithStepper
              id="weight"
              label="Berat Badan"
              value={weight}
              onChange={setWeight}
              min={20}
              max={300}
              step={1}
              unit="kg"
              error={errors.weight}
            />

            <NumberInputWithStepper
              id="height"
              label="Tinggi Badan"
              value={height}
              onChange={setHeight}
              min={80}
              max={250}
              step={1}
              unit="cm"
              error={errors.height}
            />

            <div className="space-y-2">
              <label htmlFor="age" className="block text-sm font-semibold text-[#1A2E44]">
                Usia (tahun)
              </label>
              <div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                <input
                  id="age"
                  type="number"
                  min={5}
                  max={120}
                  inputMode="numeric"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className="h-12 w-full border-0 bg-transparent text-base font-semibold text-[#1A2E44] focus:outline-none"
                  placeholder="Masukkan usia"
                />
              </div>
              {errors.age ? <p className="text-xs text-rose-500">{errors.age}</p> : null}
            </div>

            {submitStatus.type === 'error' && submitStatus.message ? (
              <p
                className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
              >
                {submitStatus.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="min-h-12 w-full rounded-full bg-linear-to-r from-[#FF6B6B] to-[#ff8a65] px-4 text-base font-extrabold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? 'Menyimpan...' : 'Hitung BMI & Simpan'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-[#4ECDC4] p-5 text-[#12354d] shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-xl">
              🩺
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-extrabold">Ingin konsultasi gizi lebih lanjut?</h2>
              <p className="text-sm leading-relaxed">
                Kunjungi atau hubungi Instalasi Gizi RSUD RTN Sidoarjo untuk mendapatkan saran
                nutrisi yang tepat dari ahli gizi kami.
              </p>
              <a
                href="https://instagram.com/pkrs.rsudrtnotopurosda"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center rounded-full bg-white px-4 text-sm font-bold text-[#1A2E44] shadow-sm"
              >
                Instagram @pkrs.rsudrtnotopurosda
              </a>
            </div>
          </div>
        </section>

        <footer className="px-2 pb-2 text-center text-xs text-slate-500">
          <p className="font-semibold">© Instalasi PKRS RSUD RTN Sidoarjo</p>
          <p>Hasil BMI bersifat informatif. Konsultasikan kondisi Anda dengan tenaga medis.</p>
        </footer>
      </div>
    </main>
  )
}

export default BmiFormPage
