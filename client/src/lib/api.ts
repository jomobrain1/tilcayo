import { createApiClient } from '@tilcayo/react'

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '/api',
})
