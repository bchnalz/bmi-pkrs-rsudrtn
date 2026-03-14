import {
  analyzeFoodEstimate,
  NON_FOOD_ERROR_MESSAGE,
  toClientSafeEstimatorErrorMessage,
  validateImagePayload,
} from '../server/foodEstimator.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  const preferredModel = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.supabase_url ||
    process.env.VITE_SUPABASE_URL ||
    ''
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.supabase_service_role_key ||
    ''
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server belum dikonfigurasi. Atur OPENAI_API_KEY di environment.',
    })
  }

  const { imageBase64, mimeType, nameQuery = '' } = req.body ?? {}
  const validationError = validateImagePayload(imageBase64, mimeType)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  try {
    const estimatedNutrition = await analyzeFoodEstimate({
      apiKey,
      imageBase64,
      mimeType,
      preferredModel,
      nameQuery,
      supabaseUrl,
      supabaseServiceRoleKey,
    })
    return res.status(200).json(estimatedNutrition)
  } catch (error) {
    if (error?.message === NON_FOOD_ERROR_MESSAGE) {
      return res.status(400).json({ error: NON_FOOD_ERROR_MESSAGE })
    }

    return res.status(502).json({
      error: toClientSafeEstimatorErrorMessage(error?.message),
    })
  }
}
