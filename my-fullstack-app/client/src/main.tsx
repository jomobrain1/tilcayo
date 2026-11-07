import { StrictMode } from 'react'
import { Provider } from 'react-redux'
import { store } from './app/store'
import { createRoot } from 'react-dom/client'
import '@tilcayo/styles/index.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
