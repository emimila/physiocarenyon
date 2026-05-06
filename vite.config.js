import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Su Vercel il commit è disponibile in build; in locale resta "local".
const gitShort =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.GITHUB_SHA?.slice(0, 7) ||
  'local'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_SHORT__: JSON.stringify(gitShort),
  },
})
