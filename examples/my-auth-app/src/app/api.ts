import { auth } from './auth'

// Inject all application endpoints into this API to share auth and refresh handling.
export const tilcayoApi = auth.api
