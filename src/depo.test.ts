import { describe, expect, it } from 'vitest'
import { birlestir, type Veri } from './depo'
import { kelimeAnahtari, yeniKart } from './kart'

const T = new Date(2026, 9, 29).getTime()
const kart = (id: string, kelime: string, no: number) => ({ ...yeniKart({ dil: 'de', kelime, anlam: 'x' }, no, T), id })

describe('yedekten birleştirme', () => {
  it('"çok kolay" diye silinen kelime eski yedekten geri gelmez', () => {
    const eldeki: Veri = { surum: 2, kartlar: [kart('a', 'der Hund', 1)], gunler: [], sonDil: 'de', silinenler: [kelimeAnahtari('de', 'das Haus')] }
    const sonuc = birlestir(eldeki, { surum: 2, kartlar: [kart('b', 'das Haus', 2), kart('c', 'die Katze', 3)] })
    expect(sonuc.kartlar.map(k => k.kelime)).toEqual(['der Hund', 'die Katze'])
    expect(sonuc.silinenler).toEqual(['de:das haus'])
  })
})
