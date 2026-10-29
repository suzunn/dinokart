// Telefonda saklama (localStorage) ve yedek dosyası.
import { ilkBildimDuzelt, type Dil, type Kart } from './kart'

export interface Veri {
  surum: 2
  kartlar: Kart[]
  gunler: string[] // çalışılan günler, YYYY-MM-DD
  sonDil: Dil
}

const ANAHTAR = 'dinokart.v1'
const BOS: Veri = { surum: 2, kartlar: [], gunler: [], sonDil: 'en' }

// Sürüm 1 -> 2: ilk görüşte bilinen kartlar haftalık kutuya (kart.ts ilkBildimDuzelt)
const surumeGetir = (kartlar: Kart[], surum: unknown) => (surum === 2 ? kartlar : kartlar.map(ilkBildimDuzelt))

export function yukle(): Veri {
  try {
    const ham = localStorage.getItem(ANAHTAR)
    if (!ham) return BOS
    const v = JSON.parse(ham) as Partial<Veri>
    return { ...BOS, ...v, surum: 2, kartlar: surumeGetir(Array.isArray(v.kartlar) ? v.kartlar : [], v.surum) }
  } catch {
    return BOS
  }
}

export function kaydet(v: Veri): boolean {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(v))
    return true
  } catch {
    return false
  }
}

// Safari'nin siteyi temizlerken veriyi silmemesini ister (ana ekrandaki uygulamada genelde zaten kalıcıdır)
export function kaliciIste() {
  navigator.storage?.persist?.().catch(() => {})
}

// Yedekten gelen kartlar eldekilerle id üzerinden birleşir; çakışmada yeni güncellenen kazanır
export function birlestir(eldeki: Veri, gelen: Partial<Veri>): Veri {
  const harita = new Map(eldeki.kartlar.map(k => [k.id, k]))
  for (const k of surumeGetir(gelen.kartlar ?? [], gelen.surum)) {
    if (!k?.id || !k.kelime) continue
    const e = harita.get(k.id)
    if (!e || k.guncelleme > e.guncelleme) harita.set(k.id, k)
  }
  const gunler = [...new Set([...eldeki.gunler, ...(gelen.gunler ?? [])])].sort()
  return { ...eldeki, kartlar: [...harita.values()].sort((a, b) => a.no - b.no), gunler }
}

export async function yedekVer(v: Veri): Promise<'paylasildi' | 'indirildi' | 'iptal'> {
  const ad = `dinokart-yedek-${new Date().toISOString().slice(0, 10)}.json`
  const dosya = new File([JSON.stringify(v, null, 1)], ad, { type: 'application/json' })
  if (navigator.canShare?.({ files: [dosya] })) {
    try {
      await navigator.share({ files: [dosya], title: 'Dinokart yedeği' })
      return 'paylasildi'
    } catch {
      return 'iptal'
    }
  }
  const url = URL.createObjectURL(dosya)
  const a = document.createElement('a')
  a.href = url
  a.download = ad
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'indirildi'
}
