// Çalışma turu: dokun = çevir, sağa kaydır = bildim, sola kaydır = tekrar gelsin,
// aşağı kaydır = çok kolay, kart tamamen silinir (birkaç saniye geri alınabilir).
import { useEffect, useRef, useState } from 'react'
import { ArkaYuz, OnYuz } from './KartYuz'
import type { Kart } from './kart'

const ESIK = 90 // px: bu kadar yana kaydırılınca karar verilmiş sayılır
const ESIK_ASAGI = 120 // px: silme daha bilinçli bir hareket istesin diye eşik daha yüksek
const GERI_ARA = 3 // bilinmeyen kart bu kadar kart sonra yeniden gelir
const GERI_AL_SURE = 6000

export default function Calisma({
  ilkSira,
  kartlar,
  isle,
  sil,
  geriAl,
  kapat,
  devamVar,
  devam,
}: {
  ilkSira: string[]
  kartlar: Kart[]
  isle: (id: string, bildi: boolean) => void
  sil: (k: Kart) => void
  geriAl: (k: Kart) => void
  kapat: () => void
  devamVar: boolean
  devam: () => void
}) {
  const [sira, setSira] = useState(ilkSira)
  const [acik, setAcik] = useState(false)
  const [cikis, setCikis] = useState<'sol' | 'sag' | 'asagi' | null>(null)
  const [sonuc, setSonuc] = useState({ bildim: 0, bilemedim: 0, silinen: 0 })
  const [sonSilinen, setSonSilinen] = useState<Kart | null>(null)
  const kartEl = useRef<HTMLDivElement>(null)
  const surukle = useRef({ x0: 0, y0: 0, dx: 0, dy: 0, aktif: false })
  const geriAlZaman = useRef(0)

  const kart = kartlar.find(k => k.id === sira[0])
  const siradaki = kartlar.find(k => k.id === sira[1])
  const bitti = !kart
  const toplam = ilkSira.length - sonuc.silinen
  const ilerleme = toplam > 0 ? Math.min(sonuc.bildim / toplam, 1) : 1

  const karar = (bildi: boolean) => {
    if (!kart || cikis) return
    navigator.vibrate?.(bildi ? 12 : [6, 40, 6])
    setCikis(bildi ? 'sag' : 'sol')
    setTimeout(() => {
      isle(kart.id, bildi)
      setSonuc(s => (bildi ? { ...s, bildim: s.bildim + 1 } : { ...s, bilemedim: s.bilemedim + 1 }))
      setSira(s => {
        const kalan = s.slice(1)
        if (bildi) return kalan
        const yer = Math.min(GERI_ARA, kalan.length)
        return [...kalan.slice(0, yer), kart.id, ...kalan.slice(yer)]
      })
      setAcik(false)
      setCikis(null)
    }, 220)
  }

  const kolaySil = () => {
    if (!kart || cikis) return
    navigator.vibrate?.([10, 30, 10])
    setCikis('asagi')
    setTimeout(() => {
      sil(kart)
      setSonuc(s => ({ ...s, silinen: s.silinen + 1 }))
      setSira(s => s.filter(id => id !== kart.id))
      setAcik(false)
      setCikis(null)
      setSonSilinen(kart)
      clearTimeout(geriAlZaman.current)
      geriAlZaman.current = window.setTimeout(() => setSonSilinen(null), GERI_AL_SURE)
    }, 220)
  }

  const silmeyiGeriAl = () => {
    if (!sonSilinen) return
    geriAl(sonSilinen)
    setSira(s => [sonSilinen.id, ...s])
    setSonuc(s => ({ ...s, silinen: s.silinen - 1 }))
    setSonSilinen(null)
    clearTimeout(geriAlZaman.current)
  }

  useEffect(() => () => clearTimeout(geriAlZaman.current), [])

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setAcik(a => !a)
      } else if (e.key === 'ArrowRight') karar(true)
      else if (e.key === 'ArrowLeft') karar(false)
      else if (e.key === 'ArrowDown') kolaySil()
      else if (e.key === 'Escape') kapat()
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  })

  // Hangi yöne baskın kaydırılıyorsa kart o yöne gider; yukarı kaydırmanın anlamı yok, kart yerinde kalır
  const tasi = (dx: number, dy: number, gecis: boolean) => {
    const el = kartEl.current
    if (!el) return
    el.style.transition = gecis ? '' : 'none'
    const asagi = dy > 0 && dy > Math.abs(dx)
    el.style.transform = asagi ? `translateY(${dy}px) scale(${1 - Math.min(dy, 300) / 1500})` : dx ? `translateX(${dx}px) rotate(${dx / 18}deg)` : ''
    el.dataset.yon = asagi ? (dy > 60 ? 'asagi' : '') : dx > 40 ? 'sag' : dx < -40 ? 'sol' : ''
  }

  const bas = (e: React.PointerEvent) => {
    surukle.current = { x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, aktif: true }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const kaydir = (e: React.PointerEvent) => {
    const s = surukle.current
    if (!s.aktif) return
    s.dx = e.clientX - s.x0
    s.dy = e.clientY - s.y0
    if (Math.abs(s.dx) > 6 || Math.abs(s.dy) > 6) tasi(s.dx, s.dy, false)
  }
  const birak = () => {
    const s = surukle.current
    if (!s.aktif) return
    s.aktif = false
    tasi(0, 0, true)
    if (s.dy >= ESIK_ASAGI && s.dy > Math.abs(s.dx)) kolaySil()
    else if (Math.abs(s.dx) >= ESIK && Math.abs(s.dx) > Math.abs(s.dy)) karar(s.dx > 0)
    else if (Math.abs(s.dx) < 6 && Math.abs(s.dy) < 6) setAcik(a => !a)
  }

  const geriAlCubugu = sonSilinen && (
    <div className="geri-al" role="status">
      <span>
        <strong>{sonSilinen.kelime}</strong> silindi
      </span>
      <button type="button" onClick={silmeyiGeriAl}>
        Geri al
      </button>
    </div>
  )

  if (bitti) {
    return (
      <div className="calisma">
        <div className="bitis">
          <p className="bitis-emoji" aria-hidden="true">🦕</p>
          <h2>Tur bitti</h2>
          <p>
            {toplam > 0 && <>{toplam} kelimenin hepsini bildin</>}
            {sonuc.bilemedim > 0 && <>; {sonuc.bilemedim} kez "tekrar gelsin" dedin</>}
            {sonuc.silinen > 0 && <>{toplam > 0 ? '; ' : ''}{sonuc.silinen} kolay kelimeyi sildin</>}.
            {!devamVar && ' Yarın görüşürüz.'}
          </p>
          {devamVar && (
            <button className="dugme ana" onClick={devam}>
              Bir tur daha
            </button>
          )}
          <button className={'dugme ' + (devamVar ? 'ikincil' : 'ana')} onClick={kapat}>
            Kapat
          </button>
        </div>
        {geriAlCubugu}
      </div>
    )
  }

  return (
    <div className="calisma">
      <div className="calisma-ust">
        <button className="kapat" onClick={kapat} aria-label="Turu bitir">
          ✕
        </button>
        <div className="ilerleme" role="progressbar" aria-valuenow={sonuc.bildim} aria-valuemax={toplam}>
          <i style={{ width: ilerleme * 100 + '%' }} />
        </div>
        <span className="sayac">
          {sonuc.bildim}/{toplam}
        </span>
      </div>

      <div className="deste">
        {siradaki && (
          <div className="kart arkadaki" aria-hidden="true">
            <div className="kart-ic">
              <OnYuz k={siradaki} />
            </div>
          </div>
        )}
        <div
          key={kart.id + sira.length}
          ref={kartEl}
          className={'kart' + (acik ? ' acik' : '') + (cikis ? ' cikis-' + cikis : '')}
          onPointerDown={bas}
          onPointerMove={kaydir}
          onPointerUp={birak}
          onPointerCancel={birak}
          role="button"
          tabIndex={0}
          aria-label={acik ? 'Kartın arkası, ön yüze dönmek için dokun' : 'Kartın önü, çevirmek için dokun'}
        >
          <span className="damga sag">Bildim</span>
          <span className="damga sol">Tekrar</span>
          <span className="damga asagi">Çok kolay, sil</span>
          <div className="kart-ic">
            <OnYuz k={kart} />
            <ArkaYuz k={kart} />
          </div>
        </div>
      </div>

      <div className="karar">
        <button className="dugme ikincil" onClick={() => karar(false)}>
          Tekrar gelsin
        </button>
        <button className="dugme ana" onClick={() => karar(true)}>
          Bildim
        </button>
      </div>
      <p className="calisma-ipucu">Çok kolay bir kelimeyse kartı aşağı kaydır, tamamen silinir.</p>
      {geriAlCubugu}
    </div>
  )
}
