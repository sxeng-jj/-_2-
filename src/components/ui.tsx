import type { ReactNode } from 'react'
import { useTrip } from '../store/TripContext'
import type { Place } from '../types'

export function FavButton({ id, size = 'md', withLabel = false }: { id: string; size?: 'md' | 'lg'; withLabel?: boolean }) {
  const { isFav, toggleFav } = useTrip()
  const on = isFav(id)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        toggleFav(id)
      }}
      aria-pressed={on}
      aria-label={on ? '찜 해제' : '찜하기'}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border transition ${
        on ? 'border-citrus-400 bg-citrus-100 text-citrus-600' : 'border-sand-200 bg-white text-basalt-500 hover:border-citrus-400 hover:text-citrus-600'
      } ${size === 'lg' ? 'px-3 py-1.5 text-sm font-semibold' : 'px-2 py-0.5 text-base'}`}
    >
      <span aria-hidden>{on ? '★' : '☆'}</span>
      {withLabel && <span>{on ? '코스에 담김' : '코스에 담기'}</span>}
    </button>
  )
}

export function Tag({ children, tone = 'sea' }: { children: ReactNode; tone?: 'sea' | 'moss' | 'citrus' | 'sand' }) {
  const tones = {
    sea: 'bg-sea-50 text-sea-700',
    moss: 'bg-moss-100 text-moss-600',
    citrus: 'bg-citrus-100 text-citrus-600',
    sand: 'bg-sand-100 text-basalt-500',
  }
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function shortAddress(p: Place) {
  return p.address.replace('제주특별자치도 ', '')
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-basalt-500">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <div className="font-semibold text-basalt-800">{title}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}
