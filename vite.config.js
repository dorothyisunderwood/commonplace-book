import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // For GitHub Pages — change to '/commonplace-book/' if using repo name
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
