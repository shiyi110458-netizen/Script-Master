import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import evaluateHandler from './api/evaluate.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-evaluate-api',
        configureServer(server) {
          server.middlewares.use('/api/evaluate', evaluateHandler)
        },
      },
    ],
  }
})
