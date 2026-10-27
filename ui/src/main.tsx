import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@citizen-infra/design-system/fonts.css'
import '@citizen-infra/design-system/tokens.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
