import type { Place } from '../src/types'

/**
 * 제주 역사문화 Open API(공공데이터포털 odcloud) 클라이언트 — 서버(Vercel 함수/개발 서버)에서만 쓴다.
 * 키는 환경변수로만 읽는다. (JEJU_CULTURE_INFO_KEY: 일반정보, JEJU_CULTURE_LOCATION_KEY: 위치정보)
 * 파일 이름이 `_` 로 시작하면 Vercel 이 API 경로로 만들지 않는다.
 */
const BASE = 'https://api.odcloud.kr/api'
const LOCATION_PATH = '15109570/v1/uddi:8781448b-81a8-487c-bc95-d26335bafa82'
const INFO_PATH = '15109587/v1/uddi:56c2b3a4-4b4b-46cd-a1fa-f928ef731ffb'
const PER_PAGE = 500

type Row = Record<string, string | number | null | undefined>

export class NotConfiguredError extends Error {}

async function fetchAll(path: string, key: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let page = 1; ; page++) {
    const qs = new URLSearchParams({ serviceKey: key, page: String(page), perPage: String(PER_PAGE), returnType: 'JSON' })
    const r = await fetch(`${BASE}/${path}?${qs}`)
    if (!r.ok) throw new Error(`odcloud_${r.status}`)
    const json = (await r.json()) as { data?: Row[]; totalCount?: number }
    const data = json.data ?? []
    rows.push(...data)
    if (!data.length || rows.length >= (json.totalCount ?? 0)) return rows
  }
}

const str = (v: Row[string]) => (v == null ? '' : String(v).trim())
const clean = (v: Row[string]) => (str(v) === '해당없음' ? '' : str(v))

/** 위치정보 + 일반정보를 "데이터 고유번호" 로 합쳐 Place[] 로 만든다. */
export async function loadPlaces(): Promise<Place[]> {
  const infoKey = process.env.JEJU_CULTURE_INFO_KEY
  const locationKey = process.env.JEJU_CULTURE_LOCATION_KEY
  if (!infoKey || !locationKey) throw new NotConfiguredError('JEJU_CULTURE_INFO_KEY / JEJU_CULTURE_LOCATION_KEY 가 설정되지 않았습니다.')

  const [loc, info] = await Promise.all([fetchAll(LOCATION_PATH, locationKey), fetchAll(INFO_PATH, infoKey)])
  const gen = new Map(info.map((g) => [str(g['데이터 고유번호']), g]))

  return loc
    .map((l): Place => {
      const id = str(l['데이터 고유번호'])
      const g = gen.get(id) ?? {}
      const address = str(l['위치'])
      return {
        id,
        name: str(l['장소명']),
        lat: Number(l['위도']),
        lng: Number(l['경도']),
        zip: str(l['우편번호']),
        address,
        region: /서귀포시/.test(address) ? '서귀포시' : /제주시/.test(address) ? '제주시' : '기타',
        sourceUrl: str(l['데이터 상세보기 URL']),
        baseDate: str(l['데이터기준일자']),
        category: clean(g['분류']),
        dir1: clean(g['디렉토리1']),
        dir2: clean(g['디렉토리2']),
        title: clean(g['제목']),
        subtitle: clean(g['부제목']),
        author: clean(g['저작자']),
        topic: clean(g['주제']),
        content: clean(g['내용']),
        toc: clean(g['목차']),
        abstract: clean(g['초록']),
        publisher: clean(g['발행자']),
        publishedAt: clean(g['발행일']),
        mediaType: clean(g['자료유형']),
        language: clean(g['언어']),
        scope: clean(g['범위']),
      }
    })
    .filter((p) => p.id && Number.isFinite(p.lat) && Number.isFinite(p.lng))
}
