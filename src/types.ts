export type Region = '제주시' | '서귀포시' | '기타'

export interface Place {
  id: string
  name: string
  lat: number
  lng: number
  zip: string
  address: string
  region: Region
  sourceUrl: string
  baseDate: string
  category: string
  dir1: string
  dir2: string
  title: string
  subtitle: string
  author: string
  topic: string
  content: string
  toc: string
  abstract: string
  publisher: string
  publishedAt: string
  mediaType: string
  language: string
  scope: string
}

/** 방문 기록 (장소 1곳당 1건) */
export interface Visit {
  placeId: string
  visitedAt: string // YYYY-MM-DD
  rating: number // 0(미평가)~5
  memo: string
}

/** 사용자 데이터. 로그인/공유/서버 동기화를 붙일 때 이 모양 그대로 주고받는다. */
export interface TripData {
  /** 찜한 순서 = 여행 코스 순서 */
  course: string[]
  /** 새 하루가 시작되는 장소 id (코스 첫 장소는 제외). 비어 있으면 하루 코스 */
  breaks: string[]
  visits: Record<string, Visit>
}

export type Tab = 'explore' | 'course' | 'visits'
