import { describe, expect, it } from 'vitest'
import { ceviriAyikla } from './ceviri'

describe('çeviri ayıklama', () => {
  it('ana çeviriyi küçültür, uzun ve düşük eşleşmeli alternatifleri atar', () => {
    const c = ceviriAyikla(
      {
        responseStatus: 200,
        responseData: { translatedText: 'Fatura' },
        matches: [
          { translation: 'Fatura', match: 0.99 },
          { translation: 'hesap', match: 1 },
          { translation: 'Açık fatura dökümü listesi hazır.', match: 0.99 },
          { translation: 'Fatura, faturalar', match: 0.66 },
          { translation: 'İNDİRİM', match: '0.97' },
        ],
      },
      true,
    )
    expect(c).toEqual({ ana: 'fatura', secenekler: ['hesap', 'indirim'] })
  })

  it('kota uyarısı ya da hata durumunda öneri yok', () => {
    expect(ceviriAyikla({ responseStatus: 429, responseData: { translatedText: 'x' } }, true)).toBeNull()
    expect(ceviriAyikla({ responseStatus: 200, responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS' } }, true)).toBeNull()
  })

  it('cümle çevirisi olduğu gibi kalır', () => {
    expect(ceviriAyikla({ responseStatus: 200, responseData: { translatedText: 'Pencereyi kapatıyorum.' } }, false)).toEqual({
      ana: 'Pencereyi kapatıyorum.',
      secenekler: [],
    })
  })
})
