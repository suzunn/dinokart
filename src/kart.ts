// Kart modeli, aralıklı tekrar (Leitner kutuları) ve dile özel küçük kurallar.
// Saf fonksiyonlar: arayüz ve depo bunları kullanır, testler doğrudan bunları sınar.

export type Dil = 'en' | 'de' | 'fr'
export type Cinsiyet = 'm' | 'f' | 'n'

export interface Kart {
  id: string
  no: number // kaçıncı kelime (koleksiyon numarası)
  dil: Dil
  kelime: string // Elif nasıl yazdıysa: "das Fenster", "la fenêtre", "to run"
  anlam: string
  cumle?: string
  cumleTr?: string
  not?: string
  olusturma: number
  guncelleme: number
  kutu: number // 0 = yeni, KUTU_TAVAN = en uzun aralık
  sonraki: number // bu andan itibaren tekrar zamanı gelmiş sayılır
  dogru: number
  yanlis: number
  ceviriBekliyor?: boolean // başka uygulamadan anlamı İngilizce geldi; eksik tamamlama Türkçeye çevirecek
}

export const DILLER: Record<Dil, { ad: string; bayrak: string; ses: string; tatoeba: string }> = {
  en: { ad: 'İngilizce', bayrak: '🇬🇧', ses: 'en-US', tatoeba: 'eng' },
  de: { ad: 'Almanca', bayrak: '🇩🇪', ses: 'de-DE', tatoeba: 'deu' },
  fr: { ad: 'Fransızca', bayrak: '🇫🇷', ses: 'fr-FR', tatoeba: 'fra' },
}
export const DIL_SIRASI: Dil[] = ['en', 'de', 'fr']

// Kutu başına bir sonraki tekrara kadar gün sayısı
export const ARALIK_GUN = [0, 1, 3, 7, 16, 35, 90]
export const KUTU_TAVAN = ARALIK_GUN.length - 1
export const OTURDU_KUTU = 3 // bir haftalık (7+ gün) aralığa çıkan kelime "oturdu" sayılır
// İlk görüşte bilinen kelime zaten biliniyordu (Duocards'tan gelenler gibi): 1 ve 3 gün sonra sormak boşa,
// doğrudan haftalık kutuya gider
export const ILK_BILDIM_KUTU = 3
export const TUR_BOYU = 20


export function gunBasi(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function gunAnahtari(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Gün ekleme saat dilimi değişiminde kaymasın diye takvim üzerinden yapılır
export function gunEkle(ts: number, gun: number): number {
  const d = new Date(gunBasi(ts))
  d.setDate(d.getDate() + gun)
  return d.getTime()
}

export function bildim(k: Kart, simdi: number): Kart {
  const ilkKez = k.dogru + k.yanlis === 0
  const kutu = Math.min(ilkKez ? ILK_BILDIM_KUTU : k.kutu + 1, KUTU_TAVAN)
  return { ...k, kutu, sonraki: gunEkle(simdi, ARALIK_GUN[kutu]), dogru: k.dogru + 1, guncelleme: simdi }
}

// Bilinmeyen kelime başa döner ve hemen yeniden sırası gelir
export function bilemedim(k: Kart, simdi: number): Kart {
  return { ...k, kutu: 0, sonraki: simdi, yanlis: k.yanlis + 1, guncelleme: simdi }
}

export const vakti = (k: Kart, simdi: number) => k.sonraki <= simdi

// Önce gecikenler (en eski önce), sonra yeniler (eklenme sırasıyla)
export function tekrarSirasi(kartlar: Kart[], simdi: number, dil?: Dil): Kart[] {
  return kartlar
    .filter(k => vakti(k, simdi) && (!dil || k.dil === dil))
    .sort((a, b) => {
      const ay = a.kutu === 0 && a.dogru + a.yanlis === 0
      const by = b.kutu === 0 && b.dogru + b.yanlis === 0
      if (ay !== by) return ay ? 1 : -1
      return ay ? a.olusturma - b.olusturma : a.sonraki - b.sonraki
    })
}

// Eski kayıtlar için: hiç yanılmadan bilinmiş ama kutusu ILK_BILDIM_KUTU'nun altında kalmış kart (ilk sürüm
// ilk görüşte bilineni de 1 gün sonra soruyordu) haftalık kutuya alınır; sıradaki tarih son görülmeden 7 gün sonra
export function ilkBildimDuzelt(k: Kart): Kart {
  if (k.yanlis !== 0 || k.dogru < 1 || k.kutu >= ILK_BILDIM_KUTU) return k
  const sonGorulme = gunEkle(k.sonraki, -ARALIK_GUN[k.kutu])
  return { ...k, kutu: ILK_BILDIM_KUTU, sonraki: Math.max(k.sonraki, gunEkle(sonGorulme, ARALIK_GUN[ILK_BILDIM_KUTU])) }
}

export type Asama = 'yeni' | 'ogreniyor' | 'oturdu'
export function asama(k: Kart): Asama {
  if (k.kutu >= OTURDU_KUTU) return 'oturdu'
  if (k.dogru + k.yanlis === 0) return 'yeni'
  return 'ogreniyor'
}

/* ---------- artikel ve kök ---------- */

const ARTIKEL: Record<Dil, [RegExp, Cinsiyet | null][]> = {
  de: [[/^der\s+/i, 'm'], [/^die\s+/i, 'f'], [/^das\s+/i, 'n']],
  fr: [[/^(le|un)\s+/i, 'm'], [/^(la|une)\s+/i, 'f'], [/^les\s+/i, null], [/^l['’]\s*/i, null]],
  en: [[/^to\s+/i, null], [/^(the|an|a)\s+/i, null]],
}

export function cinsiyet(kelime: string, dil: Dil): Cinsiyet | null {
  const t = kelime.trim()
  for (const [re, c] of ARTIKEL[dil]) if (re.test(t)) return c
  return null
}

// Cümle aramak ve vurgulamak için artikelsiz çıplak kelime
export function kok(kelime: string, dil: Dil): string {
  const t = kelime.trim()
  for (const [re] of ARTIKEL[dil]) if (re.test(t)) return t.replace(re, '').trim()
  return t
}

const kacis = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Cümlede kelimeyi bulan desen: çekimli halleri de yakalasın diye uzun kelimelerde son iki harf serbest
export function vurguDeseni(kelime: string, dil: Dil): RegExp | null {
  const c = kok(kelime, dil)
  if (!c) return null
  if (/\s/.test(c)) return new RegExp(`(${kacis(c)})`, 'iu')
  const govde = c.length > 5 ? c.slice(0, -2) : c
  return new RegExp(`(?<!\\p{L})(${kacis(govde)}\\p{L}*)`, 'iu')
}

export function vurgula(cumle: string, kelime: string, dil: Dil): { metin: string; vurgu: boolean }[] {
  const re = vurguDeseni(kelime, dil)
  const m = re ? re.exec(cumle) : null
  if (!m || m.index === undefined) return [{ metin: cumle, vurgu: false }]
  const bas = m.index + (m[0].length - m[1].length)
  const son = bas + m[1].length
  return [
    { metin: cumle.slice(0, bas), vurgu: false },
    { metin: cumle.slice(bas, son), vurgu: true },
    { metin: cumle.slice(son), vurgu: false },
  ].filter(p => p.metin)
}

/* ---------- cümle seçimi ---------- */

export interface CumleAdayi {
  cumle: string
  ceviri?: string
}

// Kelimeyi gerçekten içeren, ne çok kısa ne çok uzun cümleler; ~8 kelimelik olanlar öne
export function cumleSec(adaylar: CumleAdayi[], kelime: string, dil: Dil): CumleAdayi[] {
  const re = vurguDeseni(kelime, dil)
  const gorulen = new Set<string>()
  return adaylar
    .filter(a => {
      const n = a.cumle.split(/\s+/).length
      const anahtar = a.cumle.toLocaleLowerCase()
      if (gorulen.has(anahtar)) return false
      gorulen.add(anahtar)
      return n >= 3 && n <= 14 && (!re || re.test(a.cumle))
    })
    .sort((a, b) => {
      const fark = (x: CumleAdayi) => Math.abs(x.cumle.split(/\s+/).length - 8) - (x.ceviri ? 2 : 0)
      return fark(a) - fark(b)
    })
}

export function yeniKart(alan: { dil: Dil; kelime: string; anlam: string; cumle?: string; cumleTr?: string; not?: string }, no: number, simdi: number): Kart {
  return {
    id: simdi.toString(36) + Math.random().toString(36).slice(2, 8),
    no,
    ...alan,
    olusturma: simdi,
    guncelleme: simdi,
    kutu: 0,
    sonraki: simdi,
    dogru: 0,
    yanlis: 0,
  }
}

// Ardışık çalışılan gün sayısı; bugün henüz çalışılmadıysa dünden geriye sayılır
export function seri(gunler: string[], simdi: number): number {
  const set = new Set(gunler)
  let t = gunBasi(simdi)
  if (!set.has(gunAnahtari(t))) t = gunEkle(t, -1)
  let n = 0
  while (set.has(gunAnahtari(t))) {
    n++
    t = gunEkle(t, -1)
  }
  return n
}

