// 제주 역사문화 CSV 2개(CP949)를 "데이터 고유번호"로 합쳐 src/data/places.json 으로 만든다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(here, '..', '..') // CSV가 있는 상위 폴더
const out = path.resolve(here, '..', 'src', 'data', 'places.json')
const dec = new TextDecoder('euc-kr')

function parseCsv(text) {
  const rows = []
  let r = [], f = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c
    } else if (c === '"') q = true
    else if (c === ',') { r.push(f); f = '' }
    else if (c === '\n') { r.push(f.replace(/\r$/, '')); rows.push(r); r = []; f = '' }
    else f += c
  }
  if (f || r.length) { r.push(f); rows.push(r) }
  return rows.filter((x) => x.length > 1)
}

function load(keyword) {
  const file = fs.readdirSync(srcDir).find((n) => n.includes(keyword) && n.endsWith('.csv'))
  if (!file) throw new Error(`CSV를 찾지 못했습니다: ${keyword}`)
  const rows = parseCsv(dec.decode(fs.readFileSync(path.join(srcDir, file))).replace(/^\uFEFF/, ''))
  const head = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => Object.fromEntries(head.map((k, i) => [k, (r[i] ?? '').trim()])))
}

const clean = (v) => (!v || v === '해당없음' ? '' : v)
const loc = load('위치정보')
const gen = new Map(load('일반정보').map((x) => [x['데이터 고유번호'], x]))

const places = loc.map((l) => {
  const g = gen.get(l['데이터 고유번호']) ?? {}
  const address = l['위치']
  return {
    id: l['데이터 고유번호'],
    name: l['장소명'],
    lat: Number(l['위도']),
    lng: Number(l['경도']),
    zip: l['우편번호'],
    address,
    region: /서귀포시/.test(address) ? '서귀포시' : /제주시/.test(address) ? '제주시' : '기타',
    sourceUrl: l['데이터 상세보기 URL'],
    baseDate: l['데이터기준일자'],
    category: clean(g['분류']),
    dir1: clean(g['디렉토리1']),
    dir2: clean(g['디렉토리2']),
    title: clean(g['제목']),
    subtitle: clean(g['부제목']),
    author: clean(g['저작자']),
    topic: clean(g['주제']),
    content: clean(g['내용']),
    toc: clean(g['목차']),
    abstract: clean(g['초록']),
    publisher: clean(g['발행자']),
    publishedAt: clean(g['발행일']),
    mediaType: clean(g['자료유형']),
    language: clean(g['언어']),
    scope: clean(g['범위']),
  }
})

fs.writeFileSync(out, JSON.stringify(places))
console.log(`places.json: ${places.length}건 (일반정보 매칭 ${places.filter((p) => p.title).length}건)`)
