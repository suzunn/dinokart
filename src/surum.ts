// Uygulamanın sürümü (derleme zamanı) ve "Son sürümü al" düğmesinin işi.
declare const __SURUM__: string

export const SURUM = __SURUM__

export function surumYazisi(s = SURUM): string {
  const t = new Date(s)
  if (Number.isNaN(t.getTime())) return s
  return t.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Sunucudaki sürüm bundan farklıysa yenisi indirilir ve sayfa yenilenir.
// surum.json önbelleğe alınmaz (workbox globPatterns'ta json yok), her seferinde sunucudan gelir.
export async function sonSurumuAl(): Promise<'guncel' | 'yenileniyor'> {
  let sunucudaki: string | undefined
  try {
    const r = await fetch(import.meta.env.BASE_URL + 'surum.json', { cache: 'no-store' })
    sunucudaki = ((await r.json()) as { surum?: string }).surum
  } catch {
    // dosya alınamazsa yine de yenilemeyi dene
  }
  if (sunucudaki && sunucudaki === SURUM) return 'guncel'

  const kayit = await navigator.serviceWorker?.getRegistration().catch(() => undefined)
  if (kayit) {
    const devraldi = new Promise<void>(bitti => {
      navigator.serviceWorker.addEventListener('controllerchange', () => bitti(), { once: true })
      setTimeout(bitti, 8000)
    })
    await kayit.update().catch(() => {})
    kayit.waiting?.postMessage({ type: 'SKIP_WAITING' })
    if (kayit.installing || kayit.waiting) await devraldi
  }
  location.reload()
  return 'yenileniyor'
}
