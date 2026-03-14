import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Label } from './ui/label'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MEAL_TYPE_OPTIONS = ['Sarapan', 'Makan Siang', 'Makan Malam', 'Snack']

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const base64Content = result.includes(',') ? result.split(',')[1] : ''
      if (!base64Content) {
        reject(new Error('Gagal memproses file gambar.'))
        return
      }
      resolve(base64Content)
    }
    reader.onerror = () => reject(new Error('Tidak bisa membaca file gambar.'))
    reader.readAsDataURL(file)
  })
}

function formatMacro(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return `${value.toFixed(1)} g`
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeFoodsForSubmit(foods) {
  return (Array.isArray(foods) ? foods : []).map((food) => ({
    name: food.name || '',
    name_local: food.name_local || food.name || '',
    estimated_grams: toNumber(food.estimated_grams),
    total_calories: toNumber(food.total_calories ?? food.calories),
    carbs_g: toNumber(food.carbs_g),
    protein_g: toNumber(food.protein_g),
    fat_g: toNumber(food.fat_g),
    confidence: toNumber(food.confidence),
  }))
}

function computeTotal(foods) {
  return foods.reduce(
    (acc, item) => {
      acc.calories += toNumber(item.total_calories)
      acc.carbs_g += toNumber(item.carbs_g)
      acc.protein_g += toNumber(item.protein_g)
      acc.fat_g += toNumber(item.fat_g)
      return acc
    },
    { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
  )
}

function getEstimatorApiUrl() {
  if (typeof window === 'undefined') return '/api/food-estimator'

  try {
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return new URL('/api/food-estimator', window.location.origin).toString()
    }
  } catch {
    return '/api/food-estimator'
  }

  return '/api/food-estimator'
}

function toReadableRequestError(message) {
  const normalized = String(message || '').toLowerCase()
  if (normalized.includes('expected pattern') || normalized.includes('load failed')) {
    return 'Koneksi ke server gagal. Buka aplikasi dari domain HTTPS yang valid lalu coba lagi.'
  }
  if (normalized.includes('respons non-json') || normalized.includes('respons tidak valid')) {
    return 'Endpoint API tidak mengembalikan JSON. Pastikan server API aktif (Vercel atau Vite dev server terbaru).'
  }
  return message || 'Terjadi kesalahan saat memproses gambar.'
}

function CalorieEstimatorPanel({ embedded = false }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [editableFoods, setEditableFoods] = useState([])
  const [mealType, setMealType] = useState(MEAL_TYPE_OPTIONS[0])
  const [wasCorrected, setWasCorrected] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const galleryInputRef = useRef(null)
  const cameraCaptureInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [previewUrl])

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOpen(false)
  }

  const openNativeCameraCapture = () => {
    cameraCaptureInputRef.current?.click()
  }

  const openGalleryPicker = () => {
    galleryInputRef.current?.click()
  }

  const startCamera = async () => {
    setError('')
    setAnalysisResult(null)
    setIsCameraLoading(true)

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        stopCamera()
        openNativeCameraCapture()
        return
      }

      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })

      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsCameraOpen(true)
    } catch (cameraError) {
      setError(cameraError.message || 'Gagal membuka kamera.')
    } finally {
      setIsCameraLoading(false)
    }
  }

  const captureFromCamera = async () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Kamera belum siap. Coba beberapa detik lagi.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')

    if (!context) {
      setError('Gagal mengambil foto dari kamera.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => {
      canvas.toBlob((generatedBlob) => resolve(generatedBlob), 'image/jpeg', 0.9)
    })

    if (!blob) {
      setError('Gagal mengambil gambar.')
      return
    }

    if (blob.size > MAX_FILE_SIZE_BYTES) {
      setError('Foto dari kamera terlalu besar. Coba ambil ulang dari jarak lebih jauh.')
      return
    }

    const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    })

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedImage(capturedFile)
    setPreviewUrl(URL.createObjectURL(capturedFile))
    setAnalysisResult(null)
    setEditableFoods([])
    setWasCorrected(false)
    setError('')
    stopCamera()
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    setError('')
    setAnalysisResult(null)
    setEditableFoods([])
    setWasCorrected(false)

    if (!file) {
      setSelectedImage(null)
      setPreviewUrl('')
      stopCamera()
      return
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setSelectedImage(null)
      setPreviewUrl('')
      setError('Format gambar belum didukung. Gunakan JPG, PNG, WEBP, HEIC, atau HEIF.')
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedImage(null)
      setPreviewUrl('')
      setError('Ukuran file maksimal 5MB.')
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    stopCamera()
  }

  const handleEstimate = async (event) => {
    event.preventDefault()
    setError('')
    setAnalysisResult(null)
    setEditableFoods([])
    setWasCorrected(false)

    if (!selectedImage) {
      setError('Pilih foto makanan terlebih dahulu.')
      return
    }

    try {
      setIsLoading(true)
      const base64Image = await fileToBase64(selectedImage)
      const estimatorApiUrl = getEstimatorApiUrl()

      const response = await fetch(estimatorApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: selectedImage.type,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.toLowerCase().includes('application/json')) {
        const nonJsonBody = await response.text()
        const details = nonJsonBody ? ` (${nonJsonBody.slice(0, 120)})` : ''
        throw new Error(`Server mengembalikan respons non-JSON${details}`)
      }

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Gagal mendapatkan estimasi kalori.')
      }

      const normalizedFoods = normalizeFoodsForSubmit(payload.foods)
      setAnalysisResult(payload)
      setEditableFoods(normalizedFoods)

      setIsSubmitting(true)
      const submitResponse = await fetch(getEstimatorApiUrl().replace('/food-estimator', '/food-log-submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType,
          foods: normalizedFoods,
          notes: payload.notes || '',
          source: payload.source || 'openai',
          wasCorrected: false,
        }),
      })

      const submitContentType = submitResponse.headers.get('content-type') || ''
      if (!submitContentType.toLowerCase().includes('application/json')) {
        throw new Error('Server mengembalikan respons tidak valid saat submit.')
      }

      const submitPayload = await submitResponse.json()
      if (!submitResponse.ok) {
        throw new Error(submitPayload?.error || 'Gagal menyimpan food log.')
      }

    } catch (requestError) {
      setError(toReadableRequestError(requestError.message))
    } finally {
      setIsLoading(false)
      setIsSubmitting(false)
    }
  }

  const displayFoods = editableFoods.length > 0 ? editableFoods : normalizeFoodsForSubmit(analysisResult?.foods)
  const displayTotal = computeTotal(displayFoods)

  return (
    <div className={embedded ? 'w-full space-y-4' : 'mx-auto w-full max-w-4xl space-y-6'}>
      {analysisResult ? (
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-semibold">Hasil Analisis</h2>
          <div className="rounded-xl bg-[var(--muted)]/60 p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Perkiraan kalori total</p>
            <p className="text-4xl font-extrabold text-[var(--foreground)]">{Math.round(displayTotal.calories)} kkal</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Sumber data: {analysisResult.source || 'openai'} | Confidence: {analysisResult.confidence}
              {typeof analysisResult.confidence_score === 'number'
                ? ` (${(analysisResult.confidence_score * 100).toFixed(0)}%)`
                : ''}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 p-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Karbohidrat</p>
              <p className="mt-1 text-lg font-extrabold text-[var(--foreground)]">{formatMacro(displayTotal.carbs_g)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 p-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Protein</p>
              <p className="mt-1 text-lg font-extrabold text-[var(--foreground)]">{formatMacro(displayTotal.protein_g)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 p-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Lemak</p>
              <p className="mt-1 text-lg font-extrabold text-[var(--foreground)]">{formatMacro(displayTotal.fat_g)}</p>
            </div>
          </div>
          {analysisResult.foodName ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Prediksi makanan utama: <span className="font-semibold">{analysisResult.foodName}</span>
            </p>
          ) : null}
          {analysisResult.notes ? (
            <p className="rounded-lg bg-[var(--muted)]/60 p-3 text-xs text-[var(--muted-foreground)]">
              {analysisResult.notes}
            </p>
          ) : null}
          <p className="text-xs text-[var(--muted-foreground)]">
            Hasil bersifat estimasi berbasis AI, bukan pengganti penilaian ahli gizi.
          </p>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleEstimate}>
        <input
          ref={cameraCaptureInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          onChange={handleImageChange}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          onChange={handleImageChange}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={openGalleryPicker}
              className="h-14 w-14 rounded-full"
              aria-label="Buka galeri"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="8.5" cy="9" r="1.5" />
                <path d="M21 15l-5-5L5 20" />
              </svg>
            </Button>
            <p className="text-center text-xs text-[var(--muted-foreground)]">Maksimal 5MB.</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={startCamera}
              disabled={isCameraLoading}
              className="h-14 w-14 rounded-full"
              aria-label="Buka kamera"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 7h4l2-2h4l2 2h4v12H4z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </Button>
            <p className="text-center text-xs text-[var(--muted-foreground)]">Buka Kamera</p>
            {isCameraLoading ? <p className="text-center text-xs text-[var(--muted-foreground)]">Membuka kamera...</p> : null}
            {isCameraOpen ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  onClick={captureFromCamera}
                  size="sm"
                >
                  Ambil Foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                >
                  Tutup Kamera
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {isCameraOpen ? (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
          </div>
        ) : null}

        {previewUrl ? (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]/50">
            <img src={previewUrl} alt="Preview makanan" className="h-64 w-full object-cover" />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger-foreground)]">{error}</p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="meal-type" className="block text-center">
            Tipe Makanan
          </Label>
          <div className="relative grid grid-cols-2 gap-1 rounded-xl border border-white/35 bg-[color:color-mix(in_oklab,var(--card)_72%,transparent)] p-1 shadow-inner backdrop-blur-md sm:grid-cols-4">
            {MEAL_TYPE_OPTIONS.map((option) => {
              const active = mealType === option
              return (
                <Button
                  key={option}
                  id={option === MEAL_TYPE_OPTIONS[0] ? 'meal-type' : undefined}
                  type="button"
                  variant="ghost"
                  onClick={() => setMealType(option)}
                  className={`relative h-10 rounded-lg px-3 text-xs font-semibold sm:text-sm ${
                    active ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="meal-type-active-pill"
                      className="absolute inset-0 rounded-lg bg-[var(--primary)]/12 ring-1 ring-[var(--primary)]/30"
                      transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.9 }}
                    />
                  ) : null}
                  <span className="relative z-10">{option}</span>
                </Button>
              )
            })}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || isSubmitting}
          className="min-h-12 w-full"
        >
          {isLoading ? 'Menganalisis gambar...' : isSubmitting ? 'Menyimpan hasil...' : 'Analisis'}
        </Button>
      </form>

      {isLoading ? (
        <Card className="border-[var(--info)]/35 bg-[var(--info-surface)] ring-1 ring-[var(--info)]/20">
          <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <span className="absolute inset-0 rounded-full border-4 border-[var(--info)]/20" />
              <span className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--info)] border-t-transparent" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[var(--info-foreground)]">Sedang menganalisis foto makanan...</p>
              <p className="text-xs text-[var(--info-foreground)]/85">
                AI sedang mengenali item makanan dan menghitung estimasi kalori serta makro.
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--info)]/15">
            <div className="h-full w-1/3 animate-[pulse_1200ms_ease-in-out_infinite] rounded-full bg-[var(--info)]" />
          </div>
          </CardContent>
        </Card>
      ) : null}

    </div>
  )
}

export default CalorieEstimatorPanel
