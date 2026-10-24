// Kartın iki yüzü: önde kelime + örnek cümle, arkada Türkçe anlam.
import { DILLER, cinsiyet, vurgula, type Dil, type Kart } from './kart'
import { oku, sesVar } from './ses'

export function Kelime({ kelime, dil, className = '' }: { kelime: string; dil: Dil; className?: string }) {
  const c = cinsiyet(kelime, dil)
  return <span className={`kelime ${c ? 'cins-' + c : ''} ${className}`}>{kelime}</span>
}

export function Cumle({ cumle, kelime, dil }: { cumle: string; kelime: string; dil: Dil }) {
  return (
    <>
      {vurgula(cumle, kelime, dil).map((p, i) => (p.vurgu ? <mark key={i}>{p.metin}</mark> : <span key={i}>{p.metin}</span>))}
    </>
  )
}

export function SesDugmesi({ metin, dil, etiket, kucuk }: { metin: string; dil: Dil; etiket: string; kucuk?: boolean }) {
  if (!sesVar) return null
  return (
    <button
      type="button"
      className={'ses' + (kucuk ? ' kucuk' : '')}
      aria-label={etiket}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => {
        e.stopPropagation()
        oku(metin, dil)
      }}
    >
      <svg viewBox="0 0 24 24" width={kucuk ? 16 : 20} height={kucuk ? 16 : 20} aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
        <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  )
}

function Serit({ k }: { k: Kart }) {
  const d = DILLER[k.dil]
  return (
    <div className="serit">
      <span>
        {d.bayrak} {d.ad}
      </span>
      <span className="no">Nº {k.no}</span>
    </div>
  )
}

export function OnYuz({ k }: { k: Kart }) {
  return (
    <div className={`yuz on dil-${k.dil}`}>
      <Serit k={k} />
      <div className="yuz-govde">
        <div className="kelime-satir">
          <Kelime kelime={k.kelime} dil={k.dil} className="buyuk" />
          <SesDugmesi metin={k.kelime} dil={k.dil} etiket="Kelimeyi oku" />
        </div>
        {k.cumle && (
          <p className="cumle">
            <Cumle cumle={k.cumle} kelime={k.kelime} dil={k.dil} />
            <SesDugmesi metin={k.cumle} dil={k.dil} etiket="Cümleyi oku" kucuk />
          </p>
        )}
      </div>
      <p className="ipucu">Çevirmek için dokun</p>
    </div>
  )
}

export function ArkaYuz({ k }: { k: Kart }) {
  return (
    <div className={`yuz arka dil-${k.dil}`}>
      <Serit k={k} />
      <div className="yuz-govde">
        <Kelime kelime={k.kelime} dil={k.dil} className="kucuk-kelime" />
        <p className="anlam">{k.anlam}</p>
        {k.cumle && k.cumleTr && <p className="cumle-tr">{k.cumleTr}</p>}
        {k.not && <p className="not">{k.not}</p>}
      </div>
    </div>
  )
}
