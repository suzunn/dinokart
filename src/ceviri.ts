// Türkçe öneri. Kelimeler önce sözlükten gelir (Netlify'daki /api/sozluk: İngilizce Wiktionary, Almanca Netzverb,
// Fransızca Wiktionnaire); sözlükte yoksa Google Çeviri'nin herkese açık uç noktasından (sözlük alternatifleriyle).
// Cümlede Google yanıt vermezse MyMemory (mymemory.translated.net) yedek olarak denenir.
// MyMemory tek kelimede kullanılmaz: yazılım menülerinden öğrenmiş, "window"a "açar" diyor.
import { DILLER, kok, type Dil } from './kart'

export interface Ceviri {
  ana: string
  secenekler: string[] // ana dışındaki kısa alternatifler
  kaynak?: string
}

export const SOZLUK_URL = 'https://dinokart-sozluk.netlify.app/api/sozluk'

const SECENEK_TAVAN = 4

const kucult = (s: string) => s.trim().replace(/[.!]+$/, '').toLocaleLowerCase('tr')

/* ---------- Google ---------- */

// Yanıt: [ [[çeviri, kaynak, ...], ...], [[türKodu, [kelimeler], ...], ...] | null, ... ]
type GoogleYanit = [([string, string] | unknown[])[] | null, ([string, string[]] | unknown[])[] | null, ...unknown[]]

export function googleAyikla(y: unknown, kelimeMi: boolean): Ceviri | null {
  if (!Array.isArray(y)) return null
  const [parcalar, sozluk] = y as GoogleYanit
  const ham = (parcalar ?? [])
    .map(p => (Array.isArray(p) && typeof p[0] === 'string' ? p[0] : ''))
    .join('')
    .trim()
  if (!ham) return null
  if (!kelimeMi) return { ana: ham, secenekler: [] }
  const ana = kucult(ham)
  return { ana, secenekler: sozlukSecenekleri(sozluk, ana) }
}

// İsim, fiil, sıfat gruplarından sırayla birer tane alınır: "run" için önce "koşmak", sonra "çalıştırmak"...
function sozlukSecenekleri(sozluk: unknown, ana: string): string[] {
  if (!Array.isArray(sozluk)) return []
  const gruplar = sozluk.map(g => (Array.isArray(g) && Array.isArray(g[1]) ? (g[1] as unknown[]).filter(k => typeof k === 'string') as string[] : []))
  const gorulen = new Set([ana])
  const sonuc: string[] = []
  for (let i = 0; sonuc.length < SECENEK_TAVAN && gruplar.some(g => i < g.length); i++) {
    for (const g of gruplar) {
      const t = g[i] ? kucult(g[i]) : ''
      if (!t || gorulen.has(t) || t.split(/\s+/).length > 3) continue
      gorulen.add(t)
      sonuc.push(t)
      if (sonuc.length === SECENEK_TAVAN) break
    }
  }
  return sonuc
}

async function google(q: string, dil: Dil, kelimeMi: boolean, sinyal?: AbortSignal): Promise<Ceviri | null> {
  const p = new URLSearchParams({ client: 'gtx', sl: DILLER[dil].ses.slice(0, 2), tl: 'tr', q })
  p.append('dt', 't')
  if (kelimeMi) p.append('dt', 'bd')
  // Uç nokta ara sıra boş döner; bir kez daha denemek yetiyor
  for (let deneme = 0; deneme < 2; deneme++) {
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?${p}`, { signal: sinyal })
      if (res.ok) {
        const c = googleAyikla(JSON.parse(await res.text()), kelimeMi)
        if (c) return c
      }
    } catch (e) {
      if (sinyal?.aborted) throw e
    }
  }
  return null
}

/* ---------- sözlük (Netlify) ---------- */

export function sozlukAyikla(y: unknown): Ceviri | null {
  const g = y as { kaynak?: string; anlamlar?: unknown }
  const anlamlar = Array.isArray(g?.anlamlar) ? g.anlamlar.filter((a): a is string => typeof a === 'string' && !!a.trim()) : []
  if (!anlamlar.length) return null
  return { ana: anlamlar[0].trim(), secenekler: anlamlar.slice(1, 1 + SECENEK_TAVAN).map(a => a.trim()), kaynak: g.kaynak }
}

async function sozluk(q: string, dil: Dil, sinyal?: AbortSignal): Promise<Ceviri | null> {
  try {
    const p = new URLSearchParams({ dil, q })
    const res = await fetch(`${SOZLUK_URL}?${p}`, { signal: sinyal ?? AbortSignal.timeout(7000) })
    return res.ok ? sozlukAyikla(await res.json()) : null
  } catch (e) {
    if (sinyal?.aborted) throw e
    return null // sunucu yoksa ya da yavaşsa Google'a düşülür
  }
}

/* ---------- MyMemory (yalnızca cümle yedeği) ---------- */

interface MyMemoryYanit {
  responseStatus?: number | string
  responseData?: { translatedText?: string }
}

export function myMemoryAyikla(y: MyMemoryYanit): Ceviri | null {
  if (Number(y.responseStatus) !== 200) return null
  const ham = y.responseData?.translatedText?.trim()
  if (!ham || /MYMEMORY WARNING|INVALID/i.test(ham)) return null
  return { ana: ham, secenekler: [] }
}

async function myMemory(q: string, dil: Dil, sinyal?: AbortSignal): Promise<Ceviri | null> {
  const p = new URLSearchParams({ q, langpair: `${DILLER[dil].ses.slice(0, 2)}|tr` })
  const res = await fetch(`https://api.mymemory.translated.net/get?${p}`, { signal: sinyal })
  if (!res.ok) return null
  return myMemoryAyikla((await res.json()) as MyMemoryYanit)
}

/* ---------- dışarıya açık ---------- */

export async function cevir(metin: string, dil: Dil, kelimeMi: boolean, sinyal?: AbortSignal): Promise<Ceviri | null> {
  const q = metin.trim().slice(0, 450)
  if (!q) return null
  if (!kelimeMi) return (await google(q, dil, false, sinyal)) ?? (await myMemory(q, dil, sinyal))

  const s = await sozluk(q, dil, sinyal)
  if (s) return s

  // Ana anlam artikeliyle/"to" ile sorulur (daha doğru), sözlük alternatifleri gerekirse çıplak kökten alınır
  const c = await google(q, dil, true, sinyal)
  if (c) c.kaynak = 'Google Çeviri'
  const k = kok(q, dil)
  if (c && !c.secenekler.length && k && k !== q) {
    const kokten = await google(k, dil, true, sinyal)
    if (kokten) c.secenekler = sozlukSecenekleri([[null, [kokten.ana, ...kokten.secenekler]]], c.ana)
  }
  return c
}
