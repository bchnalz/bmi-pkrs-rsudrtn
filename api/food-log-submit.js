import { submitFoodLog, toClientSafeEstimatorErrorMessage } from '../server/foodEstimator.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.supabase_url ||
    process.env.VITE_SUPABASE_URL ||
    ''
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.supabase_service_role_key ||
    ''

  const { mealType, foods, notes = '', wasCorrected = false, source = 'openai' } = req.body ?? {}

  try {
    const result = await submitFoodLog({
      mealType,
      foods,
      notes,
      wasCorrected,
      source,
      supabaseUrl,
      supabaseServiceRoleKey,
    })
    return res.status(200).json(result)
  } catch (error) {
    return res.status(400).json({
      error: toClientSafeEstimatorErrorMessage(error?.message),
    })
  }
}
