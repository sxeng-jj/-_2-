import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Place } from '../types'
import { AppSkeleton } from '../components/Skeleton'

interface PlacesApi {
  places: Place[]
  placeMap: Map<string, Place>
  categories: string[]
  /** 'api' = 공공데이터포털 API, 'snapshot' = API 를 못 쓸 때 쓰는 내장 사본 */
  source: 'api' | 'snapshot'
  /** 사본을 쓰는 이유: 'offline' = 파일로 열어서 서버가 없음, 'failed' = 서버/API 오류 */
  reason: 'offline' | 'failed' | null
  /** API 를 다시 불러온다 (성공하면 최신 데이터로 화면을 새로 그린다) */
  retry: () => Promise<boolean>
}

const Ctx = createContext<PlacesApi | null>(null)

async function fetchPlaces(): Promise<Place[]> {
  const r = await fetch('/api/places')
  if (!r.ok) throw new Error(`places_${r.status}`)
  const { places } = (await r.json()) as { places?: Place[] }
  if (!places?.length) throw new Error('places_empty')
  return places
}

const loadSnapshot = async () => (await import('../data/places.json')).default as Place[]

interface State {
  places: Place[]
  source: PlacesApi['source']
  reason: PlacesApi['reason']
  /** 새 데이터로 바뀔 때마다 올라가서, 아래 화면 전체가 새 데이터로 다시 시작되게 한다 */
  version: number
}

/**
 * /api/places (서버가 환경변수 JEJU_CULTURE_*_KEY 로 공공데이터포털을 호출) 에서 장소를 불러온다.
 * API 를 쓸 수 없는 환경(더블클릭 실행, 키 미설정, 점검 등)에서는 내장 사본으로 대체하고, 화면에서 알려 준다.
 */
export function PlacesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    const offline = location.protocol === 'file:'
    ;(offline ? Promise.reject(new Error('offline')) : fetchPlaces())
      .then((places) => ({ places, source: 'api' as const, reason: null }))
      .catch(async () => ({ places: await loadSnapshot(), source: 'snapshot' as const, reason: offline ? ('offline' as const) : ('failed' as const) }))
      .then((s) => alive.current && setState({ ...s, version: 1 }))
    return () => {
      alive.current = false
    }
  }, [])

  const retry = useCallback(async () => {
    try {
      const places = await fetchPlaces()
      if (alive.current) setState((s) => ({ places, source: 'api', reason: null, version: (s?.version ?? 0) + 1 }))
      return true
    } catch {
      return false
    }
  }, [])

  const api = useMemo<PlacesApi | null>(() => {
    if (!state) return null
    const { places, source, reason } = state
    return {
      places,
      source,
      reason,
      retry,
      placeMap: new Map(places.map((p) => [p.id, p])),
      categories: [...new Set(places.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko')),
    }
  }, [state, retry])

  if (!api || !state) return <AppSkeleton />
  return (
    <Ctx.Provider value={api}>
      <Fragment key={state.version}>{children}</Fragment>
    </Ctx.Provider>
  )
}

export function usePlaces() {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePlaces 는 PlacesProvider 안에서만 사용할 수 있습니다.')
  return v
}
