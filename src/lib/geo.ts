import type { Place } from '../types'

const R = 6371
const rad = (d: number) => (d * Math.PI) / 180

/** 두 지점의 직선거리(km) */
export function distanceKm(a: Pick<Place, 'lat' | 'lng'>, b: Pick<Place, 'lat' | 'lng'>) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 순서대로 이동한 총 직선거리(km) */
export function routeDistanceKm(stops: Place[]) {
  return stops.slice(1).reduce((sum, p, i) => sum + distanceKm(stops[i], p), 0)
}
