import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { usePlaces } from '../store/PlacesContext'
import { useTrip } from '../store/TripContext'
import type { Place } from '../types'

interface Props {
  /** 지도에 보여 줄 장소 (찜한 곳은 항상 함께 보인다) */
  places: Place[]
  selectedId: string | null
  /** 값이 바뀔 때마다 보이는 핀 전체에 맞춰 지도를 이동한다 */
  fitKey: string
  onSelect: (id: string) => void
  /** 팝업의 "상세보기" — 지도에서 고르기만 하는 onSelect 와 구분해, 모바일에서 목록 화면으로 넘어가는 데 쓴다 */
  onDetail?: (id: string) => void
}

/** 핀이 모여 있을 때 묶어서 보여 주는 동그라미 */
function clusterIcon(c: L.MarkerCluster) {
  const n = c.getChildCount()
  const size = n < 10 ? 34 : n < 30 ? 40 : 46
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${COLORS.base};color:#fff;border:3px solid rgba(255,255,255,.9);box-shadow:0 0 0 4px rgba(14,111,120,.3);display:flex;align-items:center;justify-content:center;font:700 13px/1 sans-serif">${n}</div>`,
    iconSize: [size, size],
  })
}

const COLORS = { base: '#0e6f78', course: '#f28c28', visited: '#3f8f64', ring: '#f5c518' }

function makeIcon(opts: { order: number; visited: boolean; selected: boolean }) {
  const { order, visited, selected } = opts
  const color = visited ? COLORS.visited : order ? COLORS.course : COLORS.base
  const label = order ? String(order) : visited ? '✓' : ''
  const ring = selected ? `0 0 0 4px ${COLORS.ring},` : ''
  const inner = label || '<i style="width:8px;height:8px;border-radius:50%;background:#fff;display:block"></i>'
  const html =
    `<div style="position:relative;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg) scale(${selected ? 1.2 : 1});background:${color};border:2px solid #fff;box-shadow:${ring}0 2px 5px rgba(0,0,0,.4)">` +
    `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(45deg);color:#fff;font:700 12px/1 sans-serif">${inner}</span></div>`
  return L.divIcon({ className: '', html, iconSize: [28, 28], iconAnchor: [7, 28], popupAnchor: [7, -28] })
}

export default function MapView({ places, selectedId, fitKey, onSelect, onDetail }: Props) {
  const { data, toggleFav } = useTrip()
  const { places: PLACES, placeMap: PLACE_MAP } = usePlaces()
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  /** 겹치면 묶어 보여 주는 일반 핀 */
  const cluster = useRef<L.MarkerClusterGroup | null>(null)
  /** 묶지 않고 항상 보이는 핀 (코스에 담은 곳, 선택한 곳) */
  const fixed = useRef<L.LayerGroup | null>(null)
  const me = useRef<L.CircleMarker | null>(null)
  const [locMsg, setLocMsg] = useState('')
  const route = useRef<L.Polyline | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  // 팝업·이벤트에서 항상 최신 값을 읽기 위한 ref
  const live = useRef({ data, toggleFav, onSelect, onDetail })
  live.current = { data, toggleFav, onSelect, onDetail }

  const popupFor = (p: Place) => {
    const { data: d, toggleFav: tf, onSelect, onDetail } = live.current
    const sel = onDetail ?? onSelect
    const fav = d.course.includes(p.id)
    const box = document.createElement('div')
    box.className = 'jg-pop'
    box.style.cssText = 'min-width:200px;max-width:250px'

    const t = document.createElement('div')
    t.style.cssText = 'font-weight:700;font-size:15px;color:#0a2f35'
    t.textContent = p.name
    const c = document.createElement('div')
    c.style.cssText = 'font-size:11px;color:#0e6f78;margin:2px 0 6px'
    c.textContent = [p.category, p.dir1, p.dir2].filter(Boolean).join(' › ')
    const a = document.createElement('div')
    a.style.cssText = 'font-size:12px;color:#6b7280'
    a.textContent = p.address.replace('제주특별자치도 ', '')
    const text = (p.content || p.abstract).replace(/\s+/g, ' ')
    const s = document.createElement('div')
    s.style.cssText = 'font-size:12px;margin:6px 0 8px;line-height:1.5'
    s.textContent = text.length > 110 ? text.slice(0, 110) + '…' : text

    const row = document.createElement('div')
    row.style.cssText = 'display:flex;gap:6px'
    const mk = (label: string, bg: string, fg: string, fn: () => void) => {
      const b = document.createElement('button')
      b.textContent = label
      b.style.cssText = `flex:1;border:0;border-radius:8px;padding:6px 8px;font-weight:600;font-size:12px;background:${bg};color:${fg}`
      b.onclick = fn
      return b
    }
    row.append(
      mk('상세보기', '#0e6f78', '#fff', () => sel(p.id)),
      mk(fav ? '★ 찜 해제' : '☆ 찜하기', fav ? '#fde8cf' : '#f4efe2', '#2b3138', () => tf(p.id)),
    )
    box.append(t, c, a, s, row)
    return box
  }

  // 지도 1회 생성
  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true }).setView([33.38, 126.55], 10)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri',
    }).addTo(m)
    cluster.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      disableClusteringAtZoom: 14,
      iconCreateFunction: clusterIcon,
    }).addTo(m)
    fixed.current = L.layerGroup().addTo(m)
    route.current = L.polyline([], { color: COLORS.course, weight: 5, opacity: 0.9, dashArray: '10 8' }).addTo(m)
    map.current = m
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current!)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
      cluster.current = null
      fixed.current = null
      me.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 장소마다 핀 만들기 (장소 데이터가 바뀌면 다시 만든다)
  useEffect(() => {
    markers.current.clear()
    PLACES.forEach((p) => {
      const mk = L.marker([p.lat, p.lng], { icon: makeIcon({ order: 0, visited: false, selected: false }), title: p.name })
      mk.bindPopup(() => popupFor(p), { maxWidth: 270 })
      mk.on('click', () => live.current.onSelect(p.id))
      markers.current.set(p.id, mk)
    })
    return () => markers.current.clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PLACES])

  // 보이는 핀·아이콘·코스 선 갱신
  useEffect(() => {
    const g = fixed.current
    const c = cluster.current
    if (!g || !c) return
    g.clearLayers()
    c.clearLayers()
    const visible = new Set([...places.map((p) => p.id), ...data.course])
    visible.forEach((id) => {
      const mk = markers.current.get(id)
      const place = PLACE_MAP.get(id)
      if (!mk || !place) return
      mk.setIcon(makeIcon({ order: data.course.indexOf(id) + 1, visited: id in data.visits, selected: id === selectedId }))
      // 코스에 담았거나 선택한 핀은 묶지 않고 항상 보여 준다
      ;(data.course.includes(id) || id === selectedId ? g : c).addLayer(mk)
      if (mk.isPopupOpen()) mk.getPopup()?.setContent(popupFor(place))
    })
    // 하루가 바뀌는 곳에서는 선을 끊어서 일차별로 그린다
    const segments: L.LatLng[][] = []
    data.course.forEach((id, i) => {
      const ll = markers.current.get(id)?.getLatLng()
      if (!ll) return
      if (i === 0 || data.breaks.includes(id) || !segments.length) segments.push([])
      segments[segments.length - 1].push(ll)
    })
    route.current?.setLatLngs(segments)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, data, selectedId, PLACES])

  // 선택 시 해당 핀으로 이동 + 팝업
  useEffect(() => {
    if (!selectedId || !map.current) return
    const mk = markers.current.get(selectedId)
    if (!mk || !(fixed.current?.hasLayer(mk) || cluster.current?.hasLayer(mk))) return
    map.current.setView(mk.getLatLng(), Math.max(map.current.getZoom(), 12), { animate: true })
    mk.openPopup()
  }, [selectedId])

  // 필터·탭 변경 시 보이는 핀에 맞춰 이동
  useEffect(() => {
    const ids = new Set([...places.map((p) => p.id), ...data.course])
    const pts = [...ids].flatMap((id) => markers.current.get(id)?.getLatLng() ?? [])
    // 숨겨져 있다가 보이게 된 지도는 크기를 먼저 다시 읽어야 올바르게 맞춰진다
    map.current?.invalidateSize()
    if (pts.length && map.current) map.current.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 13, animate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  /** 내 위치로 이동. 제주에서 너무 멀면 제주 전체를 보여 준다. */
  const locate = () => {
    if (!navigator.geolocation) return setLocMsg('이 브라우저에서는 위치를 알 수 없어요.')
    setLocMsg('내 위치를 찾는 중…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const m = map.current
        if (!m) return
        const pos: L.LatLngTuple = [coords.latitude, coords.longitude]
        me.current?.remove()
        me.current = L.circleMarker(pos, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(m).bindTooltip('내 위치')
        if (L.latLng(33.38, 126.55).distanceTo(pos) > 120_000) {
          setLocMsg('지금 위치는 제주에서 멀어요. 제주 안에서 사용해 보세요.')
          return
        }
        m.setView(pos, 13)
        setLocMsg('')
      },
      (e) => setLocMsg(e.code === e.PERMISSION_DENIED ? '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.' : '내 위치를 찾지 못했어요.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="h-full w-full bg-sea-100" role="application" aria-label="제주 역사문화 지도" />
      <div className="absolute right-3 top-3 z-[500] flex max-w-[70%] flex-col items-end gap-1.5">
        <button type="button" onClick={locate} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-sea-700 shadow hover:bg-sea-50" aria-label="내 위치로 이동">
          📍 내 위치
        </button>
        {locMsg && (
          <p role="status" className="rounded-xl bg-white/95 px-3 py-1.5 text-xs text-basalt-800 shadow">
            {locMsg}
          </p>
        )}
      </div>
    </div>
  )
}
