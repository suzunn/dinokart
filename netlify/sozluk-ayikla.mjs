// Sözlük sayfalarından Türkçe karşılıkları ayıklayan saf fonksiyonlar (testler doğrudan bunları sınar).

const VARLIK = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

export function varlikCoz(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z#0-9]+);/gi, (m, ad) => VARLIK[ad.toLowerCase()] ?? m)
}

const etiketsiz = s => varlikCoz(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

const tekillestir = (liste, tavan) => {
  const gorulen = new Set()
  const sonuc = []
  for (const x of liste) {
    const t = x.trim()
    const a = t.toLocaleLowerCase('tr')
    if (!t || gorulen.has(a)) continue
    gorulen.add(a)
    sonuc.push(t)
    if (sonuc.length === tavan) break
  }
  return sonuc
}

// Aramadan önce artikel ve "to" atılır: sözlükler çıplak kelimeyle arıyor
const ARTIKEL = {
  en: /^(to|the|an|a)\s+/i,
  de: /^(der|die|das)\s+/i,
  fr: /^(le|la|les|un|une)\s+|^l['’]\s*/i,
}
export function aramaKoku(kelime, dil) {
  return kelime.trim().replace(ARTIKEL[dil] ?? /^$/, '').trim()
}

/* ---------- Wiktionary (İngilizce) ---------- */

const TURLER = /^(Verb|Noun|Proper noun|Adjective|Adverb|Pronoun|Preposition|Conjunction|Interjection|Phrase|Prepositional phrase|Idiom|Determiner|Numeral|Particle)$/

// ==English== bölümündeki çeviri tablolarından {{t|tr|..}} / {{t+|tr|..}}; "to ..." ise yalnız Verb alt bölümleri
export function wiktionaryAyikla(wikitext, fiil = false) {
  const bas = wikitext.search(/^==English==\s*$/m)
  if (bas < 0) return []
  const son = wikitext.slice(bas + 11).search(/^==[^=]/m)
  const bolum = son < 0 ? wikitext.slice(bas) : wikitext.slice(bas, bas + 11 + son)
  const turkce = metin => [...metin.matchAll(/\{\{t\+?\|tr\|([^}|]+)/g)].map(m => m[1])
  if (fiil) {
    // Çeviri tablosu "=====Translations=====" gibi bir alt başlıkta durur; o alt başlık üstteki sözcük türüne aittir
    const parcalar = bolum.split(/^(===+\s*[^=\n]+?\s*===+)\s*$/m)
    const fiiller = []
    let fiilBolumu = false
    let tur = ''
    for (let i = 1; i < parcalar.length; i += 2) {
      const ad = parcalar[i].replace(/=/g, '').trim()
      if (TURLER.test(ad)) tur = ad
      else if (/^(Etymology|Pronunciation)/i.test(ad)) tur = ''
      if (tur === 'Verb') {
        fiilBolumu = true
        fiiller.push(...turkce(parcalar[i + 1] ?? ''))
      }
    }
    // Fiil bölümü var ama Türkçesi yoksa isim anlamlarını vermek yanıltır ("to fret" -> "perde")
    if (fiilBolumu) return tekillestir(fiiller, 8)
  }
  return tekillestir(turkce(bolum), 8)
}

/* ---------- Netzverb (Almanca) ---------- */

// <dd lang="tr"><span class="vLng"><img ...>&nbsp;</span><span>pencere, cam, <span class="rInf">açıklık</span></span></dd>
export function netzverbAyikla(html) {
  const m = html.match(/<dd lang="tr">([\s\S]*?)<\/dd>/)
  if (!m) return []
  const govde = m[1].replace(/<span class="vLng">[\s\S]*?<\/span>/, '')
  return tekillestir(etiketsiz(govde).split(/[,;]/), 8)
}

/* ---------- Wiktionnaire (Fransızca) ---------- */

// Yalnızca Fransızca bölümündeki {{trad+|tr|ev}} şablonları; sayfada başka diller de olabilir
export function wiktionnaireAyikla(wikitext) {
  const bas = wikitext.search(/==\s*\{\{langue\|fr\}\}\s*==/)
  if (bas < 0) return []
  const sonraki = wikitext.slice(bas + 10).search(/\n==\s*\{\{langue\|/)
  const bolum = sonraki < 0 ? wikitext.slice(bas) : wikitext.slice(bas, bas + 10 + sonraki)
  return tekillestir([...bolum.matchAll(/\{\{trad[+-]*\|tr\|([^}|]+)/g)].map(m => m[1]), 8)
}
