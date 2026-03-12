import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  analyzeFoodEstimate,
  submitFoodLog,
  toClientSafeEstimatorErrorMessage,
  validateImagePayload,
} from './server/foodEstimator.js'

async function readRequestBody(req) {
  const rawBody = await new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
  return rawBody ? JSON.parse(rawBody) : {}
}

function foodEstimatorDevApiPlugin() {
  return {
    name: 'food-estimator-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/food-estimator', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const body = await readRequestBody(req)
          const { imageBase64, mimeType, nameQuery = '' } = body
          const validationError = validateImagePayload(imageBase64, mimeType)
          if (validationError) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: validationError }))
            return
          }

          const env = loadEnv(server.config.mode, process.cwd(), '')
          const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY
          const preferredModel = env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
          const supabaseUrl =
            env.SUPABASE_URL ||
            env.supabase_url ||
            env.VITE_SUPABASE_URL ||
            process.env.SUPABASE_URL ||
            process.env.supabase_url ||
            process.env.VITE_SUPABASE_URL ||
            ''
          const supabaseServiceRoleKey =
            env.SUPABASE_SERVICE_ROLE_KEY ||
            env.supabase_service_role_key ||
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.supabase_service_role_key ||
            ''
          if (!apiKey) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: 'Server belum dikonfigurasi. Atur OPENAI_API_KEY di environment.',
              }),
            )
            return
          }

          const result = await analyzeFoodEstimate({
            apiKey,
            imageBase64,
            mimeType,
            preferredModel,
            nameQuery,
            supabaseUrl,
            supabaseServiceRoleKey,
          })
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({ error: toClientSafeEstimatorErrorMessage(error?.message) }),
          )
        }
      })

      server.middlewares.use('/api/food-log-submit', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const body = await readRequestBody(req)
          const { mealType, foods, notes = '', wasCorrected = false, source = 'openai' } = body

          const env = loadEnv(server.config.mode, process.cwd(), '')
          const supabaseUrl =
            env.SUPABASE_URL ||
            env.supabase_url ||
            env.VITE_SUPABASE_URL ||
            process.env.SUPABASE_URL ||
            process.env.supabase_url ||
            process.env.VITE_SUPABASE_URL ||
            ''
          const supabaseServiceRoleKey =
            env.SUPABASE_SERVICE_ROLE_KEY ||
            env.supabase_service_role_key ||
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.supabase_service_role_key ||
            ''

          const result = await submitFoodLog({
            mealType,
            foods,
            notes,
            wasCorrected,
            source,
            supabaseUrl,
            supabaseServiceRoleKey,
          })

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (error) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: toClientSafeEstimatorErrorMessage(error?.message) }))
        }
      })

    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), foodEstimatorDevApiPlugin()],
})
