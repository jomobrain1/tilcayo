import { createTilcayoStore } from '@tilcayo/react/redux'
import { auth } from './auth'

export const store = createTilcayoStore({
  api: auth.api,
  reducers: { auth: auth.authReducer },
  devTools: false,
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
