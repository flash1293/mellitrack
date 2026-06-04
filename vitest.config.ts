import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setup-tests.ts'],
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'src/client/main.tsx',
        'src/server/static-manifest.ts',
        'src/server/index.ts',
        'src/setup-tests.ts',
      ],
    },
  },
})
