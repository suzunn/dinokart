// Telefonun kendi sesiyle okuma (internet gerekmez, iPhone'da Siri sesleri kullanılır)
import { DILLER, type Dil } from './kart'

export const sesVar = typeof window !== 'undefined' && 'speechSynthesis' in window

function sesSec(dil: Dil): SpeechSynthesisVoice | undefined {
  const kod = DILLER[dil].ses
  const sesler = speechSynthesis.getVoices()
  return (
    sesler.find(v => v.lang === kod && /premium|enhanced|siri/i.test(v.name)) ??
    sesler.find(v => v.lang === kod) ??
    sesler.find(v => v.lang.startsWith(kod.slice(0, 2)))
  )
}

export function oku(metin: string, dil: Dil, yavas = false) {
  if (!sesVar || !metin) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(metin)
  u.lang = DILLER[dil].ses
  const v = sesSec(dil)
  if (v) u.voice = v
  u.rate = yavas ? 0.7 : 0.92
  speechSynthesis.speak(u)
}
