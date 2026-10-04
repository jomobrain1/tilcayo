import { createTilcayoAuth } from '@tilcayo/react/auth'

export const auth = createTilcayoAuth({ baseUrl: import.meta.env.VITE_API_URL || '/api' })
export const { useAuth, AuthBootstrap } = auth
