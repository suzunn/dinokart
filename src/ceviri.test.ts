import { describe, expect, it } from 'vitest'
import { googleAyikla, myMemoryAyikla } from './ceviri'

describe('Google yanıtı', () => {
  it('ana anlam ve sözlük alternatifleri (window)', () => {
    const y = [
      [['pencere', 'window', null, null, 3]],
      [['noun', ['pencere', 'cam', 'vitrin', 'camekân'], [], 'window', 1]],
      'en',
    ]
    expect(googleAyikla(y, true)).toEqual({ ana: 'pencere', secenekler: ['cam', 'vitrin', 'camekân'] })
  })

  it('türler arasında sırayla seçer, uzunları atar, en fazla 4', () => {
    const y = [
      [['koşmak', 'run']],
      [
        ['verb', ['çalıştırmak', 'koşmak', 'yayınlamak', 'kaçmak', 'tabanları yağlamak hemen şimdi']],
        ['noun', ['koşu', 'sayı', 'seri']],
      ],
    ]
    expect(googleAyikla(y, true)).toEqual({ ana: 'koşmak', secenekler: ['çalıştırmak', 'koşu', 'sayı', 'yayınlamak'] })
  })

  it('sözlük yoksa yalnız ana anlam; büyük harf düzeltilir', () => {
    expect(googleAyikla([[['Fatura', 'die Rechnung']], null, 'de'], true)).toEqual({ ana: 'fatura', secenekler: [] })
  })

  it('cümle parçaları birleştirilir, harfler korunur', () => {
    expect(googleAyikla([[['Utangaç öğrenci ', 'The shy pupil '], ['cevabını fısıldadı.', 'whispered his answer.']]], false)).toEqual({
      ana: 'Utangaç öğrenci cevabını fısıldadı.',
      secenekler: [],
    })
  })

  it('bozuk ya da boş yanıt', () => {
    expect(googleAyikla(null, true)).toBeNull()
    expect(googleAyikla([[]], true)).toBeNull()
    expect(googleAyikla({}, true)).toBeNull()
  })
})

describe('MyMemory yanıtı', () => {
  it('kota uyarısı ya da hata durumunda öneri yok', () => {
    expect(myMemoryAyikla({ responseStatus: 429, responseData: { translatedText: 'x' } })).toBeNull()
    expect(myMemoryAyikla({ responseStatus: 200, responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS' } })).toBeNull()
  })
  it('cümle olduğu gibi kalır', () => {
    expect(myMemoryAyikla({ responseStatus: 200, responseData: { translatedText: 'Pencereyi kapatıyorum.' } })).toEqual({
      ana: 'Pencereyi kapatıyorum.',
      secenekler: [],
    })
  })
})
