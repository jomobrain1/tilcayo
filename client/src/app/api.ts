import { createTilcayoApi, createTilcayoBaseQuery } from '@tilcayo/react/redux'
import { api } from '../lib/api'

export const tilcayoApi = createTilcayoApi({
  baseQuery: createTilcayoBaseQuery({ client: api }),
})
