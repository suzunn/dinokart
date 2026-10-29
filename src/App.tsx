import { useEffect, useMemo, useRef, useState } from 'react'
import AktarSayfa from './AktarSayfa'
import Ayarlar from './Ayarlar'
import { ingilizceGibi, type AktarilacakSatir } from './aktar'
import Calisma from './Calisma'
import { cevir } from './ceviri'
import { cumleBul } from './cumle'
import Form, { type FormAlani } from './Form'
import { Kelime } from './KartYuz'
import { kaliciIste, kaydet, yukle, type Veri } from './depo'
import { DILLER, DIL_SIRASI, TUR_BOYU, asama, bilemedim, bildim, gunAnahtari, gunEkle, kelimeAnahtari, seri, tekrarSirasi, yeniKart, type Dil, type Kart } from './kart'

export const KULLANICI = 'Elif'

type Sekme = 'calis' | 'ekle' | 'liste' | 'ayarlar'

const iosTarayicida = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(navigator as Navigator & { standalone?: boolean }).standalone &&
  !matchMedia('(display-mode: standalone)').matches

export default function App() {
  const [veri, setVeri] = useState<Veri>(yukle)
  const [sekme, setSekme] = useState<Sekme>('calis')
  const [tur, setTur] = useState<{ sira: string[]; dil?: Dil } | null>(null)
  const [duzenle, setDuzenle] = useState<Kart | null>(null)
  const [bildirim, setBildirim] = useState<string | null>(null)
  const bildirimZaman = useRef<number>(0)
  const [aktarAcik, setAktarAcik] = useState(false)
  const [cumleIsi, setCumleIsi] = useState<{ bitti: number; toplam: number } | null>(null)
  const veriRef = useRef(veri)
  veriRef.current = veri

  useEffect(kaliciIste, [])
  useEffect(() => {
    if (!kaydet(veri)) bildir('Kaydedilemedi: telefonda yer kalmamış olabilir')
  }, [veri])

  const bildir = (m: string) => {
    setBildirim(m)
    clearTimeout(bildirimZaman.current)
    bildirimZaman.current = window.setTimeout(() => setBildirim(null), 2400)
  }

  const turBaslat = (dil?: Dil) => {
    const sira = tekrarSirasi(veri.kartlar, Date.now(), dil).slice(0, TUR_BOYU).map(k => k.id)
    if (sira.length) setTur({ sira, dil })
  }

  const isle = (id: string, bildi: boolean) => {
    const simdi = Date.now()
    setVeri(v => {
      const gun = gunAnahtari(simdi)
      return {
        ...v,
        kartlar: v.kartlar.map(k => (k.id === id ? (bildi ? bildim(k, simdi) : bilemedim(k, simdi)) : k)),
        gunler: v.gunler.includes(gun) ? v.gunler : [...v.gunler, gun],
      }
    })
  }

  const ekle = (a: FormAlani) => {
    setVeri(v => {
      const no = v.kartlar.reduce((m, k) => Math.max(m, k.no), 0) + 1
      return { ...v, sonDil: a.dil, kartlar: [...v.kartlar, yeniKart(a, no, Date.now())] }
    })
    bildir(`Kaydedildi: ${a.kelime}`)
  }

  // İçe aktarılan kartlar günde `gunluk` tanesi açılacak şekilde sıraya konur. Anlamı İngilizce görünenler
  // işaretlenir; eksik tamamlama onları Türkçeye çevirir.
  const topluEkle = (satirlar: AktarilacakSatir[], dil: Dil, gunluk: number, turkceyeCevir: boolean) => {
    const simdi = Date.now()
    setVeri(v => {
      let no = v.kartlar.reduce((m, k) => Math.max(m, k.no), 0)
      const yeni = satirlar.map((r, i) => ({
        ...yeniKart({ dil, kelime: r.kelime, anlam: r.anlam, cumle: r.cumle }, ++no, simdi + i),
        sonraki: i < gunluk ? simdi : gunEkle(simdi, Math.floor(i / gunluk)),
        ...(turkceyeCevir && ingilizceGibi(r.anlam) ? { ceviriBekliyor: true } : {}),
      }))
      return { ...v, sonDil: dil, kartlar: [...v.kartlar, ...yeni] }
    })
    setAktarAcik(false)
    setTamamlaBaslat(true)
    bildir(`${satirlar.length} kelime eklendi`)
  }

  // Eksik tamamlama: cümlesi olmayan karta cümle (ve çevirisi), anlamı İngilizce kalan karta Türkçesi.
  // Sırayla ve aralıklı gider ki sitelere yüklenmesin; yarıda kalırsa düğmeyle devam edilir.
  const tamamlaniyor = useRef(false)
  const eksik = (k: Kart) => !k.cumle || !!k.ceviriBekliyor
  const eksikleriTamamla = async () => {
    if (tamamlaniyor.current) return
    tamamlaniyor.current = true
    const denenen = new Set<string>()
    let bitti = 0
    let duzelen = 0
    const kalan = () => veriRef.current.kartlar.filter(k => eksik(k) && !denenen.has(k.id))
    // Aktarma sürerken eklenen yeni dosyanın kartları da aynı işte toplanır
    for (let sira = kalan(); sira.length; sira = kalan()) {
      for (const k of sira) {
        denenen.add(k.id)
        setCumleIsi({ bitti, toplam: bitti + kalan().length + 1 })
        const degisim: Partial<Kart> = {}
        try {
          if (k.ceviriBekliyor) {
            const c = await cevir(k.kelime, k.dil, true)
            if (c) Object.assign(degisim, { anlam: c.ana, not: [k.not, 'Duocards: ' + k.anlam].filter(Boolean).join('\n'), ceviriBekliyor: undefined })
          }
          if (!k.cumle) {
            const aday = (await cumleBul(k.kelime, k.dil))[0]
            if (aday) {
              const ceviri = aday.ceviri ?? (await cevir(aday.cumle, k.dil, false).catch(() => null))?.ana
              Object.assign(degisim, { cumle: aday.cumle, cumleTr: ceviri })
            }
          }
        } catch {
          // internet yoksa ya da site yanıt vermezse o kart bu sefer atlanır
        }
        if (Object.keys(degisim).length) {
          duzelen++
          setVeri(v => ({ ...v, kartlar: v.kartlar.map(x => (x.id === k.id ? { ...x, ...degisim, guncelleme: Date.now() } : x)) }))
        }
        bitti++
        await new Promise(r => setTimeout(r, 300))
      }
    }
    tamamlaniyor.current = false
    setCumleIsi(null)
    bildir(`${duzelen} kart tamamlandı`)
  }

  // Aktarmadan sonra kayıt ekrana yansıyınca tamamlama kendiliğinden başlar
  const [tamamlaBaslat, setTamamlaBaslat] = useState(false)
  useEffect(() => {
    if (!tamamlaBaslat) return
    setTamamlaBaslat(false)
    eksikleriTamamla()
  })

  const guncelle = (id: string, a: FormAlani) => {
    setVeri(v => ({
      ...v,
      kartlar: v.kartlar.map(k =>
        k.id === id ? { ...k, ...a, cumle: a.cumle, cumleTr: a.cumleTr, not: a.not, guncelleme: Date.now() } : k,
      ),
    }))
    setDuzenle(null)
    bildir('Değişiklikler kaydedildi')
  }

  const sil = (id: string) => {
    setVeri(v => ({ ...v, kartlar: v.kartlar.filter(k => k.id !== id) }))
    setDuzenle(null)
    bildir('Kart silindi')
  }

  // Çalışırken aşağı kaydırılan kart: kayıttan tamamen çıkar ve bir daha içe aktarılmaz
  const kolaySil = (k: Kart) => {
    const a = kelimeAnahtari(k.dil, k.kelime)
    setVeri(v => ({
      ...v,
      kartlar: v.kartlar.filter(x => x.id !== k.id),
      silinenler: v.silinenler?.includes(a) ? v.silinenler : [...(v.silinenler ?? []), a],
    }))
  }
  const silmeyiGeriAl = (k: Kart) => {
    const a = kelimeAnahtari(k.dil, k.kelime)
    setVeri(v => ({
      ...v,
      kartlar: v.kartlar.some(x => x.id === k.id) ? v.kartlar : [...v.kartlar, k].sort((x, y) => x.no - y.no),
      silinenler: (v.silinenler ?? []).filter(x => x !== a),
    }))
  }

  if (tur) {
    return (
      <Calisma
        key={tur.sira.join()}
        ilkSira={tur.sira}
        kartlar={veri.kartlar}
        isle={isle}
        sil={kolaySil}
        geriAl={silmeyiGeriAl}
        kapat={() => setTur(null)}
        devamVar={tekrarSirasi(veri.kartlar, Date.now(), tur.dil).length > 0}
        devam={() => turBaslat(tur.dil)}
      />
    )
  }

  return (
    <div className="kabuk">
      <main className="icerik">
        {sekme === 'calis' && <Ana veri={veri} basla={turBaslat} ekle={() => setSekme('ekle')} />}
        {sekme === 'ekle' && (
          <>
            <header className="baslik">
              <h1>Yeni kelime</h1>
            </header>
            <Form kartlar={veri.kartlar} ilkDil={veri.sonDil} kaydet={ekle} />
          </>
        )}
        {sekme === 'liste' && <Liste veri={veri} sec={setDuzenle} />}
        {sekme === 'ayarlar' && (
          <Ayarlar
            veri={veri}
            setVeri={setVeri}
            bildir={bildir}
            aktarAc={() => setAktarAcik(true)}
            cumleIsi={cumleIsi}
            eksikleriTamamla={eksikleriTamamla}
          />
        )}
      </main>

      <nav className="sekmeler">
        {(
          [
            ['calis', 'Çalış'],
            ['ekle', 'Ekle'],
            ['liste', 'Kelimeler'],
            ['ayarlar', 'Ayarlar'],
          ] as [Sekme, string][]
        ).map(([s, ad]) => (
          <button key={s} className={sekme === s ? 'secili' : ''} aria-current={sekme === s ? 'page' : undefined} onClick={() => setSekme(s)}>
            <SekmeIkon s={s} />
            {ad}
          </button>
        ))}
      </nav>

      {duzenle && (
        <div className="sayfa-arka" onClick={() => setDuzenle(null)}>
          <div className="sayfa" role="dialog" aria-label="Kartı düzenle" onClick={e => e.stopPropagation()}>
            <header className="baslik">
              <h1>Nº {duzenle.no}</h1>
            </header>
            <Form
              kartlar={veri.kartlar}
              ilkDil={duzenle.dil}
              kart={duzenle}
              kaydet={a => guncelle(duzenle.id, a)}
              sil={() => sil(duzenle.id)}
              vazgec={() => setDuzenle(null)}
            />
          </div>
        </div>
      )}

      {aktarAcik && (
        <div className="sayfa-arka" onClick={() => setAktarAcik(false)}>
          <div className="sayfa" role="dialog" aria-label="Duocards'tan aktar" onClick={e => e.stopPropagation()}>
            <AktarSayfa kartlar={veri.kartlar} silinenler={veri.silinenler ?? []} aktar={topluEkle} kapat={() => setAktarAcik(false)} />
          </div>
        </div>
      )}

      {bildirim && (
        <div className="bildirim" role="status">
          {bildirim}
        </div>
      )}
    </div>
  )
}

function SekmeIkon({ s }: { s: Sekme }) {
  const ortak = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (s === 'calis')
    return (
      <svg {...ortak}>
        <rect x="6" y="3.5" width="13" height="17" rx="2.5" transform="rotate(8 12.5 12)" />
        <rect x="4" y="4" width="13" height="17" rx="2.5" fill="var(--zemin)" />
      </svg>
    )
  if (s === 'ekle')
    return (
      <svg {...ortak}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    )
  if (s === 'ayarlar')
    return (
      <svg {...ortak}>
        <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </svg>
    )
  return (
    <svg {...ortak}>
      <path d="M8 6.5h11M8 12h11M8 17.5h11" />
      <circle cx="4.5" cy="6.5" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="17.5" r="1" fill="currentColor" />
    </svg>
  )
}

/* ---------- ana ekran ---------- */

function Ana({ veri, basla, ekle }: { veri: Veri; basla: (dil?: Dil) => void; ekle: () => void }) {
  const simdi = Date.now()
  const bekleyen = tekrarSirasi(veri.kartlar, simdi)
  const gunSeri = seri(veri.gunler, simdi)
  const bugunCalisti = veri.gunler.includes(gunAnahtari(simdi))
  const [kurulumIpucu] = useState(iosTarayicida)

  return (
    <>
      <header className="baslik ana-baslik">
        <h1>Merhaba {KULLANICI}</h1>
        {gunSeri > 0 && (
          <p className="seri" title="Art arda çalıştığın gün">
            <span aria-hidden="true">🦕</span> {gunSeri} gün{bugunCalisti ? '' : ', bugün de çalışırsan ' + (gunSeri + 1)}
          </p>
        )}
      </header>

      {kurulumIpucu && (
        <div className="kutu-not">
          <strong>Önce ana ekrana ekle.</strong> Safari'de Paylaş düğmesine, sonra "Ana Ekrana Ekle"ye dokun ve
          uygulamayı oradan aç. Kelimeler eklediğin yerde saklanır; Safari'de eklediklerin uygulamaya taşınmaz.
        </div>
      )}

      {veri.kartlar.length === 0 ? (
        <div className="bos-ekran">
          <div className="bos-kart" aria-hidden="true">
            <span className="kelime cins-n">das Fenster</span>
            <span className="bos-anlam">pencere</span>
          </div>
          <p>İlk kelimeni ekleyince kartı burada çalışırsın. Örnek cümleyi uygulama bulur.</p>
          <button className="dugme ana" onClick={ekle}>
            İlk kelimeni ekle
          </button>
        </div>
      ) : (
        <>
          <section className="bugun">
            <p className="bugun-sayi">{bekleyen.length}</p>
            <p className="bugun-yazi">
              {bekleyen.length === 0
                ? 'Bugünlük kart kalmadı. Yeni kelime ekleyebilir ya da yarın gelebilirsin.'
                : 'kart bugün seni bekliyor'}
            </p>
            {bekleyen.length > 0 && (
              <button className="dugme ana genis" onClick={() => basla()}>
                Çalışmaya başla
                {bekleyen.length > TUR_BOYU && <span className="dugme-ek"> ilk {TUR_BOYU} kart</span>}
              </button>
            )}
          </section>

          <section className="diller">
            {DIL_SIRASI.map(d => {
              const hepsi = veri.kartlar.filter(k => k.dil === d)
              const vakti = bekleyen.filter(k => k.dil === d).length
              const oturdu = hepsi.filter(k => asama(k) === 'oturdu').length
              const ogreniyor = hepsi.filter(k => asama(k) === 'ogreniyor').length
              return (
                <button key={d} className={`dil-satir dil-${d}`} disabled={!vakti} onClick={() => basla(d)}>
                  <span className="dil-bayrak" aria-hidden="true">
                    {DILLER[d].bayrak}
                  </span>
                  <span className="dil-bilgi">
                    <span className="dil-ad">{DILLER[d].ad}</span>
                    <span className="dil-alt">
                      {hepsi.length ? `${hepsi.length} kelime: ${oturdu} oturdu, ${ogreniyor} öğreniyor` : 'Henüz kelime yok'}
                    </span>
                    {hepsi.length > 0 && (
                      <span className="dil-cubuk" aria-hidden="true">
                        <i style={{ width: (oturdu / hepsi.length) * 100 + '%' }} />
                        <i className="ogreniyor" style={{ width: (ogreniyor / hepsi.length) * 100 + '%' }} />
                      </span>
                    )}
                  </span>
                  <span className="dil-vakti">{vakti > 0 ? vakti : hepsi.length ? '✓' : ''}</span>
                </button>
              )
            })}
          </section>
          <p className="aciklama">
            Oturdu: artık haftada bir sorulacak kadar iyi bildiğin kelime. İlk görüşte bildiğin kelime hemen oturur;
            yanıldığın kelime birkaç gün arayla bilince oturur.
          </p>
        </>
      )}
    </>
  )
}

/* ---------- kelime listesi ---------- */

const ASAMA_AD = { yeni: 'Yeni', ogreniyor: 'Öğreniyor', oturdu: 'Oturdu' }

// Binlerce kelimede telefon yavaşlamasın diye liste parça parça gösterilir
const LISTE_PARCA = 100

function Liste({ veri, sec }: { veri: Veri; sec: (k: Kart) => void }) {
  const [ara, setAra] = useState('')
  const [dil, setDil] = useState<Dil | 'hepsi'>('hepsi')
  const [gosterilen, setGosterilen] = useState(LISTE_PARCA)

  const liste = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase('tr')
    return veri.kartlar
      .filter(k => (dil === 'hepsi' || k.dil === dil) && (!q || (k.kelime + ' ' + k.anlam).toLocaleLowerCase('tr').includes(q)))
      .sort((a, b) => b.no - a.no)
  }, [veri.kartlar, ara, dil])

  return (
    <>
      <header className="baslik">
        <h1>Kelimeler</h1>
        <p className="baslik-alt">{veri.kartlar.length} kart</p>
      </header>

      <input
        className="arama"
        type="search"
        value={ara}
        onChange={e => {
          setAra(e.target.value)
          setGosterilen(LISTE_PARCA)
        }}
        placeholder="Kelime ya da anlam ara"
      />
      <div className="filtre">
        {(['hepsi', ...DIL_SIRASI] as const).map(d => (
          <button
            key={d}
            className={dil === d ? 'secili' : ''}
            onClick={() => {
              setDil(d)
              setGosterilen(LISTE_PARCA)
            }}
          >
            {d === 'hepsi' ? 'Hepsi' : DILLER[d].bayrak + ' ' + DILLER[d].ad}
          </button>
        ))}
      </div>

      {liste.length === 0 ? (
        <p className="liste-bos">{veri.kartlar.length ? 'Aramaya uyan kelime yok.' : 'Eklediğin kelimeler burada listelenir.'}</p>
      ) : (
        <ul className="liste">
          {liste.slice(0, gosterilen).map(k => {
            const a = asama(k)
            return (
              <li key={k.id}>
                <button onClick={() => sec(k)}>
                  <span className="liste-no">{k.no}</span>
                  <span className="liste-metin">
                    <Kelime kelime={k.kelime} dil={k.dil} />
                    <span className="liste-anlam">{k.anlam}</span>
                  </span>
                  <span className={'asama asama-' + a}>{ASAMA_AD[a]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {liste.length > gosterilen && (
        <button className="dugme ikincil genis liste-devam" onClick={() => setGosterilen(g => g + LISTE_PARCA)}>
          {Math.min(LISTE_PARCA, liste.length - gosterilen)} kelime daha göster ({liste.length - gosterilen} kaldı)
        </button>
      )}

    </>
  )
}
