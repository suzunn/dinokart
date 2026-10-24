// Başka uygulamalardan (Duocards CSV dışa aktarımı, Anki, Excel) kelime içe aktarma.
// Dosyanın biçimi sabit değil: ayırıcı, başlık satırı ve sütunlar tahmin edilir, Elif önizlemede düzeltir.

export interface Tablo {
  baslik: string[] | null
  satirlar: string[][]
}

export interface Eslesme {
  kelime: number
  anlam: number
  cumle: number // -1 = yok
}

// Tırnaklı alanları, alan içindeki satır sonlarını ve "" kaçışını destekleyen küçük CSV okuyucu
export function csvOku(metin: string, ayirici: string): string[][] {
  const satirlar: string[][] = []
  let satir: string[] = []
  let alan = ''
  let tirnak = false
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i]
    if (tirnak) {
      if (c === '"' && metin[i + 1] === '"') {
        alan += '"'
        i++
      } else if (c === '"') tirnak = false
      else alan += c
    } else if (c === '"' && alan === '') tirnak = true
    else if (c === ayirici) {
      satir.push(alan)
      alan = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && metin[i + 1] === '\n') i++
      satir.push(alan)
      satirlar.push(satir)
      satir = []
      alan = ''
    } else alan += c
  }
  if (alan !== '' || satir.length) {
    satir.push(alan)
    satirlar.push(satir)
  }
  return satirlar.map(s => s.map(a => a.trim())).filter(s => s.some(Boolean))
}

// En tutarlı sütun sayısını veren ayırıcı seçilir
export function ayiriciBul(metin: string): string {
  const ornek = metin.split(/\r?\n/).filter(Boolean).slice(0, 20).join('\n')
  let en = ','
  let puan = -1
  for (const a of ['\t', ';', ',', '|']) {
    const s = csvOku(ornek, a)
    if (!s.length) continue
    const n = s[0].length
    if (n < 2) continue
    const p = s.filter(r => r.length === n).length / s.length + n / 100
    if (p > puan) {
      puan = p
      en = a
    }
  }
  return en
}

const BASLIK_KELIME = /^(front|word|term|kelime|wort|mot|vocab|vocabulary|expression|source|question|ön|on|original)$/i
const BASLIK_ANLAM = /^(back|translation|meaning|definition|anlam|türkçe|turkce|çeviri|ceviri|answer|target|arka|bedeutung|traduction)$/i
const BASLIK_CUMLE = /^(hint|example|sentence|example sentence|cümle|cumle|örnek|ornek|context|beispiel|exemple|note|notes)$/i
const BASLIK_TARIH = /^(publishedat|createdat|created|date|added|tarih)$/i

export function tabloyaCevir(metin: string): Tablo {
  const temiz = metin.replace(/^﻿/, '')
  const s = csvOku(temiz, ayiriciBul(temiz))
  if (!s.length) return { baslik: null, satirlar: [] }
  const ilk = s[0]
  const baslikMi = ilk.some(h => BASLIK_KELIME.test(h) || BASLIK_ANLAM.test(h) || BASLIK_CUMLE.test(h))
  return baslikMi ? { baslik: ilk, satirlar: s.slice(1) } : { baslik: null, satirlar: s }
}

export function eslesmeTahmin(t: Tablo): Eslesme {
  const n = Math.max(0, ...t.satirlar.slice(0, 20).map(r => r.length))
  const bul = (re: RegExp) => (t.baslik ? t.baslik.findIndex(h => re.test(h)) : -1)
  const kelime = bul(BASLIK_KELIME)
  const anlam = bul(BASLIK_ANLAM)
  const cumle = bul(BASLIK_CUMLE)
  const k = kelime >= 0 ? kelime : 0
  const a = anlam >= 0 ? anlam : k === 0 ? 1 : 0
  // Başlıksız dosyada üçüncü sütun ancak cümleye benziyorsa (en az 3 kelime) cümle sayılır
  const ucuncuCumle =
    !t.baslik && n >= 3 && t.satirlar.slice(0, 10).filter(r => (r[2] ?? '').split(/\s+/).length >= 3).length >= 3 ? 2 : -1
  return { kelime: k, anlam: a, cumle: cumle >= 0 ? cumle : ucuncuCumle }
}

export interface AktarilacakSatir {
  kelime: string
  anlam: string
  cumle?: string
}

// Tarih sütunu varsa (Duocards: publishedAt, en yeni üstte) eskiden yeniye sıralanır; numaralar ekleme sırasını korusun
export function satirlariAl(t: Tablo, e: Eslesme): AktarilacakSatir[] {
  const tarih = t.baslik ? t.baslik.findIndex(h => BASLIK_TARIH.test(h)) : -1
  const sirali = tarih >= 0 ? [...t.satirlar].sort((a, b) => (Date.parse(a[tarih]) || 0) - (Date.parse(b[tarih]) || 0)) : t.satirlar
  return sirali
    .map(r => ({
      kelime: (r[e.kelime] ?? '').trim(),
      anlam: (r[e.anlam] ?? '').trim(),
      cumle: e.cumle >= 0 ? (r[e.cumle] ?? '').trim() || undefined : undefined,
    }))
    .filter(r => r.kelime && r.anlam)
}

// Dosya UTF-8 değilse (Excel'de kaydedilmiş Duocards dosyası gibi) Windows-1252 olarak okunur
export function metneCevir(veri: ArrayBuffer): string {
  const utf = new TextDecoder('utf-8').decode(veri)
  if (!utf.includes('�')) return utf
  return new TextDecoder('windows-1252').decode(veri)
}

// Yeni kartlar günde bu kadar açılır; yüzlerce kelime bir günde önüne yığılmasın
export const AKTARMA_GUNLUK_SECENEK = [20, 50, 100]

// Duocards'ta anlamlar çoğu zaman İngilizce yazılmış ("wine", "multiple"). Türkçeye özgü harf içermeyen anlam
// İngilizce sayılır; "ev" gibi o harfleri içermeyen Türkçe anlam da çevrilir ama sonuç zaten aynı çıkar ve
// eski anlam kartın notunda saklanır.
export function ingilizceGibi(anlam: string): boolean {
  const t = anlam.trim()
  return !!t && /\p{L}/u.test(t) &&!/[çğıöşüâîûÇĞİÖŞÜÂÎÛ]/.test(t)
}
