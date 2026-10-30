import type { ReactNode } from 'react'
import { usePixabayImage } from '../lib/pixabay'

interface Props {
  queries: string[]
  seed?: number
  className?: string
  children?: ReactNode
}

/** Pixabay 사진을 배경으로 깔고 그 위에 내용을 올린다. 사진을 못 불러오면 제주 색 그라데이션으로 대체. */
export default function PixabayPhoto({ queries, seed = 0, className = '', children }: Props) {
  const { image } = usePixabayImage(queries, seed)
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-sea-600 via-sea-500 to-moss-500 ${className}`}>
      {image && <img src={image.url} alt={image.tags} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-sea-900/70 via-sea-900/10 to-transparent" />
      <div className="relative h-full">{children}</div>
      {image && (
        <a
          href={image.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-1 right-2 text-[10px] text-white/80 underline-offset-2 hover:underline"
        >
          Image by {image.user} · Pixabay
        </a>
      )}
    </div>
  )
}
