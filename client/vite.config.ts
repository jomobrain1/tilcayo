import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Linked Tilcayo packages must share the app's React and context providers.
  resolve: { dedupe: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', 'react-router'] },
})
