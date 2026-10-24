// Kelime ekleme ve düzenleme formu. Kelime yazılınca örnek cümle kendiliğinden aranır.
import { useEffect, useRef, useState } from 'react'
import { cumleBul } from './cumle'
import { Cumle, Kelime, SesDugmesi } from './KartYuz'
import { DILLER, DIL_SIRASI, type CumleAdayi, type Dil, type Kart } from './kart'

export interface FormAlani {
  dil: Dil
  kelime: string
  anlam: string
  cumle?: string
  cumleTr?: string
  not?: string
}

const ORNEK: Record<Dil, string> = { en: 'ör. window, to run', de: 'ör. das Fenster', fr: 'ör. la fenêtre' }
const ARTIKEL_IPUCU: Partial<Record<Dil, [string, string][]>> = {
  de: [['der', 'm'], ['die', 'f'], ['das', 'n']],
  fr: [['le', 'm'], ['la', 'f']],
}

type Arama = 'bos' | 'araniyor' | 'bulundu' | 'yok' | 'hata'

export default function Form({
  kartlar,
  ilkDil,
  kart,
  kaydet,
  sil,
  vazgec,
}: {
  kartlar: Kart[]
  ilkDil: Dil
  kart?: Kart
  kaydet: (a: FormAlani) => void
  sil?: () => void
  vazgec?: () => void
}) {
  const [dil, setDil] = useState<Dil>(kart?.dil ?? ilkDil)
  const [kelime, setKelime] = useState(kart?.kelime ?? '')
  const [anlam, setAnlam] = useState(kart?.anlam ?? '')
  const [cumle, setCumle] = useState<CumleAdayi | null>(kart?.cumle ? { cumle: kart.cumle, ceviri: kart.cumleTr } : null)
  const [adaylar, setAdaylar] = useState<CumleAdayi[]>([])
  const [arama, setArama] = useState<Arama>(kart?.cumle ? 'bulundu' : 'bos')
  const [elle, setElle] = useState(false)
  const [not, setNot] = useState(kart?.not ?? '')
  const [notAcik, setNotAcik] = useState(!!kart?.not)
  const [silOnay, setSilOnay] = useState(false)
  const kelimeEl = useRef<HTMLInputElement>(null)
  const aramaKimligi = useRef(0)
  const arananKelime = useRef(kart ? kart.dil + kart.kelime : '')

  const temiz = kelime.trim()
  const ayni = temiz
    ? kartlar.find(k => k.id !== kart?.id && k.dil === dil && k.kelime.trim().toLocaleLowerCase() === temiz.toLocaleLowerCase())
    : undefined

  const cumleAra = async (zorla = false) => {
    if (!temiz || elle) return
    const anahtar = dil + temiz
    if (!zorla && arananKelime.current === anahtar) return
    arananKelime.current = anahtar
    const kimlik = ++aramaKimligi.current
    setArama('araniyor')
    try {
      const sonuc = await cumleBul(temiz, dil)
      if (kimlik !== aramaKimligi.current) return
      setAdaylar(sonuc)
      setCumle(sonuc[0] ?? null)
      setArama(sonuc.length ? 'bulundu' : 'yok')
    } catch {
      if (kimlik !== aramaKimligi.current) return
      setArama('hata')
    }
  }

  // Dil değişince eski dildeki cümle artık geçersiz
  useEffect(() => {
    if (!kart || dil !== kart.dil) {
      if (arananKelime.current && !arananKelime.current.startsWith(dil)) {
        setCumle(null)
        setAdaylar([])
        setArama('bos')
        arananKelime.current = ''
      }
    }
  }, [dil, kart])

  const baskaCumle = () => {
    if (!adaylar.length) return cumleAra(true)
    const i = adaylar.findIndex(a => a.cumle === cumle?.cumle)
    setCumle(adaylar[(i + 1) % adaylar.length])
  }

  const gonder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!temiz || !anlam.trim()) return
    const c = cumle?.cumle.trim()
    kaydet({
      dil,
      kelime: temiz,
      anlam: anlam.trim(),
      cumle: c || undefined,
      cumleTr: c ? cumle?.ceviri?.trim() || undefined : undefined,
      not: not.trim() || undefined,
    })
    if (!kart) {
      setKelime('')
      setAnlam('')
      setCumle(null)
      setAdaylar([])
      setArama('bos')
      setElle(false)
      setNot('')
      setNotAcik(false)
      arananKelime.current = ''
      kelimeEl.current?.focus()
    }
  }

  return (
    <form className="form" onSubmit={gonder}>
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

      <label className="alan">
        <span className="alan-ad">Kelime</span>
        <input
          ref={kelimeEl}
          value={kelime}
          onChange={e => setKelime(e.target.value)}
          onBlur={() => cumleAra()}
          placeholder={ORNEK[dil]}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          lang={DILLER[dil].ses}
          enterKeyHint="next"
          required
        />
      </label>
      {ARTIKEL_IPUCU[dil] && (
        <p className="alan-not">
          Artikeliyle yaz, kart rengi ona göre olsun:{' '}
          {ARTIKEL_IPUCU[dil]!.map(([a, c]) => (
            <span key={a} className={'kelime cins-' + c}>
              {a}{' '}
            </span>
          ))}
        </p>
      )}
      {ayni && (
        <p className="uyari" role="status">
          Bu kelime zaten var: Nº {ayni.no}, "{ayni.anlam}"
        </p>
      )}

      <label className="alan">
        <span className="alan-ad">Türkçesi</span>
        <input
          value={anlam}
          onChange={e => setAnlam(e.target.value)}
          onFocus={() => cumleAra()}
          placeholder="ör. pencere"
          enterKeyHint="done"
          required
        />
      </label>

      <div className="cumle-kutu">
        <div className="cumle-baslik">
          <span className="alan-ad">Örnek cümle</span>
          {!elle && (
            <button type="button" className="metin-dugme" onClick={() => setElle(true)}>
              Kendim yazayım
            </button>
          )}
        </div>
        {elle ? (
          <>
            <textarea
              value={cumle?.cumle ?? ''}
              onChange={e => setCumle({ cumle: e.target.value, ceviri: cumle?.ceviri })}
              rows={2}
              lang={DILLER[dil].ses}
              placeholder="Kelimenin geçtiği bir cümle"
            />
            <textarea
              value={cumle?.ceviri ?? ''}
              onChange={e => setCumle({ cumle: cumle?.cumle ?? '', ceviri: e.target.value })}
              rows={2}
              placeholder="Cümlenin Türkçesi (isteğe bağlı)"
            />
            <button
              type="button"
              className="metin-dugme"
              onClick={() => {
                setElle(false)
                cumleAra(true)
              }}
            >
              Cümleyi uygulama bulsun
            </button>
          </>
        ) : arama === 'araniyor' ? (
          <p className="cumle-durum">Cümle aranıyor…</p>
        ) : cumle ? (
          <>
            <p className="cumle onizleme">
              <Cumle cumle={cumle.cumle} kelime={temiz} dil={dil} />
              <SesDugmesi metin={cumle.cumle} dil={dil} etiket="Cümleyi oku" kucuk />
            </p>
            {cumle.ceviri && <p className="cumle-tr">{cumle.ceviri}</p>}
            <div className="cumle-eylem">
              <button type="button" className="metin-dugme" onClick={baskaCumle}>
                Başka cümle
              </button>
              <button
                type="button"
                className="metin-dugme"
                onClick={() => {
                  setCumle(null)
                  setArama('yok')
                }}
              >
                Cümlesiz kaydet
              </button>
            </div>
          </>
        ) : arama === 'yok' ? (
          <p className="cumle-durum">
            Bu kelimeyle cümle bulunamadı. Kendin yazabilir ya da cümlesiz kaydedebilirsin.
          </p>
        ) : arama === 'hata' ? (
          <p className="cumle-durum">
            İnternete ulaşılamadı.{' '}
            <button type="button" className="metin-dugme" onClick={() => cumleAra(true)}>
              Tekrar dene
            </button>
          </p>
        ) : temiz ? (
          <button type="button" className="metin-dugme sola" onClick={() => cumleAra(true)}>
            Cümle bul
          </button>
        ) : (
          <p className="cumle-durum">Kelimeyi yazınca cümle kendiliğinden gelir.</p>
        )}
      </div>

      {notAcik ? (
        <label className="alan">
          <span className="alan-ad">Not</span>
          <textarea value={not} onChange={e => setNot(e.target.value)} rows={2} placeholder="Nerede gördün, nasıl aklında kalır?" />
        </label>
      ) : (
        <button type="button" className="metin-dugme sola" onClick={() => setNotAcik(true)}>
          + Not ekle
        </button>
      )}

      {temiz && (
        <p className="onizleme-satir" aria-hidden="true">
          <Kelime kelime={temiz} dil={dil} /> {anlam.trim() && <>= {anlam.trim()}</>}
        </p>
      )}

      <div className="form-alt">
        {vazgec && (
          <button type="button" className="dugme ikincil" onClick={vazgec}>
            Vazgeç
          </button>
        )}
        <button type="submit" className="dugme ana" disabled={!temiz || !anlam.trim()}>
          Kaydet
        </button>
      </div>

      {sil &&
        (silOnay ? (
          <div className="sil-onay">
            <span>Kart silinsin mi?</span>
            <button type="button" className="metin-dugme tehlike" onClick={sil}>
              Evet, sil
            </button>
            <button type="button" className="metin-dugme" onClick={() => setSilOnay(false)}>
              Hayır
            </button>
          </div>
        ) : (
          <button type="button" className="metin-dugme tehlike sola" onClick={() => setSilOnay(true)}>
            Kartı sil
          </button>
        ))}
    </form>
  )
}
