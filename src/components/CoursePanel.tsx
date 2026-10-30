import { useState } from 'react'
import { distanceKm, routeDistanceKm } from '../lib/geo'
import { shareUrl } from '../lib/share'
import { usePlaces } from '../store/PlacesContext'
import { useTrip } from '../store/TripContext'
import type { Place } from '../types'
import { Empty, Tag } from './ui'

// 직선거리에 도로 굴곡 계수를 곱하고 평균 시속으로 나눈 "대략" 이동시간
const ROAD_FACTOR = 1.3
const AVG_KMH = 40

function fmtTime(km: number) {
  const min = Math.round(((km * ROAD_FACTOR) / AVG_KMH) * 60)
  const h = Math.floor(min / 60)
  return h ? `${h}시간 ${min % 60}분` : `${min}분`
}

interface Props {
  onFocus: (id: string) => void
  onOpen: (id: string) => void
  onFit: () => void
  onGoExplore: () => void
}

export default function CoursePanel({ onFocus, onOpen, onFit, onGoExplore }: Props) {
  const { data, moveFav, toggleFav, clearCourse, setVisit, reorderFav, toggleBreak } = useTrip()
  const { placeMap: PLACE_MAP } = usePlaces()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const stops = data.course.map((id) => PLACE_MAP.get(id)).filter((p): p is Place => !!p)

  if (!stops.length)
    return (
      <Empty icon="🗺️" title="아직 담은 장소가 없어요">
        탐색 탭에서 ☆를 눌러 장소를 담으면
        <br />
        담은 순서대로 지도에 선이 이어져 나만의 코스가 만들어져요.
        <div>
          <button type="button" onClick={onGoExplore} className="mt-4 rounded-full bg-sea-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sea-500">
            장소 탐색하러 가기
          </button>
        </div>
      </Empty>
    )

  // 하루가 시작되는 장소(breaks)를 기준으로 일차별로 나눈다
  const days: Place[][] = []
  stops.forEach((p, i) => {
    if (i === 0 || data.breaks.includes(p.id)) days.push([])
    days[days.length - 1].push(p)
  })
  const multiDay = days.length > 1

  const total = days.reduce((sum, d) => sum + routeDistanceKm(d), 0)
  const done = stops.filter((p) => p.id in data.visits).length

  const copyLink = async () => {
    const url = shareUrl({ course: data.course, breaks: data.breaks })
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('아래 링크를 복사해서 공유하세요.', url)
    }
  }

  const drop = (targetId: string) => {
    if (dragId && dragId !== targetId) reorderFav(dragId, data.course.indexOf(targetId))
    setDragId(null)
    setOverId(null)
  }

  let order = 0
  return (
    <div className="p-5">
      <div className="rounded-2xl bg-gradient-to-br from-sea-600 to-sea-700 p-4 text-white">
        <div className="text-sm opacity-80">나만의 답사 코스</div>
        <div className="mt-1 text-2xl font-bold">
          {multiDay && `${days.length}일 · `}
          {stops.length}곳 · 약 {total.toFixed(1)}km
        </div>
        <div className="mt-1 text-xs opacity-80">
          차량 이동 대략 {fmtTime(total)} (직선거리 ×{ROAD_FACTOR}, 평균 {AVG_KMH}km/h 가정) · 방문 완료 {done}/{stops.length}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onFit} className="rounded-full bg-white/20 px-3 py-1 text-sm hover:bg-white/30">
            코스 전체 보기
          </button>
          <button type="button" onClick={copyLink} className="rounded-full bg-white/20 px-3 py-1 text-sm hover:bg-white/30">
            {copied ? '✓ 링크 복사됨' : '🔗 코스 링크 복사'}
          </button>
          <button
            type="button"
            onClick={() => confirm('담은 장소를 모두 비울까요?') && clearCourse()}
            className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/30"
          >
            전체 비우기
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-basalt-500">카드를 끌어서 순서를 바꾸거나 ▲▼ 버튼을 쓰세요. 장소 사이의 "하루 나누기"로 일차를 나눌 수 있어요. 링크를 받은 사람은 같은 코스를 가져갈 수 있어요.</p>

      <div className="mt-4">
        {days.map((day, di) => (
          <section key={day[0].id} aria-label={multiDay ? `${di + 1}일차` : undefined}>
            {multiDay && (
              <div className={`flex items-center justify-between gap-2 ${di > 0 ? 'mt-5' : ''} mb-2`}>
                <h3 className="text-sm font-bold text-sea-700">
                  {di + 1}일차 <span className="font-normal text-basalt-500">· {day.length}곳 · 약 {routeDistanceKm(day).toFixed(1)}km</span>
                </h3>
                {di > 0 && (
                  <button type="button" onClick={() => toggleBreak(day[0].id)} className="rounded-full border border-sand-200 px-2.5 py-0.5 text-xs text-basalt-500 hover:text-sea-700">
                    이전 날과 합치기
                  </button>
                )}
              </div>
            )}
            <ol>
              {day.map((p, i) => {
                const visited = p.id in data.visits
                const n = ++order
                const idx = data.course.indexOf(p.id)
                return (
                  <li key={p.id}>
                    {i > 0 && (
                      <div className="ml-4 flex flex-wrap items-center gap-x-2 border-l-2 border-dashed border-citrus-400 py-1.5 pl-6 text-xs text-basalt-500">
                        <span>
                          ↓ 직선 {distanceKm(day[i - 1], p).toFixed(1)}km · 약 {fmtTime(distanceKm(day[i - 1], p))}
                        </span>
                        <button type="button" onClick={() => toggleBreak(p.id)} className="rounded-full border border-sand-200 px-2 py-0.5 hover:text-sea-700">
                          ✂ 여기서 하루 나누기
                        </button>
                      </div>
                    )}
                    <div
                      draggable
                      onDragStart={(e) => {
                        setDragId(p.id)
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', p.id)
                      }}
                      onDragOver={(e) => {
                        if (!dragId) return
                        e.preventDefault()
                        setOverId(p.id)
                      }}
                      onDragLeave={() => setOverId((o) => (o === p.id ? null : o))}
                      onDrop={(e) => {
                        e.preventDefault()
                        drop(p.id)
                      }}
                      onDragEnd={() => {
                        setDragId(null)
                        setOverId(null)
                      }}
                      className={`flex cursor-grab items-center gap-3 rounded-2xl border bg-white p-3 transition ${
                        overId === p.id && dragId !== p.id ? 'border-citrus-500 ring-2 ring-citrus-400/40' : 'border-sand-200'
                      } ${dragId === p.id ? 'opacity-40' : ''}`}
                    >
                      <span className="hidden select-none text-basalt-500 sm:block" aria-hidden title="끌어서 순서 바꾸기">
                        ⠿
                      </span>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${visited ? 'bg-moss-500' : 'bg-citrus-500'}`}>
                        {visited ? '✓' : n}
                      </span>
                      <button type="button" onClick={() => onFocus(p.id)} className="min-w-0 flex-1 text-left">
                        <div className="truncate font-semibold text-sea-900">{p.name}</div>
                        <div className="truncate text-xs text-basalt-500">{p.address.replace('제주특별자치도 ', '')}</div>
                        <div className="mt-1 flex gap-1">{p.category && <Tag>{p.category}</Tag>}</div>
                      </button>
                      <div className="flex shrink-0 flex-col gap-1 text-xs">
                        <div className="flex gap-1">
                          <button type="button" aria-label="위로" disabled={idx === 0} onClick={() => moveFav(p.id, -1)} className="rounded border border-sand-200 px-1.5 py-0.5 disabled:opacity-30">
                            ▲
                          </button>
                          <button type="button" aria-label="아래로" disabled={idx === stops.length - 1} onClick={() => moveFav(p.id, 1)} className="rounded border border-sand-200 px-1.5 py-0.5 disabled:opacity-30">
                            ▼
                          </button>
                          <button type="button" aria-label="코스에서 빼기" onClick={() => toggleFav(p.id)} className="rounded border border-sand-200 px-1.5 py-0.5 hover:text-red-600">
                            ✕
                          </button>
                        </div>
                        <div className="flex gap-1 whitespace-nowrap">
                          {!visited && (
                            <button
                              type="button"
                              onClick={() => setVisit({ placeId: p.id, visitedAt: new Date().toISOString().slice(0, 10), rating: 0, memo: '' })}
                              className="flex-1 rounded border border-moss-500 px-1.5 py-0.5 text-moss-600 hover:bg-moss-100"
                            >
                              방문 체크
                            </button>
                          )}
                          <button type="button" onClick={() => onOpen(p.id)} className="flex-1 rounded border border-sand-200 px-1.5 py-0.5 hover:bg-sand-100">
                            상세
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
