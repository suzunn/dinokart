import { describe, expect, it } from 'vitest'
import { aramaKoku, netzverbAyikla, varlikCoz, wiktionaryAyikla, wiktionnaireAyikla } from './sozluk-ayikla.mjs'

describe('Wiktionary', () => {
  const w = `==English==
===Noun===
{{trans-top|opening}}
* Turkish: {{t+|tr|pencere}}, {{t|tr|cam}}
{{trans-bottom}}
===Verb===
{{trans-top|to worry}}
* Turkish: {{t+|tr|üzülmek}}, {{t|tr|pencere}}
{{trans-bottom}}
==Turkish==
* {{t|tr|yanlış}}`
  it('İngilizce bölümünden tekrarsız', () => {
    expect(wiktionaryAyikla(w)).toEqual(['pencere', 'cam', 'üzülmek'])
  })
  it('"to" ile yalnız Verb bölümü', () => {
    expect(wiktionaryAyikla(w, true)).toEqual(['üzülmek', 'pencere'])
  })
  it('Translations alt başlığı üstteki fiile aittir (borrow)', () => {
    const b = `==English==
===Etymology===
from Old English
===Verb===
{{en-verb}}
====Translations====
{{trans-top|to receive temporarily}}
* Turkish: {{t+|tr|ödünç almak}}
{{trans-bottom}}
===Noun===
====Translations====
* Turkish: {{t|tr|borç}}`
    expect(wiktionaryAyikla(b, true)).toEqual(['ödünç almak'])
    expect(wiktionaryAyikla(b)).toEqual(['ödünç almak', 'borç'])
  })
  it('İngilizce bölümü yoksa boş', () => {
    expect(wiktionaryAyikla('==French==\n* {{t|tr|ev}}')).toEqual([])
  })
  it('fiil bölümünde Türkçe yoksa isim anlamı verilmez (Google fiili bulsun)', () => {
    expect(wiktionaryAyikla('==English==\n===Noun===\n* {{t|tr|perde}}\n===Verb===\n* French: {{t|fr|s’inquiéter}}', true)).toEqual([])
  })
})

describe('Netzverb', () => {
  it('Türkçe satırı, iç içe span ve &nbsp; ile', () => {
    const html = `<dd lang="fr"><span class="vLng"><img title="Französisch"></span><span>fenêtre</span></dd>
<dd lang="tr"><span class="vLng"><img loading="lazy" title="Türkisch" alt="Türkisch"
src="/bedeutungenweb/tr.svg" width="13" height="13">&nbsp;</span><span>pencere, cam, camekan, vitrin, <span class="rInf">açıklık</span></span></dd>
<dd lang="ku"><span class="vLng"></span><span>pencere, pencere camı</span></dd>`
    expect(netzverbAyikla(html)).toEqual(['pencere', 'cam', 'camekan', 'vitrin', 'açıklık'])
  })
  it('Türkçe yoksa boş', () => {
    expect(netzverbAyikla('<dd lang="en">window</dd>')).toEqual([])
  })
})

describe('Wiktionnaire', () => {
  it('yalnız Fransızca bölümü', () => {
    const w = `== {{langue|fr}} ==
=== {{S|nom|fr}} ===
{{trad-début}}
* {{T|tr}} : {{trad+|tr|ev}}, {{trad-|tr|mesken}}, {{trad+|tr|ev}}
{{trad-fin}}
== {{langue|en}} ==
* {{T|tr}} : {{trad+|tr|yanlış}}`
    expect(wiktionnaireAyikla(w)).toEqual(['ev', 'mesken'])
  })
})

describe('yardımcılar', () => {
  it('artikel ve to atılır', () => {
    expect(aramaKoku('to borrow', 'en')).toBe('borrow')
    expect(aramaKoku('Der krieg', 'de')).toBe('krieg')
    expect(aramaKoku("l'eau", 'fr')).toBe('eau')
    expect(aramaKoku('la maison', 'fr')).toBe('maison')
  })
  it('HTML varlıkları', () => {
    expect(varlikCoz('T&#xFC;rk&#xE7;e &amp; &#39;x&#39;')).toBe("Türkçe & 'x'")
  })
})
