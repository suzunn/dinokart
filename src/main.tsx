import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/young-serif/latin.css'
import '@fontsource/young-serif/latin-ext.css'
import '@fontsource-variable/figtree/index.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
