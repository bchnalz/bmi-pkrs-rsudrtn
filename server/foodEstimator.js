import { createClient } from '@supabase/supabase-js'

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

const OPENAI_API_BASE = 'https://api.openai.com/v1'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const MEAL_TYPE_MAP = {
  Sarapan: 'sarapan',
  'Makan Siang': 'makan siang',
  'Makan Malam': 'makan malam',
  Snack: 'snack',
}

export function toClientSafeEstimatorErrorMessage(message) {
  const raw = String(message || '')
  const normalized = raw.toLowerCase()

  if (
    normalized.includes('quota') ||
    normalized.includes('insufficient_quota') ||
    normalized.includes('rate limit')
  ) {
    return 'Kuota OpenAI API habis atau limit tercapai. Cek billing dan limit akun lalu coba lagi.'
  }

  if (normalized.includes('invalid_api_key') || normalized.includes('incorrect api key')) {
    return 'OPENAI_API_KEY tidak valid.'
  }

  if (normalized.includes('model') && normalized.includes('not found')) {
    return 'Model OpenAI tidak tersedia. Ubah OPENAI_MODEL atau gunakan default gpt-4o-mini.'
  }

  return raw || 'Gagal memproses estimasi kalori.'
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function confidenceToLabel(value) {
  if (value >= 0.85) return 'high'
  if (value >= 0.7) return 'medium'
  return 'low'
}

function roundPositive(value, digits = 1) {
  return Math.max(0, Number(value.toFixed(digits)))
}

function createServerSupabaseClient(supabaseUrl, supabaseServiceRoleKey) {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function normalizeMealType(mealType) {
  const normalized = MEAL_TYPE_MAP[mealType]
  if (!normalized) {
    throw new Error('Meal type tidak valid.')
  }
  return normalized
}

function computePer100(totalValue, grams) {
  if (grams <= 0) return 0
  return (totalValue / grams) * 100
}

function sanitizeFoodItems(foodsInput) {
  return foodsInput
    .map((item) => {
      const name = typeof item?.name === 'string' ? item.name.trim() : ''
      const nameLocal =
        typeof item?.name_local === 'string' && item.name_local.trim()
          ? item.name_local.trim()
          : name
      const estimatedGrams = toNumber(item?.estimated_grams)
      const caloriesPer100g = toNumber(item?.calories_per_100g)
      const totalCalories = toNumber(item?.total_calories ?? item?.calories)
      const carbs = toNumber(item?.carbs_g)
      const protein = toNumber(item?.protein_g)
      const fat = toNumber(item?.fat_g)
      const confidence = clamp(toNumber(item?.confidence) ?? 0.5, 0, 1)

      if (
        !name ||
        !nameLocal ||
        estimatedGrams === null ||
        totalCalories === null ||
        carbs === null ||
        protein === null ||
        fat === null
      ) {
        return null
      }

      const grams = Math.max(0, estimatedGrams)
      const totalCaloriesSafe = Math.max(0, totalCalories)
      const per100Calories =
        caloriesPer100g !== null ? Math.max(0, caloriesPer100g) : computePer100(totalCaloriesSafe, grams)

      return {
        name,
        name_local: nameLocal,
        estimated_grams: roundPositive(grams),
        calories_per_100g: roundPositive(per100Calories),
        total_calories: Math.max(0, Math.round(totalCaloriesSafe)),
        carbs_g: roundPositive(carbs),
        protein_g: roundPositive(protein),
        fat_g: roundPositive(fat),
        confidence: Number(confidence.toFixed(2)),
      }
    })
    .filter(Boolean)
}

function normalizeEstimatorResult(raw, source = 'openai') {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Respons AI tidak valid.')
  }

  const foodsInput = Array.isArray(raw.foods) ? raw.foods : []
  if (foodsInput.length === 0) {
    throw new Error('Format data estimasi tidak lengkap.')
  }

  const foods = sanitizeFoodItems(foodsInput)
  if (foods.length === 0) {
    throw new Error('Format item makanan tidak valid.')
  }

  const summedTotal = foods.reduce(
    (acc, item) => {
      acc.calories += item.total_calories
      acc.carbs_g += item.carbs_g
      acc.protein_g += item.protein_g
      acc.fat_g += item.fat_g
      return acc
    },
    { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
  )

  const totalInput = raw?.total ?? {}
  const totalCalories = toNumber(totalInput.calories)
  const totalCarbs = toNumber(totalInput.carbs_g)
  const totalProtein = toNumber(totalInput.protein_g)
  const totalFat = toNumber(totalInput.fat_g)
  const useModelTotal =
    totalCalories !== null && totalCarbs !== null && totalProtein !== null && totalFat !== null

  const total = useModelTotal
    ? {
        calories: Math.max(0, Math.round(totalCalories)),
        carbs_g: roundPositive(totalCarbs),
        protein_g: roundPositive(totalProtein),
        fat_g: roundPositive(totalFat),
      }
    : {
        calories: Math.max(0, Math.round(summedTotal.calories)),
        carbs_g: roundPositive(summedTotal.carbs_g),
        protein_g: roundPositive(summedTotal.protein_g),
        fat_g: roundPositive(summedTotal.fat_g),
      }

  const averageConfidence =
    foods.reduce((acc, item) => acc + item.confidence, 0) / Math.max(foods.length, 1)
  const confidenceLabel = confidenceToLabel(averageConfidence)
  const notes = typeof raw.notes === 'string' ? raw.notes : ''
  const lowConfidenceFlag =
    averageConfidence < 0.7
      ? 'Estimasi memiliki confidence rendah (<0.7), gunakan sebagai referensi awal saja.'
      : ''

  return {
    foods,
    total,
    calories: total.calories,
    macros: {
      carbs: total.carbs_g,
      protein: total.protein_g,
      fat: total.fat_g,
    },
    confidence: confidenceLabel,
    confidence_score: Number(averageConfidence.toFixed(2)),
    foodName: foods[0]?.name_local ?? foods[0]?.name ?? '',
    notes: [notes, lowConfidenceFlag].filter(Boolean).join(' ').trim(),
    source,
  }
}

function buildResultFromFoodItem(item, queryName) {
  const grams = 100
  const caloriesPer100g = Math.max(0, Number(item.calories_per_100g ?? 0))
  const carbsPer100g = Math.max(0, Number(item.carbs_per_100g ?? 0))
  const proteinPer100g = Math.max(0, Number(item.protein_per_100g ?? 0))
  const fatPer100g = Math.max(0, Number(item.fat_per_100g ?? 0))

  const totalCalories = Math.round((caloriesPer100g * grams) / 100)
  const carbs = roundPositive((carbsPer100g * grams) / 100)
  const protein = roundPositive((proteinPer100g * grams) / 100)
  const fat = roundPositive((fatPer100g * grams) / 100)

  return normalizeEstimatorResult(
    {
      foods: [
        {
          name: item.name || queryName || item.name_local || 'Food item',
          name_local: item.name_local || item.name || queryName || 'Makanan',
          estimated_grams: grams,
          calories_per_100g: caloriesPer100g,
          total_calories: totalCalories,
          carbs_g: carbs,
          protein_g: protein,
          fat_g: fat,
          confidence: 0.9,
        },
      ],
      total: {
        calories: totalCalories,
        carbs_g: carbs,
        protein_g: protein,
        fat_g: fat,
      },
      notes: 'Data berasal dari database makanan lokal (cache) dengan recognition_count > 3.',
    },
    'database',
  )
}

function escapeLikeQuery(input) {
  return input.replace(/[%_]/g, '')
}

async function findFoodItemFromDb(supabase, queryName) {
  const cleaned = String(queryName || '').trim()
  if (!supabase || !cleaned) return null

  let rows = []
  const { data: rankedData, error: rankedError } = await supabase.rpc('search_food_items_trgm', {
    query_text: cleaned,
    min_similarity: 0.2,
    max_results: 10,
  })

  if (!rankedError && Array.isArray(rankedData)) {
    rows = rankedData
  } else {
    const term = escapeLikeQuery(cleaned)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('food_items')
      .select(
        'id,name,name_local,calories_per_100g,carbs_per_100g,protein_per_100g,fat_per_100g,recognition_count',
      )
      .or(`name.ilike.%${term}%,name_local.ilike.%${term}%`)
      .order('recognition_count', { ascending: false })
      .limit(10)

    if (fallbackError) {
      throw new Error(`Gagal mencari data makanan lokal: ${fallbackError.message}`)
    }
    rows = fallbackData ?? []
  }

  const candidate = rows.find((row) => Number(row.recognition_count ?? 0) > 3)
  return candidate || null
}

function normalizeCorrectionPayload(foods) {
  if (!Array.isArray(foods) || foods.length === 0) {
    throw new Error('Data makanan untuk submit tidak valid.')
  }

  const sanitized = sanitizeFoodItems(foods)
  if (sanitized.length === 0) {
    throw new Error('Data makanan untuk submit tidak lengkap.')
  }

  return sanitized
}

async function callOpenAI({ apiKey, imageBase64, mimeType, preferredModel }) {
  const systemPrompt = `
You are a clinical nutrition assistant with expertise in Indonesian cuisine.

Analyze this food image carefully:
Step 1: Identify every food item visible, including side dishes, sauces, and garnishes. Be extremely detailed — do not generalize. If you see "nasi goreng", identify each visible component separately: nasi, telur, ayam, sayuran, etc.
Step 2: Estimate portion size in grams for each item based on visual cues (plate size, utensils, food density).
Step 3: Calculate calories and macronutrients per item using standard nutrition databases.
Step 4: If confidence below 0.7, still estimate but flag in notes.
Step 5: Return ONLY valid JSON, no explanation, no markdown.

{
  "foods": [
    {
      "name": "",
      "name_local": "",
      "estimated_grams": 0,
      "calories_per_100g": 0,
      "total_calories": 0,
      "carbs_g": 0,
      "protein_g": 0,
      "fat_g": 0,
      "confidence": 0.0
    }
  ],
  "total": {
    "calories": 0,
    "carbs_g": 0,
    "protein_g": 0,
    "fat_g": 0
  },
  "notes": ""
}
`

  const model = preferredModel || DEFAULT_OPENAI_MODEL
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this food photo and return JSON only.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  let responsePayload
  try {
    responsePayload = await response.json()
  } catch {
    throw new Error('OpenAI mengembalikan respons tidak valid.')
  }

  if (!response.ok) {
    const apiError = responsePayload?.error?.message || 'OpenAI API request gagal.'
    throw new Error(apiError)
  }

  const output = responsePayload?.choices?.[0]?.message?.content
  if (!output) throw new Error('OpenAI tidak mengembalikan hasil analisis.')

  let parsed
  try {
    parsed = JSON.parse(String(output))
  } catch {
    throw new Error('Gagal membaca output JSON dari OpenAI.')
  }

  return normalizeEstimatorResult(parsed, 'openai')
}

export function validateImagePayload(imageBase64, mimeType) {
  if (!imageBase64 || !mimeType) {
    return 'Payload tidak lengkap.'
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return 'Mime type tidak didukung.'
  }

  const estimatedSizeBytes = Math.ceil((imageBase64.length * 3) / 4)
  if (estimatedSizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return 'Ukuran gambar maksimal 5MB.'
  }

  return ''
}

export async function analyzeFoodEstimate({
  apiKey,
  preferredModel = '',
  imageBase64,
  mimeType,
  nameQuery = '',
  supabaseUrl = '',
  supabaseServiceRoleKey = '',
}) {
  const supabase = createServerSupabaseClient(supabaseUrl, supabaseServiceRoleKey)

  const matchedItem = await findFoodItemFromDb(supabase, nameQuery)
  if (matchedItem) {
    return buildResultFromFoodItem(matchedItem, nameQuery)
  }

  const openAiResult = await callOpenAI({ apiKey, imageBase64, mimeType, preferredModel })
  return openAiResult
}

export async function submitFoodLog({
  mealType,
  foods,
  wasCorrected = false,
  source = 'openai',
  supabaseUrl = '',
  supabaseServiceRoleKey = '',
}) {
  const normalizedMealType = normalizeMealType(mealType)

  const supabase = createServerSupabaseClient(supabaseUrl, supabaseServiceRoleKey)
  if (!supabase) {
    throw new Error('Server Supabase belum dikonfigurasi. Atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.')
  }

  const normalizedFoods = normalizeCorrectionPayload(foods)
  const total = normalizedFoods.reduce(
    (acc, item) => {
      acc.calories += item.total_calories
      acc.carbs_g += item.carbs_g
      acc.protein_g += item.protein_g
      acc.fat_g += item.fat_g
      return acc
    },
    { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
  )

  const insertedLogIds = []

  for (const item of normalizedFoods) {
    const matchedItem = await findFoodItemFromDb(supabase, item.name_local || item.name)
    const per100Carbs = roundPositive(computePer100(item.carbs_g, item.estimated_grams))
    const per100Protein = roundPositive(computePer100(item.protein_g, item.estimated_grams))
    const per100Fat = roundPositive(computePer100(item.fat_g, item.estimated_grams))

    const payload = {
      name: item.name,
      name_local: item.name_local,
      calories_per_100g: item.calories_per_100g,
      carbs_per_100g: per100Carbs,
      protein_per_100g: per100Protein,
      fat_per_100g: per100Fat,
      source: wasCorrected ? 'user_corrected' : source,
      updated_at: new Date().toISOString(),
    }

    let foodItemId = matchedItem?.id || null
    if (foodItemId) {
      const updatePayload = {
        recognition_count: Number(matchedItem.recognition_count ?? 0) + 1,
      }
      if (wasCorrected) {
        Object.assign(updatePayload, payload, { updated_at: new Date().toISOString() })
      }

      const { error: updateError } = await supabase
        .from('food_items')
        .update(updatePayload)
        .eq('id', foodItemId)
      if (updateError) {
        throw new Error(`Gagal update food_items: ${updateError.message}`)
      }
    } else {
      const { data: insertedItem, error: insertError } = await supabase
        .from('food_items')
        .insert({
          ...payload,
          recognition_count: 1,
        })
        .select('id')
        .single()
      if (insertError) {
        throw new Error(`Gagal insert food_items: ${insertError.message}`)
      }
      foodItemId = insertedItem.id
    }

    const { data: insertedLog, error: logError } = await supabase
      .from('food_logs')
      .insert({
        food_item_id: foodItemId,
        food_name: item.name_local || item.name,
        estimated_grams: item.estimated_grams,
        total_calories: item.total_calories,
        total_carbs: item.carbs_g,
        total_protein: item.protein_g,
        total_fat: item.fat_g,
        ai_confidence: item.confidence,
        was_corrected: Boolean(wasCorrected),
        meal_type: normalizedMealType,
      })
      .select('id')
      .single()

    if (logError) {
      throw new Error(`Gagal menyimpan food_logs: ${logError.message}`)
    }
    insertedLogIds.push(insertedLog.id)
  }

  return {
    success: true,
    log_ids: insertedLogIds,
    meal_type: normalizedMealType,
    item_count: normalizedFoods.length,
    total: {
      calories: Math.round(total.calories),
      carbs_g: roundPositive(total.carbs_g),
      protein_g: roundPositive(total.protein_g),
      fat_g: roundPositive(total.fat_g),
    },
    created_at: new Date().toISOString(),
  }
}
