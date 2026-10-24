// Türkçe öneri MyMemory'den (mymemory.translated.net, anahtarsız ücretsiz çeviri; günlük kotası var).
import { DILLER, type Dil } from './kart'

export interface Ceviri {
  ana: string
  secenekler: string[] // ana dışındaki kısa, güvenilir alternatifler
}

interface MyMemoryYanit {
  responseStatus?: number | string
  responseData?: { translatedText?: string }
  matches?: { translation?: string; match?: number | string }[]
}

const kucult = (s: string) => {
  const t = s.trim().replace(/[.!]+$/, '')
  // "KREDİ ALMA" gibi bağırmaları ve "Fatura" gibi cümle başı büyük harfleri düzelt
  return t.toLocaleLowerCase('tr')
}

// Kelime çevirisinde küçük harfe çekilir ve en fazla 4 kelimelik alternatifler tutulur; cümle çevirisi olduğu gibi kalır
export function ceviriAyikla(y: MyMemoryYanit, kelimeMi: boolean): Ceviri | null {
  if (Number(y.responseStatus) !== 200) return null
  const ham = y.responseData?.translatedText?.trim()
  if (!ham || /MYMEMORY WARNING|INVALID/i.test(ham)) return null
  if (!kelimeMi) return { ana: ham, secenekler: [] }
  const ana = kucult(ham)
  const gorulen = new Set([ana])
  const secenekler: string[] = []
  for (const m of y.matches ?? []) {
    const t = m.translation ? kucult(m.translation) : ''
    if (!t || gorulen.has(t) || Number(m.match) < 0.95 || t.split(/\s+/).length > 4) continue
    gorulen.add(t)
    secenekler.push(t)
    if (secenekler.length === 3) break
  }
  return { ana, secenekler }
}

export async function cevir(metin: string, dil: Dil, kelimeMi: boolean, sinyal?: AbortSignal): Promise<Ceviri | null> {
  const q = metin.trim().slice(0, 450)
  if (!q) return null
  const p = new URLSearchParams({ q, langpair: `${DILLER[dil].ses.slice(0, 2)}|tr` })
  const res = await fetch(`https://api.mymemory.translated.net/get?${p}`, { signal: sinyal })
  if (!res.ok) throw new Error('mymemory ' + res.status)
  return ceviriAyikla((await res.json()) as MyMemoryYanit, kelimeMi)
}
