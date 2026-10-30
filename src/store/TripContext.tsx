import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { usePlaces } from './PlacesContext'
import { localTripStorage, type TripStorage } from '../lib/storage'
import type { TripData, Visit } from '../types'

type Action =
  | { type: 'toggleCourse'; id: string }
  | { type: 'moveCourse'; id: string; dir: -1 | 1 }
  | { type: 'clearCourse' }
  | { type: 'reorderCourse'; id: string; toIndex: number }
  | { type: 'toggleBreak'; id: string }
  | { type: 'setCourse'; course: string[]; breaks: string[] }
  | { type: 'setVisit'; visit: Visit }
  | { type: 'removeVisit'; id: string }

/** 새 순서를 적용한다. 맨 앞이 된 장소의 "하루 시작" 표시는 의미가 없어서 지운다. */
const withCourse = (state: TripData, course: string[]): TripData => ({ ...state, course, breaks: state.breaks.filter((id) => course.indexOf(id) > 0) })

function reducer(state: TripData, a: Action): TripData {
  switch (a.type) {
    case 'toggleCourse':
      return state.course.includes(a.id)
        ? { ...state, course: state.course.filter((x) => x !== a.id), breaks: state.breaks.filter((x) => x !== a.id) }
        : { ...state, course: [...state.course, a.id] }
    case 'moveCourse': {
      const i = state.course.indexOf(a.id)
      const j = i + a.dir
      if (i < 0 || j < 0 || j >= state.course.length) return state
      const next = [...state.course]
      ;[next[i], next[j]] = [next[j], next[i]]
      return withCourse(state, next)
    }
    case 'clearCourse':
      return { ...state, course: [], breaks: [] }
    case 'reorderCourse': {
      const from = state.course.indexOf(a.id)
      if (from < 0 || from === a.toIndex) return state
      const next = state.course.filter((x) => x !== a.id)
      next.splice(Math.max(0, Math.min(a.toIndex, next.length)), 0, a.id)
      return withCourse(state, next)
    }
    case 'toggleBreak':
      // 첫 장소는 이미 1일차의 시작이라 나눌 수 없다
      if (state.course.indexOf(a.id) < 1) return state
      return { ...state, breaks: state.breaks.includes(a.id) ? state.breaks.filter((x) => x !== a.id) : [...state.breaks, a.id] }
    case 'setCourse':
      return { ...state, course: a.course, breaks: a.breaks.filter((id) => a.course.indexOf(id) > 0) }
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
  reorderFav: (id: string, toIndex: number) => void
  toggleBreak: (id: string) => void
  setCourse: (course: string[], breaks: string[]) => void
  setVisit: (v: Visit) => void
  removeVisit: (id: string) => void
}

const Ctx = createContext<TripApi | null>(null)

export function TripProvider({ children, storage = localTripStorage }: { children: ReactNode; storage?: TripStorage }) {
  const { placeMap } = usePlaces()
  const [data, dispatch] = useReducer(reducer, undefined, () => {
    const d = storage.load()
    // 데이터에 없는 장소 id 는 걸러낸다
    const course = d.course.filter((id) => placeMap.has(id))
    return { course, breaks: d.breaks.filter((id) => course.indexOf(id) > 0), visits: d.visits }
  })

  useEffect(() => storage.save(data), [data, storage])

  const api = useMemo<TripApi>(
    () => ({
      data,
      isFav: (id) => data.course.includes(id),
      toggleFav: (id) => dispatch({ type: 'toggleCourse', id }),
      moveFav: (id, dir) => dispatch({ type: 'moveCourse', id, dir }),
      clearCourse: () => dispatch({ type: 'clearCourse' }),
      reorderFav: (id, toIndex) => dispatch({ type: 'reorderCourse', id, toIndex }),
      toggleBreak: (id) => dispatch({ type: 'toggleBreak', id }),
      setCourse: (course, breaks) => dispatch({ type: 'setCourse', course, breaks }),
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
