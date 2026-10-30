import { useState, type ReactNode } from 'react'
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

/** 긴 글은 여섯 줄까지만 보여 주고 "더보기"로 펼친다 (작은 스크롤 상자 대신) */
function Story({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false)
  if (!text) return null
  const long = text.length > 280
  return (
    <section className="mt-5">
      <h3 className="mb-1 text-sm font-bold text-sea-700">{title}</h3>
      <p className={`whitespace-pre-wrap text-sm leading-relaxed ${long && !open ? 'line-clamp-6' : ''}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 text-sm font-semibold text-sea-600 hover:underline">
          {open ? '접기' : '더보기'}
        </button>
      )}
    </section>
  )
}

function MapLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-1 whitespace-nowrap rounded-full border border-sea-600 px-2 py-2 text-center text-sm font-semibold text-sea-700 hover:bg-sea-50"
    >
      {children}
    </a>
  )
}

/** 외부 지도 앱의 길찾기 링크 (목적지가 장소 좌표로 채워진다) */
const directions = (p: Place) => {
  const name = encodeURIComponent(p.name)
  return {
    kakao: `https://map.kakao.com/link/to/${name},${p.lat},${p.lng}`,
    naver: `https://map.naver.com/p/search/${encodeURIComponent(`${p.name} 제주`)}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,
  }
}

export default function PlaceDetail({ place: p, onBack }: { place: Place; onBack: () => void }) {
  const { data } = useTrip()
  const visit = data.visits[p.id]
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const dir = directions(p)

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(p.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 복사가 막힌 환경에서는 주소를 눈으로 보고 쓰면 된다 */
    }
  }

  return (
    <article>
      <PixabayPhoto queries={queriesFor(p)} seed={Number(p.id)} className="h-44" notice>
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

        {/* 가는 방법: 주소와 길찾기를 가장 먼저 */}
        <div className="mt-4 rounded-2xl bg-sand-100/70 p-3">
          <div className="flex items-start justify-between gap-2 text-sm">
            <div>
              <span aria-hidden>📍 </span>
              {p.address}
            </div>
            <button type="button" onClick={copyAddress} className="shrink-0 rounded-full border border-sand-200 bg-white px-2.5 py-0.5 text-xs text-basalt-500 hover:text-sea-700">
              {copied ? '복사됨' : '주소 복사'}
            </button>
          </div>
          <div className="mt-2 flex gap-1.5">
            <MapLink href={dir.kakao}>카카오맵 길찾기</MapLink>
            <MapLink href={dir.naver}>네이버지도</MapLink>
            <MapLink href={dir.google}>구글지도</MapLink>
          </div>
        </div>

        {(p.title || p.subtitle) && (
          <div className="mt-5">
            <div className="text-base font-bold text-basalt-800">{p.title}</div>
            {p.subtitle && <div className="text-sm text-basalt-500">{p.subtitle}</div>}
          </div>
        )}
        <Story title="이야기" text={p.content || p.abstract} />
        {p.content && p.abstract && <Story title="초록" text={p.abstract} />}

        <div className="mt-5">
          {visit && !editing ? (
            <div className="rounded-2xl border border-moss-500/30 bg-moss-100/50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-moss-600">나의 방문 기록</span>
                <button type="button" onClick={() => setEditing(true)} className="text-xs text-sea-600 hover:underline">
                  수정
                </button>
              </div>
              <div className="mt-1 text-canola-400">
                {'★'.repeat(visit.rating)}
                <span className="text-sand-200">{'★'.repeat(5 - visit.rating)}</span>
              </div>
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

        {/* 서지·자료 정보는 접어 둔다 */}
        <details className="mt-5 rounded-2xl border border-sand-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold text-basalt-800 hover:text-sea-700">자료 정보 보기 ▾</summary>
          <div className="border-t border-sand-200 px-4 pb-4 pt-3">
            <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-sm">
              <Row k="저작자" v={p.author} />
              <Row k="발행자" v={p.publisher} />
              <Row k="발행일" v={p.publishedAt} />
              <Row k="자료유형" v={p.mediaType} />
              <Row k="주제어" v={p.topic.replace(/\./g, ' · ')} />
              <Row k="범위" v={p.scope} />
              <Row k="우편번호" v={p.zip} />
              <Row k="좌표" v={`${p.lat}, ${p.lng}`} />
            </dl>
            <Story title="목차" text={p.toc} />
          </div>
        </details>

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
