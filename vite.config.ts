import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  // `npm run dev:vr` serves HTTPS on the LAN: WebXR needs a secure context, and the Quest isn't localhost.
  plugins: [react(), tailwindcss(), mode === 'vr' && basicSsl()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules[/\\]/, maxSize: 450_000 }],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
}))
