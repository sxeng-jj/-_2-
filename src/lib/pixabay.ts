import { useEffect, useState } from 'react'
import type { Place } from '../types'

export interface PixImage {
  id: number
  url: string
  large: string
  user: string
  pageUrl: string
  tags: string
}

const cache = new Map<string, Promise<PixImage[]>>()

/** /api/pixabay (Vercel 함수) 로 검색한다. 실패하면 빈 배열 — 화면은 그라데이션 배경으로 대체된다. */
export function searchImages(q: string): Promise<PixImage[]> {
  let p = cache.get(q)
  if (!p) {
    p = fetch(`/api/pixabay?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : { hits: [] }))
      .then((j: { hits?: PixImage[] }) => j.hits ?? [])
      .catch(() => [])
    cache.set(q, p)
  }
  return p
}

/** 장소 분류에 맞춘 검색어 목록 (앞에서부터 결과가 나올 때까지 시도) */
export function queriesFor(p: Place): string[] {
  const byDir: Record<string, string> = {
    자연: '제주 자연 해안',
    역사: '한국 전통 역사 유적',
    관광: '제주도 관광',
    사회: '제주 마을 풍경',
    의식주: '한국 전통 음식 가옥',
    무속: '한국 전통 신당 제사',
    민간신앙: '한국 전통 돌탑',
    통과의례: '한국 전통 의례',
    생산기술: '제주 해녀',
    민속공예: '한국 전통 공예',
  }
  return [`${p.name} 제주`, byDir[p.dir1] ?? '', '제주도 풍경'].filter(Boolean)
}

/** 검색어를 차례로 시도해 첫 결과가 나온 이미지를 돌려준다. seed 로 같은 결과 중 하나를 고정 선택. */
export function usePixabayImage(queries: string[], seed = 0) {
  const key = queries.join('|')
  const [state, setState] = useState<{ key: string; image: PixImage | null }>({ key: '', image: null })

  useEffect(() => {
    let alive = true
    ;(async () => {
      for (const q of key.split('|')) {
        const hits = await searchImages(q)
        if (hits.length) {
          if (alive) setState({ key, image: hits[seed % hits.length] })
          return
        }
      }
      if (alive) setState({ key, image: null })
    })()
    return () => {
      alive = false
    }
  }, [key, seed])

  return { image: state.key === key ? state.image : null, loading: state.key !== key }
}
