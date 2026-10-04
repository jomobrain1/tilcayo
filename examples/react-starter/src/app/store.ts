import { createTilcayoStore } from '@tilcayo/react/redux'
import { tilcayoApi } from './api'

export const store = createTilcayoStore({ api: tilcayoApi })
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
