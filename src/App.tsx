import { useMemo, useState } from 'react'
import { PLACES, PLACE_MAP } from './data/places'
import { useTrip } from './store/TripContext'
import type { Tab } from './types'
import CoursePanel from './components/CoursePanel'
import ExplorePanel, { type Filters } from './components/ExplorePanel'
import MapView from './components/MapView'
import PlaceDetail from './components/PlaceDetail'
import VisitLog from './components/VisitLog'
import AuthModal from './components/AuthModal'
import { useAuth } from './store/AuthContext'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'explore', label: '탐색', icon: '🧭' },
  { id: 'course', label: '내 코스', icon: '🛤️' },
  { id: 'visits', label: '방문 기록', icon: '👣' },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r="20" fill="#f5c518" opacity=".9" />
        <path d="M0 26 L13 12 L20 19 L28 9 L40 26 V40 H0Z" fill="#2f7d55" />
        <path d="M0 31 Q10 26 20 31 T40 31 V40 H0Z" fill="#0e6f78" />
      </svg>
      <div className="leading-tight">
        <div className="text-lg font-extrabold tracking-tight text-sea-900">제주잇길</div>
        <div className="text-[10px] font-semibold tracking-[0.2em] text-sea-600">JEJU IT-GIL</div>
      </div>
    </div>
  )
}

export default function App() {
  const { data } = useTrip()
  const { user, logOut, configured } = useAuth()
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [tab, setTab] = useState<Tab>('explore')
  const [filters, setFilters] = useState<Filters>({ query: '', category: '', region: '' })
  const [selectedId, setSelectedId] = useState<string | null>(null) // 지도에서 강조할 장소
  const [detailId, setDetailId] = useState<string | null>(null) // 탐색 탭에서 상세를 열어 둔 장소
  const [fitNonce, setFitNonce] = useState(0)

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return PLACES.filter(
      (p) =>
        (!filters.category || p.category === filters.category) &&
        (!filters.region || p.region === filters.region) &&
        (!q || [p.name, p.address, p.title, p.subtitle, p.topic, p.content, p.dir1, p.dir2].join(' ').toLowerCase().includes(q)),
    ).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [filters])

  // 탭별로 지도에 보여 줄 장소
  const mapPlaces = tab === 'course' ? [] : tab === 'visits' ? PLACES.filter((p) => p.id in data.visits) : filtered

  const openDetail = (id: string) => {
    setTab('explore')
    setSelectedId(id)
    setDetailId(id)
  }
  const focus = (id: string) => setSelectedId(id)
  const fitKey = `${tab}|${filters.query}|${filters.category}|${filters.region}|${fitNonce}|${tab === 'visits' ? Object.keys(data.visits).length : ''}`
  const detailPlace = detailId ? PLACE_MAP.get(detailId) : undefined

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 bg-white px-4 py-2.5">
        <Logo />
        <nav className="flex gap-1 rounded-full bg-sand-100 p-1" aria-label="주요 메뉴">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === t.id ? 'bg-sea-600 text-white shadow' : 'text-basalt-500 hover:text-sea-700'}`}
            >
              <span aria-hidden>{t.icon} </span>
              {t.label}
              {t.id === 'course' && data.course.length > 0 && <span className="ml-1 rounded-full bg-citrus-500 px-1.5 text-xs text-white">{data.course.length}</span>}
              {t.id === 'visits' && Object.keys(data.visits).length > 0 && (
                <span className="ml-1 rounded-full bg-moss-500 px-1.5 text-xs text-white">{Object.keys(data.visits).length}</span>
              )}
            </button>
          ))}
        </nav>
        {/* Supabase 환경변수가 없는 빌드(더블클릭 실행용)에서는 로그인 UI를 숨긴다 */}
        <div className={`items-center gap-2 text-sm ${configured ? 'flex' : 'hidden'}`}>
          {user ? (
            <>
              <span className="rounded-full bg-sea-50 px-3 py-1.5 font-semibold text-sea-700">🌴 {user.nickname}님</span>
              <button type="button" onClick={() => void logOut()}className="rounded-full border border-sand-200 px-3 py-1.5 text-basalt-500 hover:text-sea-700">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setAuthMode('login')} className="rounded-full px-3 py-1.5 font-semibold text-sea-700 hover:bg-sea-50">
                로그인
              </button>
              <button type="button" onClick={() => setAuthMode('signup')} className="rounded-full bg-citrus-500 px-4 py-1.5 font-semibold text-white hover:bg-citrus-600">
                회원가입
              </button>
            </>
          )}
        </div>
      </header>
      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="order-2 min-h-0 flex-1 overflow-auto bg-sand-50 lg:order-1 lg:w-[430px] lg:flex-none lg:border-r lg:border-sand-200">
          {tab === 'explore' &&
            (detailPlace ? (
              <PlaceDetail place={detailPlace} onBack={() => setDetailId(null)} />
            ) : (
              <ExplorePanel filters={filters} onFilters={setFilters} places={filtered} total={PLACES.length} selectedId={selectedId} onOpen={openDetail} />
            ))}
          {tab === 'course' && <CoursePanel onFocus={focus} onOpen={openDetail} onFit={() => setFitNonce((n) => n + 1)} onGoExplore={() => setTab('explore')} />}
          {tab === 'visits' && <VisitLog onFocus={focus} onOpen={openDetail} onGoExplore={() => setTab('explore')} />}
        </section>

        <section className="relative order-1 h-[42vh] shrink-0 lg:order-2 lg:h-auto lg:flex-1">
          <MapView places={mapPlaces} selectedId={selectedId} fitKey={fitKey} onSelect={openDetail} />
          <div className="pointer-events-none absolute bottom-6 left-3 z-[500] flex gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] shadow">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-sea-600" />장소</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-citrus-500" />코스</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-moss-500" />방문</span>
          </div>
        </section>
      </main>
    </div>
  )
}
