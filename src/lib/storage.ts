import type { TripData } from '../types'

/**
 * 저장소 추상화. 지금은 브라우저 localStorage 를 쓰지만,
 * 서버 연동 시 이 인터페이스를 구현한 어댑터로 교체하면 된다.
 */
export interface TripStorage {
  load(): TripData
  save(data: TripData): void
}

const EMPTY: TripData = { course: [], visits: {} }

/** localStorage 키 하나에 사용자 데이터를 저장하는 어댑터 */
export function createLocalStorage(key: string): TripStorage {
  return {
    load() {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<TripData> | null
        return { course: parsed?.course ?? [], visits: parsed?.visits ?? {} }
      } catch {
        return { ...EMPTY, course: [], visits: {} }
      }
    },
    save(data) {
      try {
        localStorage.setItem(key, JSON.stringify(data))
      } catch {
        /* 저장이 막힌 환경에서는 화면 동작만 유지한다 */
      }
    },
  }
}

/** 로그인하지 않은 사용자(게스트)용 저장소 */
export const GUEST_KEY = 'jeju-itgil:v1'
export const localTripStorage = createLocalStorage(GUEST_KEY)

/** 계정별 저장소 */
export const userStorage = (userId: string) => createLocalStorage(`${GUEST_KEY}:user:${userId}`)
