import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]
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

function normalizeFoodsForForm(foods) {
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

function CalorieEstimatorPage() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [editableFoods, setEditableFoods] = useState([])
  const [mealType, setMealType] = useState(MEAL_TYPE_OPTIONS[0])
  const [wasCorrected, setWasCorrected] = useState(false)
  const [nameQuery, setNameQuery] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const cameraCaptureInputRef = useRef(null)

  const acceptedTypesText = useMemo(() => ACCEPTED_IMAGE_TYPES.join(', '), [])

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

  const startCamera = async () => {
    setError('')
    setAnalysisResult(null)
    setSubmitSuccess(null)
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
    setSubmitSuccess(null)
    setEditableFoods([])
    setWasCorrected(false)
    setError('')
    stopCamera()
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    setError('')
    setAnalysisResult(null)
    setSubmitSuccess(null)
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
    setSubmitSuccess(null)
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
          nameQuery,
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

      setAnalysisResult(payload)
      setEditableFoods(normalizeFoodsForForm(payload.foods))
    } catch (requestError) {
      setError(toReadableRequestError(requestError.message))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFoodFieldChange = (index, field, nextValue) => {
    setEditableFoods((previous) =>
      previous.map((food, foodIndex) =>
        foodIndex === index
          ? {
              ...food,
              [field]:
                field === 'name' || field === 'name_local' ? nextValue : Math.max(0, toNumber(nextValue)),
            }
          : food,
      ),
    )
    setWasCorrected(true)
  }

  const handleSubmitReview = async () => {
    if (!analysisResult || editableFoods.length === 0) {
      setError('Belum ada hasil analisis yang bisa disubmit.')
      return
    }

    try {
      setError('')
      setIsSubmitting(true)
      const response = await fetch(getEstimatorApiUrl().replace('/food-estimator', '/food-log-submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType,
          foods: editableFoods,
          notes: analysisResult.notes || '',
          source: analysisResult.source || 'openai',
          wasCorrected,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error('Server mengembalikan respons tidak valid saat submit.')
      }

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Gagal menyimpan food log.')
      }

      setSubmitSuccess(payload)
    } catch (submitError) {
      setError(toReadableRequestError(submitError.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayFoods = editableFoods.length > 0 ? editableFoods : normalizeFoodsForForm(analysisResult?.foods)
  const displayTotal = computeTotal(displayFoods)

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-3 py-6 text-[#1A2E44]">
      <div className="mx-auto w-full max-w-[560px] space-y-4">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">Estimasi Kalori Makanan</h1>
              <p className="text-sm text-slate-500">
                Upload/capture foto, review hasil AI, koreksi bila perlu, lalu submit ke log.
              </p>
            </div>
            <Link to="/" className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold">
              Kembali ke Menu
            </Link>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <form className="space-y-4" onSubmit={handleEstimate}>
            <div className="space-y-2">
              <label htmlFor="food-image" className="block text-sm font-semibold">
                Foto makanan
              </label>
              <input
                ref={cameraCaptureInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                capture="environment"
                onChange={handleImageChange}
                className="hidden"
              />
              <input
                id="food-image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                capture="environment"
                onChange={handleImageChange}
                className="block w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm"
              />
              <p className="text-xs text-slate-500">Format: {acceptedTypesText}. Maksimal 5MB.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="name-query" className="block text-sm font-semibold">
                Nama makanan (opsional, untuk pencarian database lebih dulu)
              </label>
              <input
                id="name-query"
                type="text"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                placeholder="Contoh: nasi goreng ayam"
              />
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold">Atau gunakan kamera</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isCameraLoading}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCameraLoading ? 'Membuka kamera...' : 'Buka Kamera'}
                </button>
                {isCameraOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={captureFromCamera}
                      className="rounded-full bg-[#1A2E44] px-4 py-2 text-xs font-bold text-white"
                    >
                      Ambil Foto
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold"
                    >
                      Tutup Kamera
                    </button>
                  </>
                ) : null}
              </div>

              {isCameraOpen ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
                </div>
              ) : null}
            </div>

            {previewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img src={previewUrl} alt="Preview makanan" className="h-64 w-full object-cover" />
              </div>
            ) : null}

            {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

            <button
              type="submit"
              disabled={isLoading}
              className="min-h-12 w-full rounded-full bg-linear-to-r from-[#4ECDC4] to-[#45B7D1] px-4 text-sm font-extrabold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Menganalisis gambar...' : 'Analisis'}
            </button>
          </form>
        </section>

        {isLoading ? (
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <span className="absolute inset-0 rounded-full border-4 border-sky-200" />
                <span className="absolute inset-0 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-sky-900">Sedang menganalisis foto makanan...</p>
                <p className="text-xs text-sky-700">
                  AI sedang mengenali item makanan dan menghitung estimasi kalori serta makro.
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-sky-100">
              <div className="h-full w-1/3 animate-[pulse_1200ms_ease-in-out_infinite] rounded-full bg-sky-500" />
            </div>
          </section>
        ) : null}

        {analysisResult ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <h2 className="text-lg font-extrabold">Review & Koreksi Hasil</h2>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Perkiraan kalori total</p>
                <p className="text-4xl font-extrabold text-[#1A2E44]">{Math.round(displayTotal.calories)} kkal</p>
                <p className="mt-1 text-xs text-slate-500">
                  Sumber data: {analysisResult.source || 'openai'} | Confidence: {analysisResult.confidence}
                  {typeof analysisResult.confidence_score === 'number'
                    ? ` (${(analysisResult.confidence_score * 100).toFixed(0)}%)`
                    : ''}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-sky-50 p-3">
                  <p className="text-xs font-semibold text-sky-700">Karbohidrat</p>
                  <p className="mt-1 text-lg font-extrabold text-sky-900">
                    {formatMacro(displayTotal.carbs_g)}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-700">Protein</p>
                  <p className="mt-1 text-lg font-extrabold text-emerald-900">
                    {formatMacro(displayTotal.protein_g)}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-700">Lemak</p>
                  <p className="mt-1 text-lg font-extrabold text-amber-900">
                    {formatMacro(displayTotal.fat_g)}
                  </p>
                </div>
              </div>
              {analysisResult.foodName ? (
                <p className="text-sm text-slate-600">
                  Prediksi makanan utama: <span className="font-semibold">{analysisResult.foodName}</span>
                </p>
              ) : null}
              {displayFoods.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Nama Makanan</th>
                        <th className="px-3 py-2 font-semibold">Gram</th>
                        <th className="px-3 py-2 font-semibold">Kalori</th>
                        <th className="px-3 py-2 font-semibold">Karbo</th>
                        <th className="px-3 py-2 font-semibold">Protein</th>
                        <th className="px-3 py-2 font-semibold">Lemak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayFoods.map((food, index) => (
                        <tr key={`${food.name_local}-${index}`} className="border-t border-slate-100">
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={food.name_local}
                              onChange={(event) =>
                                handleFoodFieldChange(index, 'name_local', event.target.value)
                              }
                              className="h-9 w-44 rounded-xl border border-slate-200 px-2"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              value={food.estimated_grams}
                              onChange={(event) =>
                                handleFoodFieldChange(index, 'estimated_grams', event.target.value)
                              }
                              className="h-9 w-20 rounded-xl border border-slate-200 px-2"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              value={food.total_calories}
                              onChange={(event) =>
                                handleFoodFieldChange(index, 'total_calories', event.target.value)
                              }
                              className="h-9 w-20 rounded-xl border border-slate-200 px-2"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={food.carbs_g}
                              onChange={(event) => handleFoodFieldChange(index, 'carbs_g', event.target.value)}
                              className="h-9 w-20 rounded-xl border border-slate-200 px-2"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={food.protein_g}
                              onChange={(event) =>
                                handleFoodFieldChange(index, 'protein_g', event.target.value)
                              }
                              className="h-9 w-20 rounded-xl border border-slate-200 px-2"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={food.fat_g}
                              onChange={(event) => handleFoodFieldChange(index, 'fat_g', event.target.value)}
                              className="h-9 w-20 rounded-xl border border-slate-200 px-2"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="meal-type" className="block text-sm font-semibold">
                    Meal type
                  </label>
                  <select
                    id="meal-type"
                    value={mealType}
                    onChange={(event) => setMealType(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm"
                  >
                    {MEAL_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={isSubmitting}
                    className="min-h-11 w-full rounded-full bg-[#1A2E44] px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Submit'}
                  </button>
                </div>
              </div>
              {analysisResult.notes ? (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{analysisResult.notes}</p>
              ) : null}
              <p className="text-xs text-slate-500">
                Hasil bersifat estimasi berbasis AI, bukan pengganti penilaian ahli gizi.
              </p>
            </div>
          </section>
        ) : null}

        {submitSuccess ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-emerald-800">Berhasil disimpan</h2>
            <p className="mt-1 text-sm text-emerald-700">
              Logs {Array.isArray(submitSuccess.log_ids) ? submitSuccess.log_ids.join(', ') : '-'} |{' '}
              {submitSuccess.meal_type} | {submitSuccess.item_count} item
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Total: {submitSuccess.total?.calories} kkal, Karbo {submitSuccess.total?.carbs_g} g,
              Protein {submitSuccess.total?.protein_g} g, Lemak {submitSuccess.total?.fat_g} g
            </p>
          </section>
        ) : null}
      </div>
    </main>
  )
}

export default CalorieEstimatorPage
