import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/young-serif/latin.css'
import '@fontsource/young-serif/latin-ext.css'
import '@fontsource-variable/figtree/index.css'
import './index.css'
import App from './App'
import { registerSW } from 'virtual:pwa-register'

// iPhone'da ana ekrandaki uygulama kapanmadan arka plandan dönüyor; her dönüşte yeni sürüm var mı bakılır,
// varsa yüklenir ve sayfa kendiliğinden yenilenir (Elif'in iki kez kapatıp açması gerekmesin)
registerSW({
  immediate: true,
  onRegisteredSW(_url, kayit) {
    if (!kayit) return
    const bak = () => document.visibilityState === 'visible' && kayit.update().catch(() => {})
    document.addEventListener('visibilitychange', bak)
    setInterval(bak, 30 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
