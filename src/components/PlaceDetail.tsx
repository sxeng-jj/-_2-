import { useState } from 'react'
import { queriesFor } from '../lib/pixabay'
import { useTrip } from '../store/TripContext'
import PixabayPhoto from './PixabayPhoto'
import type { Place } from '../types'
import { FavButton, Tag } from './ui'
import VisitForm from './VisitForm'

function Row({ k, v }: { k: string; v: string }) {
  if (!v) return null
  return (
    <>
      <dt className="text-basalt-500">{k}</dt>
      <dd className="break-words">{v}</dd>
    </>
  )
}

function Section({ title, text }: { title: string; text: string }) {
  if (!text) return null
  return (
    <section className="mt-5">
      <h3 className="mb-1 text-sm font-bold text-sea-700">{title}</h3>
      <p className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-sand-100/70 p-3 text-sm leading-relaxed">{text}</p>
    </section>
  )
}

export default function PlaceDetail({ place: p, onBack }: { place: Place; onBack: () => void }) {
  const { data } = useTrip()
  const visit = data.visits[p.id]
  const [editing, setEditing] = useState(false)

  return (
    <article>
      <PixabayPhoto queries={queriesFor(p)} seed={Number(p.id)} className="h-44">
        <button type="button" onClick={onBack} className="m-3 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-sea-700 shadow hover:bg-white">
          ← 목록으로
        </button>
      </PixabayPhoto>
      <div className="p-5">

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-sea-900">{p.name}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.category && <Tag>{[p.category, p.dir1, p.dir2].filter(Boolean).join(' › ')}</Tag>}
            <Tag tone="sand">{p.region}</Tag>
            {visit && <Tag tone="moss">✓ {visit.visitedAt} 방문</Tag>}
          </div>
        </div>
        <FavButton id={p.id} size="lg" withLabel />
      </div>

      <div className="mt-4">
        {visit && !editing ? (
          <div className="rounded-2xl border border-moss-500/30 bg-moss-100/50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-moss-600">나의 방문 기록</span>
              <button type="button" onClick={() => setEditing(true)} className="text-xs text-sea-600 hover:underline">
                수정
              </button>
            </div>
            <div className="mt-1 text-canola-400">{'★'.repeat(visit.rating)}<span className="text-sand-200">{'★'.repeat(5 - visit.rating)}</span></div>
            {visit.memo && <p className="mt-1 whitespace-pre-wrap">{visit.memo}</p>}
          </div>
        ) : editing || !visit ? (
          <details open={editing} className="group rounded-2xl">
            {!editing && (
              <summary className="cursor-pointer list-none rounded-full border border-moss-500 px-4 py-2 text-center text-sm font-semibold text-moss-600 hover:bg-moss-100">
                ✓ 다녀왔어요 — 방문 기록하기
              </summary>
            )}
            <div className={editing ? '' : 'mt-3'}>
              <VisitForm placeId={p.id} onDone={() => setEditing(false)} />
            </div>
          </details>
        ) : null}
      </div>

      <dl className="mt-5 grid grid-cols-[84px_1fr] gap-x-3 gap-y-1.5 text-sm">
        <Row k="주소" v={p.address} />
        <Row k="우편번호" v={p.zip} />
        <Row k="좌표" v={`${p.lat}, ${p.lng}`} />
        <Row k="제목" v={p.title} />
        <Row k="부제목" v={p.subtitle} />
        <Row k="저작자" v={p.author} />
        <Row k="발행자" v={p.publisher} />
        <Row k="발행일" v={p.publishedAt} />
        <Row k="자료유형" v={p.mediaType} />
        <Row k="주제어" v={p.topic.replace(/\./g, ' · ')} />
        <Row k="범위" v={p.scope} />
      </dl>

      <Section title="내용" text={p.content} />
      <Section title="목차" text={p.toc} />
      <Section title="초록" text={p.abstract} />

      <p className="mt-5 text-sm">
        <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-sea-600 underline">
          제주도 문화 디지털콘텐츠에서 원문 보기 ↗
        </a>
        <span className="ml-1 text-xs text-basalt-500">(인터넷 필요 · 기준일 {p.baseDate})</span>
      </p>
      </div>
    </article>
  )
}
