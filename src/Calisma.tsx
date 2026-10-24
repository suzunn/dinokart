// Çalışma turu: dokun = çevir, sağa kaydır = bildim, sola kaydır = tekrar gelsin.
import { useEffect, useRef, useState } from 'react'
import { ArkaYuz, OnYuz } from './KartYuz'
import type { Kart } from './kart'

const ESIK = 90 // px: bu kadar kaydırılınca karar verilmiş sayılır
const GERI_ARA = 3 // bilinmeyen kart bu kadar kart sonra yeniden gelir

export default function Calisma({
  ilkSira,
  kartlar,
  isle,
  kapat,
  devamVar,
  devam,
}: {
  ilkSira: string[]
  kartlar: Kart[]
  isle: (id: string, bildi: boolean) => void
  kapat: () => void
  devamVar: boolean
  devam: () => void
}) {
  const [sira, setSira] = useState(ilkSira)
  const [acik, setAcik] = useState(false)
  const [cikis, setCikis] = useState<'sol' | 'sag' | null>(null)
  const [sonuc, setSonuc] = useState({ bildim: 0, bilemedim: 0 })
  const kartEl = useRef<HTMLDivElement>(null)
  const surukle = useRef({ x0: 0, y0: 0, dx: 0, aktif: false })

  const kart = kartlar.find(k => k.id === sira[0])
  const siradaki = kartlar.find(k => k.id === sira[1])
  const bitti = !kart
  const ilerleme = ilkSira.length ? Math.min(sonuc.bildim / ilkSira.length, 1) : 1

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

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setAcik(a => !a)
      } else if (e.key === 'ArrowRight') karar(true)
      else if (e.key === 'ArrowLeft') karar(false)
      else if (e.key === 'Escape') kapat()
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  })

  const tasi = (dx: number, gecis: boolean) => {
    const el = kartEl.current
    if (!el) return
    el.style.transition = gecis ? '' : 'none'
    el.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 18}deg)` : ''
    el.dataset.yon = dx > 40 ? 'sag' : dx < -40 ? 'sol' : ''
  }

  const bas = (e: React.PointerEvent) => {
    surukle.current = { x0: e.clientX, y0: e.clientY, dx: 0, aktif: true }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const kaydir = (e: React.PointerEvent) => {
    const s = surukle.current
    if (!s.aktif) return
    s.dx = e.clientX - s.x0
    if (Math.abs(s.dx) > 6) tasi(s.dx, false)
  }
  const birak = () => {
    const s = surukle.current
    if (!s.aktif) return
    s.aktif = false
    if (Math.abs(s.dx) >= ESIK) {
      tasi(0, true)
      karar(s.dx > 0)
    } else {
      tasi(0, true)
      if (Math.abs(s.dx) < 6) setAcik(a => !a)
    }
  }

  if (bitti) {
    return (
      <div className="calisma">
        <div className="bitis">
          <p className="bitis-emoji" aria-hidden="true">🦕</p>
          <h2>Tur bitti</h2>
          <p>
            {ilkSira.length} kelimenin hepsini bildin
            {sonuc.bilemedim > 0 && <>; {sonuc.bilemedim} kez "tekrar gelsin" dedin</>}.
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
      </div>
    )
  }

  return (
    <div className="calisma">
      <div className="calisma-ust">
        <button className="kapat" onClick={kapat} aria-label="Turu bitir">
          ✕
        </button>
        <div className="ilerleme" role="progressbar" aria-valuenow={sonuc.bildim} aria-valuemax={ilkSira.length}>
          <i style={{ width: ilerleme * 100 + '%' }} />
        </div>
        <span className="sayac">
          {sonuc.bildim}/{ilkSira.length}
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
    </div>
  )
}
