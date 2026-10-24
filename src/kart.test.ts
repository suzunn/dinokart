import { describe, expect, it } from 'vitest'
import { ARALIK_GUN, KUTU_TAVAN, asama, bilemedim, bildim, cinsiyet, cumleSec, gunAnahtari, gunBasi, kok, seri, tekrarSirasi, vurgula, yeniKart } from './kart'

const T = new Date(2026, 9, 24, 14, 30).getTime()
const kart = (ek: Partial<ReturnType<typeof yeniKart>> = {}) => ({ ...yeniKart({ dil: 'de', kelime: 'das Fenster', anlam: 'pencere' }, 1, T), ...ek })

describe('aralıklı tekrar', () => {
  it('bildim bir kutu ilerletir ve ertesi günün başına atar', () => {
    const k = bildim(kart(), T)
    expect(k.kutu).toBe(1)
    expect(k.sonraki).toBe(new Date(2026, 9, 25).getTime())
    expect(k.dogru).toBe(1)
  })

  it('kutu tavanı aşılmaz', () => {
    const k = bildim(kart({ kutu: KUTU_TAVAN }), T)
    expect(k.kutu).toBe(KUTU_TAVAN)
    expect(k.sonraki).toBe(new Date(2026, 9, 24 + ARALIK_GUN[KUTU_TAVAN]).getTime())
  })

  it('bilemedim başa döndürür ve hemen vakti gelir', () => {
    const k = bilemedim(kart({ kutu: 5, sonraki: T + 1e9 }), T)
    expect(k.kutu).toBe(0)
    expect(k.sonraki).toBe(T)
    expect(k.yanlis).toBe(1)
  })

  it('sıra: önce gecikenler, sonra yeniler, vakti gelmeyenler yok', () => {
    const yeni1 = kart({ id: 'y1', olusturma: T - 10 })
    const yeni2 = kart({ id: 'y2', olusturma: T - 5 })
    const gecik = kart({ id: 'g', kutu: 2, dogru: 2, sonraki: T - 5000 })
    const gelecek = kart({ id: 'x', kutu: 3, dogru: 3, sonraki: T + 5000 })
    const fr = kart({ id: 'f', dil: 'fr' })
    expect(tekrarSirasi([yeni2, gelecek, yeni1, gecik, fr], T, 'de').map(k => k.id)).toEqual(['g', 'y1', 'y2'])
    expect(tekrarSirasi([yeni2, gelecek, yeni1, gecik, fr], T)).toHaveLength(4)
  })

  it('aşamalar', () => {
    expect(asama(kart())).toBe('yeni')
    expect(asama(kart({ kutu: 1, dogru: 1 }))).toBe('ogreniyor')
    expect(asama(kart({ kutu: 4, dogru: 4 }))).toBe('oturdu')
  })
})

describe('artikel', () => {
  it('Almanca der/die/das', () => {
    expect(cinsiyet('der Hund', 'de')).toBe('m')
    expect(cinsiyet('Die Katze', 'de')).toBe('f')
    expect(cinsiyet('das Haus', 'de')).toBe('n')
    expect(cinsiyet('laufen', 'de')).toBeNull()
  })
  it('Fransızca le/la/un/une, l’ belirsiz', () => {
    expect(cinsiyet('le chien', 'fr')).toBe('m')
    expect(cinsiyet('une maison', 'fr')).toBe('f')
    expect(cinsiyet("l'arbre", 'fr')).toBeNull()
    expect(kok("l'arbre", 'fr')).toBe('arbre')
    expect(kok('l’école', 'fr')).toBe('école')
  })
  it('İngilizce to/the kökten atılır', () => {
    expect(kok('to run', 'en')).toBe('run')
    expect(kok('the window', 'en')).toBe('window')
    expect(kok('give up', 'en')).toBe('give up')
  })
  it('"la" ile başlayan kelime artikel sayılmaz', () => {
    expect(cinsiyet('laufen', 'de')).toBeNull()
    expect(kok('lampe', 'fr')).toBe('lampe')
  })
})

describe('vurgu', () => {
  it('çekimli hali de yakalar', () => {
    const p = vurgula('Öffnet die Fenstern bitte.', 'das Fenster', 'de')
    expect(p.find(x => x.vurgu)?.metin).toBe('Fenstern')
  })
  it('kelime içindeki parçayı yakalamaz', () => {
    expect(vurgula('I like oranges.', 'to ran', 'en').find(x => x.vurgu)).toBeUndefined()
  })
  it('deyim', () => {
    expect(vurgula('Never give up on it.', 'give up', 'en').find(x => x.vurgu)?.metin).toBe('give up')
  })
  it('bulamazsa cümle olduğu gibi', () => {
    expect(vurgula('Hallo Welt.', 'der Hund', 'de')).toEqual([{ metin: 'Hallo Welt.', vurgu: false }])
  })
})

describe('cümle seçimi', () => {
  it('kelimeyi içermeyen, çok kısa ve tekrarları atar; çevirisi olanı öne alır', () => {
    const s = cumleSec(
      [
        { cumle: 'Fenster!' },
        { cumle: 'Ich mag Katzen sehr.' },
        { cumle: 'Das Fenster ist offen, weil es heute sehr warm ist.' },
        { cumle: 'Mach bitte das Fenster zu.', ceviri: 'Lütfen pencereyi kapat.' },
        { cumle: 'mach bitte das fenster zu.' },
      ],
      'das Fenster',
      'de',
    )
    expect(s.map(x => x.cumle)).toEqual(['Mach bitte das Fenster zu.', 'Das Fenster ist offen, weil es heute sehr warm ist.'])
  })
})

describe('seri', () => {
  it('bugün çalışılmadıysa dünden sayar', () => {
    const g = (d: number) => gunAnahtari(new Date(2026, 9, d).getTime())
    expect(seri([g(21), g(22), g(23)], T)).toBe(3)
    expect(seri([g(22), g(23), g(24)], T)).toBe(3)
    expect(seri([g(21), g(23)], T)).toBe(1)
    expect(seri([], T)).toBe(0)
    expect(gunBasi(T)).toBe(new Date(2026, 9, 24).getTime())
  })
})
