import { useState } from 'react'
import { useTrip } from '../store/TripContext'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 방문 기록 입력/수정 폼 (장소 1곳당 기록 1건) */
export default function VisitForm({ placeId, onDone }: { placeId: string; onDone?: () => void }) {
  const { data, setVisit, removeVisit } = useTrip()
  const prev = data.visits[placeId]
  const [date, setDate] = useState(prev?.visitedAt ?? today())
  const [rating, setRating] = useState(prev?.rating ?? 0)
  const [memo, setMemo] = useState(prev?.memo ?? '')

  return (
    <form
      className="space-y-3 rounded-2xl border border-moss-500/30 bg-moss-100/50 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        setVisit({ placeId, visitedAt: date, rating, memo: memo.trim() })
        onDone?.()
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">
          방문일{' '}
          <input
            type="date"
            required
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="ml-1 rounded-lg border border-sand-200 bg-white px-2 py-1 text-sm"
          />
        </label>
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label="별점">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n}점`}
              onClick={() => setRating(rating === n ? 0 : n)}
              className={`text-xl leading-none ${n <= rating ? 'text-canola-400' : 'text-sand-200'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="방문 후기를 남겨 보세요 (선택)"
        className="w-full resize-none rounded-xl border border-sand-200 bg-white p-2 text-sm"
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-full bg-moss-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-moss-500">
          {prev ? '기록 수정' : '방문 기록하기'}
        </button>
        {prev && (
          <button
            type="button"
            onClick={() => {
              removeVisit(placeId)
              onDone?.()
            }}
            className="rounded-full border border-sand-200 bg-white px-4 py-1.5 text-sm text-basalt-500 hover:text-red-600"
          >
            기록 삭제
          </button>
        )}
      </div>
    </form>
  )
}
