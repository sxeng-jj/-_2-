import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { PLACE_MAP } from '../data/places'
import { localTripStorage, type TripStorage } from '../lib/storage'
import type { TripData, Visit } from '../types'

type Action =
  | { type: 'toggleCourse'; id: string }
  | { type: 'moveCourse'; id: string; dir: -1 | 1 }
  | { type: 'clearCourse' }
  | { type: 'setVisit'; visit: Visit }
  | { type: 'removeVisit'; id: string }

function reducer(state: TripData, a: Action): TripData {
  switch (a.type) {
    case 'toggleCourse':
      return { ...state, course: state.course.includes(a.id) ? state.course.filter((x) => x !== a.id) : [...state.course, a.id] }
    case 'moveCourse': {
      const i = state.course.indexOf(a.id)
      const j = i + a.dir
      if (i < 0 || j < 0 || j >= state.course.length) return state
      const next = [...state.course]
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...state, course: next }
    }
    case 'clearCourse':
      return { ...state, course: [] }
    case 'setVisit':
      return { ...state, visits: { ...state.visits, [a.visit.placeId]: a.visit } }
    case 'removeVisit': {
      const { [a.id]: _removed, ...rest } = state.visits
      return { ...state, visits: rest }
    }
  }
}

interface TripApi {
  data: TripData
  isFav: (id: string) => boolean
  toggleFav: (id: string) => void
  moveFav: (id: string, dir: -1 | 1) => void
  clearCourse: () => void
  setVisit: (v: Visit) => void
  removeVisit: (id: string) => void
}

const Ctx = createContext<TripApi | null>(null)

export function TripProvider({ children, storage = localTripStorage }: { children: ReactNode; storage?: TripStorage }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => {
    const d = storage.load()
    // 데이터에 없는 장소 id 는 걸러낸다
    return { course: d.course.filter((id) => PLACE_MAP.has(id)), visits: d.visits }
  })

  useEffect(() => storage.save(data), [data, storage])

  const api = useMemo<TripApi>(
    () => ({
      data,
      isFav: (id) => data.course.includes(id),
      toggleFav: (id) => dispatch({ type: 'toggleCourse', id }),
      moveFav: (id, dir) => dispatch({ type: 'moveCourse', id, dir }),
      clearCourse: () => dispatch({ type: 'clearCourse' }),
      setVisit: (visit) => dispatch({ type: 'setVisit', visit }),
      removeVisit: (id) => dispatch({ type: 'removeVisit', id }),
    }),
    [data],
  )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useTrip() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTrip 은 TripProvider 안에서만 사용할 수 있습니다.')
  return v
}
