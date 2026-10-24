import { describe, expect, it } from 'vitest'
import { ayiriciBul, csvOku, eslesmeTahmin, satirlariAl, tabloyaCevir } from './aktar'

describe('csv okuma', () => {
  it('tırnak, içte virgül ve satır sonu, "" kaçışı', () => {
    expect(csvOku('a,"b, c"\n"d ""x""","e\nf"\r\ng,h', ',')).toEqual([
      ['a', 'b, c'],
      ['d "x"', 'e\nf'],
      ['g', 'h'],
    ])
  })
  it('boş satırları atar', () => {
    expect(csvOku('a;b\n\n;\nc;d\n', ';')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })
  it('ayırıcıyı bulur', () => {
    expect(ayiriciBul('window\tpencere\nbook\tkitap')).toBe('\t')
    expect(ayiriciBul('window;pencere, cam\nbook;kitap')).toBe(';')
    expect(ayiriciBul('window,pencere\nbook,kitap')).toBe(',')
  })
})

describe('tablo ve eşleme', () => {
  it('başlıklı Duocards benzeri dosya, BOM ile', () => {
    const t = tabloyaCevir('﻿front,back,example\nla maison,ev,Je rentre à la maison.\nle chat,kedi,')
    expect(t.baslik).toEqual(['front', 'back', 'example'])
    const e = eslesmeTahmin(t)
    expect(e).toEqual({ kelime: 0, anlam: 1, cumle: 2 })
    expect(satirlariAl(t, e)).toEqual([
      { kelime: 'la maison', anlam: 'ev', cumle: 'Je rentre à la maison.' },
      { kelime: 'le chat', anlam: 'kedi', cumle: undefined },
    ])
  })
  it('ters sıralı başlık', () => {
    const t = tabloyaCevir('Translation;Word\npencere;window')
    expect(eslesmeTahmin(t)).toEqual({ kelime: 1, anlam: 0, cumle: -1 })
  })
  it('başlıksız iki sütun; anlamı boş satır atılır', () => {
    const t = tabloyaCevir('window,pencere\nbook,\ntable,masa')
    expect(t.baslik).toBeNull()
    expect(satirlariAl(t, eslesmeTahmin(t)).map(r => r.kelime)).toEqual(['window', 'table'])
  })
  it('başlıksız üçüncü sütun ancak cümleyse cümle', () => {
    const cumleli = tabloyaCevir('a,b,I like this a lot\nc,d,She has two cats\ne,f,We go home now')
    expect(eslesmeTahmin(cumleli).cumle).toBe(2)
    const etiketli = tabloyaCevir('a,b,noun\nc,d,verb\ne,f,noun')
    expect(eslesmeTahmin(etiketli).cumle).toBe(-1)
  })
})
