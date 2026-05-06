import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { APP_VERSION } from './src/appVersion.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'physiocare-version-meta',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>\n    <meta name="physiocare-version" content="${APP_VERSION}" />`
        );
      },
    },
  ],
})
