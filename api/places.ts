import type { VercelRequest, VercelResponse } from '@vercel/node'
import { loadPlaces, NotConfiguredError } from './_culture'

/**
 * 제주 역사문화 장소 목록 (Vercel 서버리스 함수)
 * - 공공데이터포털 API 키(JEJU_CULTURE_*_KEY)는 서버에서만 쓰고 브라우저로 내보내지 않는다.
 * - 결과는 CDN 에 24시간 캐시해서 공공데이터포털 호출 횟수를 줄인다.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const places = await loadPlaces()
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({ places })
  } catch (e) {
    if (e instanceof NotConfiguredError) return res.status(503).json({ error: 'not_configured', places: [] })
    return res.status(502).json({ error: 'upstream_failed', places: [] })
  }
}
