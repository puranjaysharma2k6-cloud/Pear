import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Fail the build immediately if the required env var is missing in production
  if (mode === 'production' && !env.VITE_CF_WORKER_URL) {
    throw new Error(
      '\n\n❌ VITE_CF_WORKER_URL is not set!\n' +
      'Add it in Cloudflare Pages → Settings → Environment variables\n' +
      'Value should be: wss://your-worker.workers.dev\n'
    )
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
