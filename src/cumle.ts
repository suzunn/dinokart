// Örnek cümleleri Tatoeba'dan (tatoeba.org, CC BY lisanslı ücretsiz cümle veritabanı) çeker.
import { DILLER, cumleSec, kok, type CumleAdayi, type Dil } from './kart'

interface TatoebaCumle {
  text: string
  translations?: (TatoebaCeviri | TatoebaCeviri[])[]
}
interface TatoebaCeviri {
  text: string
  lang: string
}

async function ara(q: string, dil: Dil, turkceli: boolean, sinyal?: AbortSignal): Promise<CumleAdayi[]> {
  const p = new URLSearchParams({ lang: DILLER[dil].tatoeba, q, limit: '40', sort: 'relevance' })
  if (turkceli) p.set('trans:lang', 'tur')
  const res = await fetch(`https://api.tatoeba.org/unstable/sentences?${p}`, { signal: sinyal })
  if (!res.ok) throw new Error('tatoeba ' + res.status)
  const govde = (await res.json()) as { data?: TatoebaCumle[] }
  return (govde.data ?? []).map(c => ({
    cumle: c.text,
    ceviri: (c.translations ?? []).flat().find(t => t.lang === 'tur')?.text,
  }))
}

// Önce Türkçe çevirisi olan cümleler; azsa çevirisizlerle tamamlanır
export async function cumleBul(kelime: string, dil: Dil, sinyal?: AbortSignal): Promise<CumleAdayi[]> {
  const q = kok(kelime, dil)
  if (!q) return []
  const sorgu = /\s/.test(q) ? `"${q}"` : q
  let adaylar = cumleSec(await ara(sorgu, dil, true, sinyal), kelime, dil)
  if (adaylar.length < 3) adaylar = cumleSec([...adaylar, ...(await ara(sorgu, dil, false, sinyal))], kelime, dil)
  return adaylar.slice(0, 12)
}
