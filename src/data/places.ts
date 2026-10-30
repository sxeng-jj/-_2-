import raw from './places.json'
import type { Place } from '../types'

export const PLACES = raw as Place[]
export const PLACE_MAP = new Map(PLACES.map((p) => [p.id, p]))
export const CATEGORIES = [...new Set(PLACES.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'))
