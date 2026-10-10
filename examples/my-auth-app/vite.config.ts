import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', 'react-router'] },
  server: { proxy: { '/api': 'http://127.0.0.1:9149' } },
})
