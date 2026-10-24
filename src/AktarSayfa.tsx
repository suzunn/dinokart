// Duocards (ya da Anki/Excel) CSV dosyasından kelime aktarma sayfası.
import { useMemo, useRef, useState } from 'react'
import { AKTARMA_GUNLUK, eslesmeTahmin, metneCevir, satirlariAl, tabloyaCevir, type AktarilacakSatir, type Eslesme, type Tablo } from './aktar'
import { Kelime } from './KartYuz'
import { DILLER, DIL_SIRASI, type Dil, type Kart } from './kart'

export const anahtar = (dil: Dil, kelime: string) => dil + ':' + kelime.trim().toLocaleLowerCase()

export default function AktarSayfa({
  kartlar,
  aktar,
  kapat,
}: {
  kartlar: Kart[]
  aktar: (satirlar: AktarilacakSatir[], dil: Dil) => void
  kapat: () => void
}) {
  const [tablo, setTablo] = useState<Tablo | null>(null)
  const [eslesme, setEslesme] = useState<Eslesme>({ kelime: 0, anlam: 1, cumle: -1 })
  const [dil, setDil] = useState<Dil | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const dosyaEl = useRef<HTMLInputElement>(null)

  const dosyaOku = async (f: File) => {
    setHata(null)
    try {
      const t = tabloyaCevir(metneCevir(await f.arrayBuffer()))
      if (!t.satirlar.length || Math.max(...t.satirlar.map(r => r.length)) < 2) throw new Error()
      setTablo(t)
      setEslesme(eslesmeTahmin(t))
    } catch {
      setHata('Bu dosyada kelime bulunamadı. Duocards\'tan inen .csv dosyasını seçtiğinden emin ol.')
    }
  }

  const satirlar = useMemo(() => (tablo ? satirlariAl(tablo, eslesme) : []), [tablo, eslesme])
  const mevcut = useMemo(() => new Set(kartlar.map(k => anahtar(k.dil, k.kelime))), [kartlar])
  const yeni = useMemo(() => {
    if (!dil) return satirlar
    const gorulen = new Set<string>()
    return satirlar.filter(r => {
      const a = anahtar(dil, r.kelime)
      if (mevcut.has(a) || gorulen.has(a)) return false
      gorulen.add(a)
      return true
    })
  }, [satirlar, dil, mevcut])

  const sutunSay = tablo ? Math.max(...tablo.satirlar.slice(0, 20).map(r => r.length)) : 0
  const sutunAdi = (i: number) => {
    const ornek = tablo?.satirlar.find(r => r[i])?.[i] ?? ''
    const ad = tablo?.baslik?.[i] || `${i + 1}. sütun`
    return ornek ? `${ad} (ör. ${ornek.length > 24 ? ornek.slice(0, 24) + '…' : ornek})` : ad
  }
  const sutunSec = (alan: keyof Eslesme, bosOlabilir = false) => (
    <select value={eslesme[alan]} onChange={e => setEslesme(s => ({ ...s, [alan]: Number(e.target.value) }))}>
      {bosOlabilir && <option value={-1}>Yok</option>}
      {Array.from({ length: sutunSay }, (_, i) => (
        <option key={i} value={i}>
          {sutunAdi(i)}
        </option>
      ))}
    </select>
  )

  const gun = Math.ceil(yeni.length / AKTARMA_GUNLUK)

  return (
    <div className="aktar">
      <header className="baslik">
        <h1>Duocards'tan aktar</h1>
      </header>

      {!tablo ? (
        <>
          <ol className="adimlar">
            <li>
              Telefonda ya da bilgisayarda tarayıcıdan <strong>app.duocards.com</strong>'a gir (uygulamada bu düğme yok).
            </li>
            <li>Kartlarının listesinde (Memo's Garden) indirme simgesine bas; bir .csv dosyası iner.</li>
            <li>O dosyayı aşağıdan seç. Anki, Excel ya da Google Sheets'ten alınmış .csv de olur.</li>
          </ol>
          {hata && <p className="uyari">{hata}</p>}
          <div className="form-alt">
            <button type="button" className="dugme ikincil" onClick={kapat}>
              Vazgeç
            </button>
            <button type="button" className="dugme ana" onClick={() => dosyaEl.current?.click()}>
              Dosya seç
            </button>
          </div>
        </>
      ) : (
        <div className="form">
          <div className="alan">
            <span className="alan-ad">Bu dosyadaki kelimeler hangi dilde?</span>
            <div className="dil-sec" role="radiogroup" aria-label="Dil">
              {DIL_SIRASI.map(d => (
                <button
                  type="button"
                  key={d}
                  role="radio"
                  aria-checked={dil === d}
                  className={`dil-hap dil-${d}` + (dil === d ? ' secili' : '')}
                  onClick={() => setDil(d)}
                >
                  <span aria-hidden="true">{DILLER[d].bayrak}</span> {DILLER[d].ad}
                </button>
              ))}
            </div>
            <span className="alan-not">Dosyada birden çok dil varsa her dil için ayrı dışa aktarıp ayrı ayrı yükle.</span>
          </div>

          <label className="alan">
            <span className="alan-ad">Kelime sütunu</span>
            {sutunSec('kelime')}
          </label>
          <label className="alan">
            <span className="alan-ad">Türkçesi sütunu</span>
            {sutunSec('anlam')}
          </label>
          <button
            type="button"
            className="metin-dugme sola"
            onClick={() => setEslesme(s => ({ ...s, kelime: s.anlam, anlam: s.kelime }))}
          >
            Kelime ile Türkçesinin yerini değiştir
          </button>
          <label className="alan">
            <span className="alan-ad">Örnek cümle sütunu</span>
            {sutunSec('cumle', true)}
          </label>

          <div className="onizleme-liste">
            <span className="alan-ad">Önizleme</span>
            <ul className="liste">
              {satirlar.slice(0, 5).map((r, i) => (
                <li key={i} className="liste-satir">
                  <span className="liste-metin">
                    <Kelime kelime={r.kelime} dil={dil ?? 'en'} />
                    <span className="liste-anlam">{r.anlam}</span>
                    {r.cumle && <span className="liste-anlam">{r.cumle}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="alan-not">
            {satirlar.length} kelime bulundu
            {dil && satirlar.length !== yeni.length && <>, {satirlar.length - yeni.length} tanesi zaten var (atlanacak)</>}.
            {yeni.length > AKTARMA_GUNLUK && (
              <> Önüne yığılmasın diye her gün {AKTARMA_GUNLUK} yenisi açılır, hepsi {gun} günde gelir.</>
            )}
          </p>

          <div className="form-alt">
            <button type="button" className="dugme ikincil" onClick={kapat}>
              Vazgeç
            </button>
            <button type="button" className="dugme ana" disabled={!dil || !yeni.length} onClick={() => dil && aktar(yeni, dil)}>
              {dil ? `${yeni.length} kelimeyi ekle` : 'Önce dili seç'}
            </button>
          </div>
        </div>
      )}

      <input
        ref={dosyaEl}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
        hidden
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) dosyaOku(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
