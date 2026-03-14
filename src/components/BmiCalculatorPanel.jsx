import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import NumberInputWithStepper from './NumberInputWithStepper'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { CATEGORY_CONFIG, clamp, classifyBMI } from '../lib/bmi'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function BmiCalculatorPanel({ embedded = false }) {
  const genderOptions = [
    { label: 'Pria', value: 'Pria', submitValue: 'Laki-laki' },
    { label: 'Wanita', value: 'Wanita', submitValue: 'Perempuan' },
  ]
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [gender, setGender] = useState('Pria')
  const [weight, setWeight] = useState('60')
  const [height, setHeight] = useState('165')
  const [age, setAge] = useState('25')
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const [isResultVisible, setIsResultVisible] = useState(false)
  const [animatedBmi, setAnimatedBmi] = useState(0)
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' })
  const [isSaving, setIsSaving] = useState(false)
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

  const handleLimitedDigitNumberChange = (setter, maxDigits) => (rawValue) => {
    const digitsOnly = rawValue.replace(/\D/g, '')
    setter(digitsOnly.slice(0, maxDigits))
  }

  const handleAutoSelectInput = (event) => {
    event.target.select()
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
    } else if (ageNum < 5 || ageNum > 99) {
      nextErrors.age = 'Usia harus di antara 5-99 tahun.'
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
        message: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY terlebih dahulu.',
      })
      return
    }

    setIsSaving(true)
    const selectedGenderOption = genderOptions.find((option) => option.value === gender)
    const payload = {
      name: name.trim(),
      instansi: '-',
      phone_number: `62${number.trim()}`,
      gender: selectedGenderOption?.submitValue ?? gender,
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

    setResult({
      bmi: roundedBmi,
      category,
      gender,
      age: Number(age),
    })
    setAnimatedBmi(0)
    setSubmitStatus({ type: '', message: '' })
    setIsResultVisible(false)

    if (!embedded) {
      smoothScrollToTop()
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsResultVisible(true))
    })
  }

  useEffect(() => {
    return () => {
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
    <div className={embedded ? 'w-full space-y-4' : 'mx-auto w-full max-w-xl space-y-6'}>
      {!embedded && (
        <Card className="ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]">
          <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/pkrs-logo.png"
                alt="Logo PKRS RSUD RTN Sidoarjo"
                className="h-14 w-14 rounded-lg bg-transparent object-cover"
              />
              <div>
                <h1 className="text-2xl font-semibold">Kalkulator BMI</h1>
                <p className="text-sm text-[var(--muted-foreground)]">Instalasi PKRS - RSUD RTN Sidoarjo</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/">Menu</Link>
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      {result ? (
        <div
          className={`space-y-4 transition-all duration-300 ${
            isResultVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
          aria-hidden={!result}
        >
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)]">Hasil BMI Anda</p>
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
              <div className="h-1 rounded-full bg-[var(--muted)]" />
              <div
                className="absolute top-0 h-1 rounded-full bg-[var(--primary)] transition-all duration-700"
                style={{ width: `${bmiProgress}%` }}
              />
              <div
                className="absolute -top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[var(--background)] bg-[var(--primary)] shadow-sm transition-all duration-700"
                style={{ left: `${bmiProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-medium text-[var(--muted-foreground)]">
              <span>Kurus &lt;18.5</span>
              <span>Normal 18.5-22.9</span>
              <span>Gemuk 23-27.4</span>
              <span>Obesitas &ge;27.5</span>
            </div>
          </div>

          <p className="rounded-lg bg-[var(--muted)]/50 p-3 text-sm leading-relaxed text-[var(--foreground)]/90">
            {CATEGORY_CONFIG[result.category].tip}
          </p>
        </div>
      ) : null}

      <form className={embedded ? 'space-y-4' : 'space-y-4 rounded-xl border bg-[var(--card)] p-5 ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]'} onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="block text-center">Jenis Kelamin</Label>
              <div className="relative grid grid-cols-2 rounded-xl border border-white/35 bg-[color:color-mix(in_oklab,var(--card)_72%,transparent)] p-1 shadow-inner backdrop-blur-md">
                <motion.span
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg shadow-sm ${
                    gender === 'Pria' ? 'border-sky-200/80 bg-sky-100/80' : 'border-pink-200/80 bg-pink-100/80'
                  }`}
                  animate={{
                    x: gender === 'Pria' ? '0%' : '100%',
                    scaleX: [1, 1.12, 0.98, 1],
                    scaleY: [1, 0.9, 1.06, 1],
                  }}
                  transition={{
                    x: { type: 'spring', stiffness: 420, damping: 30, mass: 0.9 },
                    scaleX: { duration: 0.32, ease: 'easeOut' },
                    scaleY: { duration: 0.32, ease: 'easeOut' },
                  }}
                />
                {genderOptions.map((option) => {
                  const active = gender === option.value
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="ghost"
                      onClick={() => setGender(option.value)}
                      className={`relative z-10 h-10 rounded-lg px-3 text-sm font-semibold transition-all duration-300 ${
                        active
                          ? option.value === 'Pria'
                            ? 'scale-105 text-sky-800'
                            : 'scale-105 text-pink-800'
                          : option.value === 'Wanita'
                            ? 'scale-100 text-pink-400'
                            : 'scale-100 text-[color:color-mix(in_oklab,var(--muted-foreground)_92%,transparent)]'
                      }`}
                      aria-label={option.label}
                    >
                      <motion.span
                        animate={{ scale: active ? [1, 1.08, 1] : 1 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                      >
                        {option.label}
                      </motion.span>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="block text-center">
                Nama
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 text-center text-base font-medium md:text-sm"
                placeholder="Masukkan nama"
              />
              {errors.name ? <p className="text-xs text-rose-500">{errors.name}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-[1.5fr_0.75fr_0.75fr] gap-3">
            <NumberInputWithStepper
              id="age"
              label="Usia"
              value={age}
              onChange={handleLimitedDigitNumberChange(setAge, 2)}
              min={5}
              max={99}
              step={1}
              error={errors.age}
            />

            <div className="space-y-2">
              <Label htmlFor="weight" className="block text-center">
                BB (kg)
              </Label>
              <div className="flex min-h-12 items-center rounded-xl border border-[color:color-mix(in_oklab,var(--foreground)_22%,transparent)] bg-[var(--card)] px-3">
                <Input
                  id="weight"
                  type="number"
                  min={20}
                  max={300}
                  inputMode="numeric"
                  value={weight}
                  onChange={(event) => handleLimitedDigitNumberChange(setWeight, 3)(event.target.value)}
                  onFocus={handleAutoSelectInput}
                  onClick={handleAutoSelectInput}
                  className="no-spinner h-12 border-0 bg-transparent px-1 text-center text-base font-medium md:text-sm"
                  placeholder="BB (kg)"
                />
              </div>
              {errors.weight ? <p className="text-xs text-rose-500">{errors.weight}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="height" className="block text-center">
                TB (cm)
              </Label>
              <div className="flex min-h-12 items-center rounded-xl border border-[color:color-mix(in_oklab,var(--foreground)_22%,transparent)] bg-[var(--card)] px-3">
                <Input
                  id="height"
                  type="number"
                  min={80}
                  max={250}
                  inputMode="numeric"
                  value={height}
                  onChange={(event) => handleLimitedDigitNumberChange(setHeight, 3)(event.target.value)}
                  onFocus={handleAutoSelectInput}
                  onClick={handleAutoSelectInput}
                  className="no-spinner h-12 border-0 bg-transparent px-1 text-center text-base font-medium md:text-sm"
                  placeholder="TB (cm)"
                />
              </div>
              {errors.height ? <p className="text-xs text-rose-500">{errors.height}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="number" className="block text-center">
              Nomor WhatsApp
              <span className="mt-1 block text-[11px] italic font-normal text-[var(--muted-foreground)]">
                (Untuk kami berikan informasi kesehatan di kemudian hari)
              </span>
            </Label>
            <div className="flex min-h-12 items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]">
              <span className="mr-2 text-base font-semibold text-[var(--muted-foreground)]">62</span>
              <Input
                id="number"
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={number}
                onChange={(event) => handleNumberChange(event.target.value)}
                className="h-12 border-0 bg-transparent text-base font-medium md:text-sm"
                placeholder="Contoh 8123456789"
              />
            </div>
            {errors.number ? <p className="text-xs text-rose-500">{errors.number}</p> : null}
          </div>

          {submitStatus.type === 'error' && submitStatus.message ? (
            <p className="rounded-lg bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger-foreground)]">
              {submitStatus.message}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSaving}
            className="min-h-12 w-full text-base md:text-sm"
          >
            {isSaving ? 'Menyimpan...' : 'Hitung BMI & Simpan'}
          </Button>
      </form>

      {!embedded && (
        <>
          <Card className="bg-[var(--accent)] text-[var(--accent-foreground)] ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]">
            <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--card)]/80 text-xl">
                🩺
              </div>
              <div className="space-y-2">
                <h2 className="text-base font-extrabold">Ingin konsultasi gizi lebih lanjut?</h2>
                <p className="text-sm leading-relaxed">
                  Kunjungi atau hubungi Instalasi Gizi RSUD RTN Sidoarjo untuk mendapatkan saran nutrisi yang tepat
                  dari ahli gizi kami.
                </p>
                <Button asChild variant="secondary" className="min-h-12 text-sm font-semibold text-[var(--card-foreground)]">
                  <a href="https://instagram.com/pkrs.rsudrtnotopurosda" target="_blank" rel="noreferrer">
                    Instagram @pkrs.rsudrtnotopurosda
                  </a>
                </Button>
              </div>
            </div>
            </CardContent>
          </Card>

          <footer className="px-2 pb-2 text-center text-xs text-[var(--muted-foreground)]">
            <p className="font-medium">© Instalasi PKRS RSUD RTN Sidoarjo</p>
            <p>Hasil BMI bersifat informatif. Konsultasikan kondisi Anda dengan tenaga medis.</p>
          </footer>
        </>
      )}
    </div>
  )
}

export default BmiCalculatorPanel
