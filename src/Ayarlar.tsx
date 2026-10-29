// Ayarlar sekmesi: başka uygulamadan aktarma, eksikleri tamamlama, yedek ve uygulama sürümü.
import { useRef, useState } from 'react'
import { birlestir, yedekVer, type Veri } from './depo'
import { SURUM, sonSurumuAl, surumYazisi } from './surum'

export default function Ayarlar({
  veri,
  setVeri,
  bildir,
  aktarAc,
  cumleIsi,
  eksikleriTamamla,
}: {
  veri: Veri
  setVeri: (f: (v: Veri) => Veri) => void
  bildir: (m: string) => void
  aktarAc: () => void
  cumleIsi: { bitti: number; toplam: number } | null
  eksikleriTamamla: () => void
}) {
  const cumlesiz = veri.kartlar.filter(k => !k.cumle).length
  const ingilizce = veri.kartlar.filter(k => k.ceviriBekliyor).length
  const [guncelleniyor, setGuncelleniyor] = useState(false)
  const dosyaEl = useRef<HTMLInputElement>(null)

  const yedekYukle = async (f: File) => {
    try {
      const gelen = JSON.parse(await f.text()) as Partial<Veri>
      if (!Array.isArray(gelen.kartlar)) throw new Error()
      setVeri(v => birlestir(v, gelen))
      bildir(`Yedek yüklendi: ${gelen.kartlar.length} kart`)
    } catch {
      bildir('Bu dosya bir Dinokart yedeği değil')
    }
  }

  const surumAl = async () => {
    setGuncelleniyor(true)
    const s = await sonSurumuAl()
    if (s === 'guncel') {
      setGuncelleniyor(false)
      bildir('Zaten en son sürümdesin')
    }
  }

  return (
    <>
      <header className="baslik">
        <h1>Ayarlar</h1>
      </header>

      <section className="yedek">
        <h2>Uygulama</h2>
        <p>Sürüm: {surumYazisi(SURUM)}</p>
        <div className="yedek-dugmeler">
          <button className="dugme ikincil" disabled={guncelleniyor} onClick={surumAl}>
            {guncelleniyor ? 'Son sürüm alınıyor…' : 'Son sürümü al'}
          </button>
        </div>
      </section>

      <section className="yedek">
        <h2>Başka uygulamadan</h2>
        <p>Duocards'taki kelimelerini dosya olarak indirip buraya ekleyebilirsin.</p>
        <div className="yedek-dugmeler">
          <button className="dugme ikincil" onClick={aktarAc}>
            Duocards'tan aktar
          </button>
        </div>
        {(cumleIsi || cumlesiz > 0 || ingilizce > 0) && (
          <div className="cumle-isi">
            {cumleIsi ? (
              <>
                <p role="status">
                  Kartlar tamamlanıyor: {cumleIsi.bitti}/{cumleIsi.toplam}. Bu sırada uygulamayı kullanabilirsin, sadece kapatma;
                  kapanırsa kaldığı yerden devam ettirebilirsin.
                </p>
                <div className="ilerleme" aria-hidden="true">
                  <i style={{ width: (cumleIsi.bitti / Math.max(cumleIsi.toplam, 1)) * 100 + '%' }} />
                </div>
              </>
            ) : (
              <>
                <p>
                  {[cumlesiz > 0 && `${cumlesiz} kartın örnek cümlesi yok`, ingilizce > 0 && `${ingilizce} kartın anlamı İngilizce`]
                    .filter(Boolean)
                    .join(', ')}
                  .
                </p>
                <button className="dugme ikincil" onClick={eksikleriTamamla}>
                  Eksikleri tamamla
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="yedek">
        <h2>Yedek</h2>
        <p>Kelimeler sadece bu telefonda duruyor. Arada bir yedek alıp Dosyalar'a ya da iCloud'a kaydet.</p>
        <div className="yedek-dugmeler">
          <button
            className="dugme ikincil"
            disabled={!veri.kartlar.length}
            onClick={async () => {
              const s = await yedekVer(veri)
              if (s !== 'iptal') bildir('Yedek hazır')
            }}
          >
            Yedek al
          </button>
          <button className="dugme ikincil" onClick={() => dosyaEl.current?.click()}>
            Yedekten yükle
          </button>
          <input
            ref={dosyaEl}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) yedekYukle(f)
              e.target.value = ''
            }}
          />
        </div>
      </section>
    </>
  )
}
