import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  build: { assetsInlineLimit: 0 },
  test: { include: ['tests/**/*.test.ts'] },
})
