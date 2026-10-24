// Sözlük ucu: GET /api/sozluk?dil=en|de|fr&q=kelime -> { kaynak, anlamlar: [...] }
// İngilizce Wiktionary'den, Almanca Netzverb'den, Fransızca Wiktionnaire'den. Bulamazsa boş liste döner,
// uygulama o zaman Google çevirisine düşer. Sonuç bir gün CDN'de tutulur; aynı kelime siteye tekrar gitmez.
// (Tureng denendi: Cloudflare bot koruması otomatik istekleri geri çeviriyor, o yüzden kullanılmıyor.)
import { aramaKoku, netzverbAyikla, wiktionaryAyikla, wiktionnaireAyikla } from '../sozluk-ayikla.mjs'

const BOT = 'Dinokart/0.1 (kisisel kelime kartlari; github.com/suzunn/dinokart)'
const TARAYICI = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

const BASLIKLAR = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const json = (durum, govde, onbellek) =>
  new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...BASLIKLAR, 'Cache-Control': 'no-store', ...(onbellek ? { 'Netlify-CDN-Cache-Control': 'public, s-maxage=86400' } : {}) },
  })

async function getir(url, ua = TARAYICI) {
  const istek = () => fetch(url, { headers: { 'User-Agent': ua, 'Accept-Language': 'tr,en;q=0.8' }, signal: AbortSignal.timeout(8000) })
  let res = await istek()
  // Yoğunlukta 429/503 dönebiliyor; kısa bir aradan sonra bir kez daha denenir
  if (res.status === 429 || res.status === 503) {
    await new Promise(r => setTimeout(r, 600))
    res = await istek()
  }
  if (res.status === 404) return ''
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`)
  return res.text()
}

// Sayfa yoksa API 200 + {error} döner; o zaman boş metin
async function wikiGetir(dil, sayfa) {
  const p = new URLSearchParams({ action: 'parse', page: sayfa, prop: 'wikitext', format: 'json', redirects: '1' })
  const govde = await getir(`https://${dil}.wiktionary.org/w/api.php?${p}`, BOT)
  return (govde && JSON.parse(govde)?.parse?.wikitext?.['*']) || ''
}

const KAYNAK = {
  en: {
    ad: 'Wiktionary',
    bul: async (q, ham) => {
      const wikitext = await wikiGetir('en', q)
      return wikitext ? wiktionaryAyikla(wikitext, /^to\s/i.test(ham.trim())) : []
    },
  },
  de: {
    ad: 'Netzverb',
    bul: async q => netzverbAyikla(await getir(`https://www.verbformen.de/?w=${encodeURIComponent(q)}`)),
  },
  fr: {
    ad: 'Wiktionnaire',
    bul: async q => {
      const wikitext = await wikiGetir('fr', q)
      return wikitext ? wiktionnaireAyikla(wikitext) : []
    },
  },
}

export default async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: BASLIKLAR })
  const url = new URL(req.url)
  const dil = url.searchParams.get('dil')
  const ham = (url.searchParams.get('q') ?? '').slice(0, 80)
  const kaynak = KAYNAK[dil]
  if (!kaynak) return json(400, { error: 'dil en, de ya da fr olmalı' })
  const q = aramaKoku(ham, dil)
  if (!q) return json(400, { error: 'kelime gerekli' })
  try {
    return json(200, { kaynak: kaynak.ad, anlamlar: await kaynak.bul(q, ham) }, true)
  } catch (e) {
    return json(502, { kaynak: kaynak.ad, anlamlar: [], error: String(e.message ?? e) })
  }
}

export const config = { path: '/api/sozluk' }
