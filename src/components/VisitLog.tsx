import { useState } from 'react'
import { PLACES, PLACE_MAP } from '../data/places'
import { useTrip } from '../store/TripContext'
import { Empty, shortAddress, Tag } from './ui'
import VisitForm from './VisitForm'

interface Props {
  onFocus: (id: string) => void
  onOpen: (id: string) => void
  onGoExplore: () => void
}

export default function VisitLog({ onFocus, onOpen, onGoExplore }: Props) {
  const { data } = useTrip()
  const [editId, setEditId] = useState<string | null>(null)

  const visits = Object.values(data.visits)
    .filter((v) => PLACE_MAP.has(v.placeId))
    .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
  const pct = Math.round((visits.length / PLACES.length) * 100)

  const byRegion = ['제주시', '서귀포시'].map((r) => ({
    r,
    done: visits.filter((v) => PLACE_MAP.get(v.placeId)?.region === r).length,
    all: PLACES.filter((p) => p.region === r).length,
  }))

  return (
    <div className="p-5">
      <div className="rounded-2xl bg-gradient-to-br from-moss-600 to-sea-700 p-4 text-white">
        <div className="text-sm opacity-80">나의 제주 역사문화 탐방</div>
        <div className="mt-1 text-2xl font-bold">
          {visits.length}곳 <span className="text-base font-normal opacity-80">/ {PLACES.length}곳 ({pct}%)</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-canola-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex gap-4 text-xs opacity-90">
          {byRegion.map((x) => (
            <span key={x.r}>
              {x.r} {x.done}/{x.all}
            </span>
          ))}
        </div>
      </div>

      {visits.length === 0 ? (
        <Empty icon="👣" title="아직 방문 기록이 없어요">
          장소 상세에서 "다녀왔어요"를 누르거나
          <br />
          코스에서 "방문 체크"로 발자국을 남겨 보세요.
          <div>
            <button type="button" onClick={onGoExplore} className="mt-4 rounded-full bg-sea-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sea-500">
              장소 탐색하러 가기
            </button>
          </div>
        </Empty>
      ) : (
        <ul className="mt-4 space-y-3">
          {visits.map((v) => {
            const p = PLACE_MAP.get(v.placeId)!
            return (
              <li key={v.placeId} className="rounded-2xl border border-sand-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => onFocus(p.id)} className="min-w-0 text-left">
                    <div className="truncate font-semibold text-sea-900">{p.name}</div>
                    <div className="truncate text-xs text-basalt-500">{shortAddress(p)}</div>
                  </button>
                  <Tag tone="moss">{v.visitedAt}</Tag>
                </div>
                <div className="mt-1 text-sm text-canola-400">
                  {'★'.repeat(v.rating)}
                  <span className="text-sand-200">{'★'.repeat(5 - v.rating)}</span>
                </div>
                {v.memo && <p className="mt-1 whitespace-pre-wrap text-sm">{v.memo}</p>}
                {editId === v.placeId ? (
                  <div className="mt-3">
                    <VisitForm placeId={v.placeId} onDone={() => setEditId(null)} />
                  </div>
                ) : (
                  <div className="mt-2 flex gap-3 text-xs">
                    <button type="button" onClick={() => setEditId(v.placeId)} className="text-sea-600 hover:underline">
                      수정·삭제
                    </button>
                    <button type="button" onClick={() => onOpen(p.id)} className="text-sea-600 hover:underline">
                      상세 보기
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
