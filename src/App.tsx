import { useEffect, useMemo, useState } from 'react'
import { usePlaces } from './store/PlacesContext'
import { useTrip } from './store/TripContext'
import type { Tab } from './types'
import { readShared, type SharedCourse } from './lib/share'
import CoursePanel from './components/CoursePanel'
import ExplorePanel, { type Filters } from './components/ExplorePanel'
import MapView from './components/MapView'
import PlaceDetail from './components/PlaceDetail'
import VisitLog from './components/VisitLog'
import AuthModal, { type AuthMode } from './components/AuthModal'
import WelcomeGuide from './components/WelcomeGuide'
import { useAuth } from './store/AuthContext'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'explore', label: '탐색', icon: '🧭' },
  { id: 'course', label: '내 코스', icon: '🛤️' },
  { id: 'visits', label: '방문 기록', icon: '👣' },
]

const WELCOMED_KEY = 'jeju-itgil:welcomed'
const seenGuide = () => {
  try {
    return localStorage.getItem(WELCOMED_KEY) === '1'
  } catch {
    return false
  }
}
const markGuideSeen = () => {
  try {
    localStorage.setItem(WELCOMED_KEY, '1')
  } catch {
    /* 저장이 막힌 환경에서는 매번 안내가 뜰 뿐이다 */
  }
}

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

/** 링크로 공유받은 코스를 내 코스로 가져올지 묻는다 */
function SharedCourseDialog({ shared, onImport, onClose }: { shared: SharedCourse; onImport: () => void; onClose: () => void }) {
  const { placeMap } = usePlaces()
  const { data } = useTrip()
  const names = shared.course.map((id) => placeMap.get(id)?.name).filter(Boolean) as string[]
  const days = 1 + shared.breaks.length
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-sea-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="공유받은 코스" className="max-h-full w-full max-w-sm overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-3xl" aria-hidden>
          🛤️
        </div>
        <h2 className="mt-1 text-lg font-bold text-sea-900">공유받은 코스가 있어요</h2>
        <p className="mt-1 text-sm text-basalt-500">
          {days > 1 && `${days}일 · `}
          {names.length}곳
        </p>
        <p className="mt-2 rounded-xl bg-sand-50 p-3 text-sm leading-relaxed">
          {names.slice(0, 6).join(' → ')}
          {names.length > 6 && ` … 외 ${names.length - 6}곳`}
        </p>
        {data.course.length > 0 && <p className="mt-2 text-xs text-citrus-600">지금 담아 둔 코스({data.course.length}곳)는 이 코스로 바뀌어요.</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-sand-200 py-2.5 text-sm font-semibold text-basalt-500 hover:text-sea-700">
            닫기
          </button>
          <button type="button" autoFocus onClick={onImport} className="flex-1 rounded-full bg-sea-600 py-2.5 text-sm font-bold text-white hover:bg-sea-500">
            내 코스로 가져오기
          </button>
        </div>
      </div>
    </div>
  )
}

/** 실시간 API 대신 내장 사본을 쓰고 있을 때 알린다 */
function SnapshotNotice() {
  const { source, reason, retry } = usePlaces()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hidden, setHidden] = useState(false)
  if (source !== 'snapshot' || hidden) return null
  const again = async () => {
    setBusy(true)
    setFailed(false)
    // 성공하면 화면 전체가 최신 데이터로 새로 그려진다
    if (!(await retry())) {
      setFailed(true)
      setBusy(false)
    }
  }
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-canola-300 bg-canola-300/30 px-4 py-1.5 text-xs text-basalt-800">
      <span>
        {reason === 'offline'
          ? '파일로 열어서 저장된 데이터(2022-12-09 기준)를 보여 드려요. 웹 주소로 열면 최신 데이터를 불러와요.'
          : failed
            ? '아직 연결되지 않았어요. 잠시 후 다시 시도해 주세요.'
            : '최신 데이터를 불러오지 못해 저장된 데이터(2022-12-09 기준)를 보여 드려요.'}
      </span>
      <span className="flex gap-2">
        {reason !== 'offline' && (
          <button type="button" onClick={again} disabled={busy} className="font-semibold text-sea-700 underline-offset-2 hover:underline disabled:opacity-60">
            {busy ? '불러오는 중…' : '다시 시도'}
          </button>
        )}
        <button type="button" onClick={() => setHidden(true)} aria-label="알림 닫기" className="text-basalt-500 hover:text-sea-700">
          ✕
        </button>
      </span>
    </div>
  )
}

export default function App() {
  const { data, setCourse } = useTrip()
  const { places: PLACES, placeMap: PLACE_MAP } = usePlaces()
  const { user, logOut, configured, recovering } = useAuth()
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [tab, setTab] = useState<Tab>('explore')
  const [filters, setFilters] = useState<Filters>({ query: '', category: '', region: '' })
  const [selectedId, setSelectedId] = useState<string | null>(null) // 지도에서 강조할 장소
  const [detailId, setDetailId] = useState<string | null>(null) // 탐색 탭에서 상세를 열어 둔 장소
  const [fitNonce, setFitNonce] = useState(0)
  /** 좁은 화면에서는 지도와 목록을 번갈아 보여 준다 (넓은 화면에서는 둘 다) */
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  // 링크로 공유받은 코스 (주소의 #c=…) — 읽은 뒤 주소에서 지운다
  const [shared, setShared] = useState<SharedCourse | null>(() => {
    const s = readShared(location.hash)
    if (!s) return null
    history.replaceState(null, '', location.pathname + location.search)
    const course = s.course.filter((id) => PLACE_MAP.has(id))
    return course.length ? { course, breaks: s.breaks.filter((id) => course.indexOf(id) > 0) } : null
  })
  const [showGuide, setShowGuide] = useState(() => !shared && !seenGuide())

  // 비밀번호 재설정 메일의 링크로 들어오면 새 비밀번호 입력창을 띄운다
  useEffect(() => {
    if (recovering) setAuthMode('recover')
  }, [recovering])

  const closeGuide = () => {
    markGuideSeen()
    setShowGuide(false)
  }

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return PLACES.filter(
      (p) =>
        (!filters.category || p.category === filters.category) &&
        (!filters.region || p.region === filters.region) &&
        (!q || [p.name, p.address, p.title, p.subtitle, p.topic, p.content, p.dir1, p.dir2].join(' ').toLowerCase().includes(q)),
    ).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [filters, PLACES])

  // 탭별로 지도에 보여 줄 장소
  const mapPlaces = tab === 'course' ? [] : tab === 'visits' ? PLACES.filter((p) => p.id in data.visits) : filtered

  const openDetail = (id: string) => {
    setTab('explore')
    setSelectedId(id)
    setDetailId(id)
  }
  /** 지도 팝업의 "상세보기": 좁은 화면에서는 상세가 있는 목록 쪽으로 넘어간다 */
  const openDetailFromMap = (id: string) => {
    openDetail(id)
    setMobileView('list')
  }
  /** 코스·기록 목록에서 장소를 누르면 지도에서 보여 준다 */
  const focus = (id: string) => {
    setSelectedId(id)
    setMobileView('map')
  }
  const showMap = () => {
    setMobileView('map')
    // 숨겨져 있던 지도가 보이게 되면 보이는 핀에 맞춰 다시 맞춘다
    setFitNonce((n) => n + 1)
  }
  const fitKey = `${tab}|${filters.query}|${filters.category}|${filters.region}|${fitNonce}|${tab === 'visits' ? Object.keys(data.visits).length : ''}`
  const detailPlace = detailId ? PLACE_MAP.get(detailId) : undefined

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200 bg-white px-4 py-2.5">
        <Logo />
        <nav className="flex shrink-0 gap-1 rounded-full bg-sand-100 p-1" aria-label="주요 메뉴">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition sm:px-4 ${tab === t.id ? 'bg-sea-600 text-white shadow' : 'text-basalt-500 hover:text-sea-700'}`}
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
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            aria-label="이용 안내"
            title="이용 안내"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-sand-200 font-bold text-basalt-500 hover:text-sea-700"
          >
            ?
          </button>
          {/* Supabase 환경변수가 없는 빌드(더블클릭 실행용)에서는 로그인 UI를 숨긴다 */}
          <div className={`items-center gap-2 ${configured ? 'flex' : 'hidden'}`}>
            {user ? (
              <>
                <span className="rounded-full bg-sea-50 px-3 py-1.5 font-semibold text-sea-700">🌴 {user.nickname}님</span>
                <button type="button" onClick={() => void logOut()} className="rounded-full border border-sand-200 px-3 py-1.5 text-basalt-500 hover:text-sea-700">
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
        </div>
      </header>
      <SnapshotNotice />
      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />}
      {showGuide && (
        <WelcomeGuide
          canSignUp={configured && !user}
          onSignUp={() => {
            closeGuide()
            setAuthMode('signup')
          }}
          onClose={closeGuide}
        />
      )}
      {shared && (
        <SharedCourseDialog
          shared={shared}
          onClose={() => setShared(null)}
          onImport={() => {
            setCourse(shared.course, shared.breaks)
            setShared(null)
            setTab('course')
          }}
        />
      )}

      <main className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          className={`min-h-0 flex-1 overflow-auto bg-sand-50 pb-16 lg:order-1 lg:block lg:w-[430px] lg:flex-none lg:border-r lg:border-sand-200 lg:pb-0 ${mobileView === 'map' ? 'hidden' : 'block'}`}
        >
          {tab === 'explore' &&
            (detailPlace ? (
              <PlaceDetail place={detailPlace} onBack={() => setDetailId(null)} />
            ) : (
              <ExplorePanel filters={filters} onFilters={setFilters} places={filtered} total={PLACES.length} selectedId={selectedId} onOpen={openDetail} />
            ))}
          {tab === 'course' && <CoursePanel onFocus={focus} onOpen={openDetail} onFit={() => { showMap() }} onGoExplore={() => setTab('explore')} />}
          {tab === 'visits' && <VisitLog onFocus={focus} onOpen={openDetail} onGoExplore={() => setTab('explore')} />}
        </section>

        <section className={`relative min-h-0 flex-1 lg:order-2 lg:block ${mobileView === 'list' ? 'hidden' : 'block'}`}>
          <MapView places={mapPlaces} selectedId={selectedId} fitKey={fitKey} onSelect={openDetail} onDetail={openDetailFromMap} />
          <div className="pointer-events-none absolute bottom-16 left-3 z-[500] flex gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] shadow lg:bottom-6">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-sea-600" />장소</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-citrus-500" />코스</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-moss-500" />방문</span>
          </div>
        </section>

        {/* 좁은 화면 전용: 지도 ↔ 목록 전환 */}
        <button
          type="button"
          onClick={() => (mobileView === 'list' ? showMap() : setMobileView('list'))}
          className="absolute bottom-4 left-1/2 z-[1100] -translate-x-1/2 rounded-full bg-sea-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg lg:hidden"
        >
          {mobileView === 'list' ? '🗺️ 지도로 보기' : '📋 목록으로 보기'}
        </button>
      </main>
    </div>
  )
}
