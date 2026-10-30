import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { PLACES, PLACE_MAP } from '../data/places'
import { useTrip } from '../store/TripContext'
import type { Place } from '../types'

interface Props {
  /** 지도에 보여 줄 장소 (찜한 곳은 항상 함께 보인다) */
  places: Place[]
  selectedId: string | null
  /** 값이 바뀔 때마다 보이는 핀 전체에 맞춰 지도를 이동한다 */
  fitKey: string
  onSelect: (id: string) => void
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

export default function MapView({ places, selectedId, fitKey, onSelect }: Props) {
  const { data, toggleFav } = useTrip()
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const route = useRef<L.Polyline | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  // 팝업·이벤트에서 항상 최신 값을 읽기 위한 ref
  const live = useRef({ data, toggleFav, onSelect })
  live.current = { data, toggleFav, onSelect }

  const popupFor = (p: Place) => {
    const { data: d, toggleFav: tf, onSelect: sel } = live.current
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
    layer.current = L.layerGroup().addTo(m)
    route.current = L.polyline([], { color: COLORS.course, weight: 5, opacity: 0.9, dashArray: '10 8' }).addTo(m)
    PLACES.forEach((p) => {
      const mk = L.marker([p.lat, p.lng], { icon: makeIcon({ order: 0, visited: false, selected: false }), title: p.name })
      mk.bindPopup(() => popupFor(p), { maxWidth: 270 })
      mk.on('click', () => live.current.onSelect(p.id))
      markers.current.set(p.id, mk)
    })
    map.current = m
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current!)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
      markers.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 보이는 핀·아이콘·코스 선 갱신
  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    const visible = new Set([...places.map((p) => p.id), ...data.course])
    visible.forEach((id) => {
      const mk = markers.current.get(id)
      const place = PLACE_MAP.get(id)
      if (!mk || !place) return
      mk.setIcon(makeIcon({ order: data.course.indexOf(id) + 1, visited: id in data.visits, selected: id === selectedId }))
      g.addLayer(mk)
      if (mk.isPopupOpen()) mk.getPopup()?.setContent(popupFor(place))
    })
    route.current?.setLatLngs(data.course.flatMap((id) => markers.current.get(id)?.getLatLng() ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, data, selectedId])

  // 선택 시 해당 핀으로 이동 + 팝업
  useEffect(() => {
    if (!selectedId || !map.current) return
    const mk = markers.current.get(selectedId)
    if (!mk || !layer.current?.hasLayer(mk)) return
    map.current.setView(mk.getLatLng(), Math.max(map.current.getZoom(), 12), { animate: true })
    mk.openPopup()
  }, [selectedId])

  // 필터·탭 변경 시 보이는 핀에 맞춰 이동
  useEffect(() => {
    const ids = new Set([...places.map((p) => p.id), ...data.course])
    const pts = [...ids].flatMap((id) => markers.current.get(id)?.getLatLng() ?? [])
    if (pts.length && map.current) map.current.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 13, animate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  return <div ref={el} className="h-full w-full bg-sea-100" role="application" aria-label="제주 역사문화 지도" />
}
