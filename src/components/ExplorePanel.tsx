import { CATEGORIES } from '../data/places'
import { useTrip } from '../store/TripContext'
import type { Place } from '../types'
import PixabayPhoto from './PixabayPhoto'
import { Empty, FavButton, shortAddress, Tag } from './ui'

export interface Filters {
  query: string
  category: string
  region: string
}

const REGIONS = ['제주시', '서귀포시']

interface Props {
  filters: Filters
  onFilters: (f: Filters) => void
  places: Place[]
  total: number
  selectedId: string | null
  onOpen: (id: string) => void
}

export default function ExplorePanel({ filters, onFilters, places, total, selectedId, onOpen }: Props) {
  const { data } = useTrip()
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch })
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition ${on ? 'border-sea-600 bg-sea-600 text-white' : 'border-sand-200 bg-white text-basalt-800 hover:border-sea-500'}`

  return (
    <div className="flex h-full flex-col">
      <PixabayPhoto queries={['제주도 풍경', 'jeju island']} className="h-28 shrink-0">
        <div className="flex h-full flex-col justify-end p-4 text-white">
          <div className="text-xs font-semibold tracking-widest opacity-90">JEJU IT-GIL</div>
          <div className="text-lg font-extrabold leading-tight drop-shadow">제주의 역사와 문화를 걷는 길</div>
        </div>
      </PixabayPhoto>
      <div className="space-y-3 border-b border-sand-200 bg-white p-4">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="장소·주소·이야기로 검색 (예: 해녀, 오름, 올레)"
          className="w-full rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm outline-none focus:border-sea-500 focus:ring-2 focus:ring-sea-100"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={chip(!filters.region)} onClick={() => set({ region: '' })}>
            전체
          </button>
          {REGIONS.map((r) => (
            <button key={r} type="button" className={chip(filters.region === r)} onClick={() => set({ region: filters.region === r ? '' : r })}>
              {r}
            </button>
          ))}
          <select
            value={filters.category}
            onChange={(e) => set({ category: e.target.value })}
            aria-label="분류"
            className="rounded-full border border-sand-200 bg-white px-3 py-1 text-sm"
          >
            <option value="">분류 전체</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <span className="ml-auto text-sm text-basalt-500">
            <b className="text-sea-600">{places.length}</b> / {total}곳
          </span>
        </div>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-sand-200 overflow-auto bg-white">
        {places.map((p) => {
          const order = data.course.indexOf(p.id) + 1
          return (
            <li key={p.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpen(p.id)}
                onKeyDown={(e) => e.key === 'Enter' && onOpen(p.id)}
                className={`flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-sea-50 ${p.id === selectedId ? 'bg-sea-50' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-sea-900">{p.name}</span>
                    {p.category && <Tag>{p.category}</Tag>}
                    {order > 0 && <Tag tone="citrus">코스 {order}번</Tag>}
                    {p.id in data.visits && <Tag tone="moss">✓ 방문</Tag>}
                  </div>
                  {p.title && <div className="mt-0.5 truncate text-sm text-basalt-500">{p.title}</div>}
                  <div className="mt-0.5 truncate text-xs text-basalt-500">{shortAddress(p)}</div>
                </div>
                <FavButton id={p.id} />
              </div>
            </li>
          )
        })}
        {places.length === 0 && <Empty icon="🔎" title="조건에 맞는 장소가 없어요">검색어나 필터를 바꿔 보세요.</Empty>}
      </ul>
    </div>
  )
}
