import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Pixabay 검색 프록시 (Vercel 서버리스 함수)
 * - API 키(PIXABAY_API_KEY)를 브라우저에 노출하지 않으려고 서버에서만 호출한다.
 * - 결과는 CDN 에 24시간 캐시해서 Pixabay 호출 횟수를 줄인다.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = process.env.PIXABAY_API_KEY
  if (!key) return res.status(503).json({ error: 'not_configured', hits: [] })

  const q = String(req.query.q ?? '').trim().slice(0, 100)
  if (!q) return res.status(400).json({ error: 'missing_q', hits: [] })

  const params = new URLSearchParams({
    key,
    q,
    lang: 'ko',
    image_type: 'photo',
    orientation: 'horizontal',
    safesearch: 'true',
    per_page: '5',
  })

  try {
    const r = await fetch(`https://pixabay.com/api/?${params}`)
    if (!r.ok) return res.status(502).json({ error: `pixabay_${r.status}`, hits: [] })
    const json = (await r.json()) as {
      hits: { id: number; webformatURL: string; largeImageURL: string; user: string; pageURL: string; tags: string }[]
    }
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json({
      hits: json.hits.map((h) => ({ id: h.id, url: h.webformatURL, large: h.largeImageURL, user: h.user, pageUrl: h.pageURL, tags: h.tags })),
    })
  } catch {
    return res.status(502).json({ error: 'fetch_failed', hits: [] })
  }
}
