import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves the app under /modas-sophie/, while Netlify previews use the site root.
  base: process.env.NETLIFY ? '/' : '/modas-sophie/',
  plugins: [react()],
})
