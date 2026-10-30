/** 코스 공유 링크: 주소 뒤 #c=장소id.장소id…&b=하루가 시작되는 id.… 형태로 담는다. 서버 없이 링크만으로 공유된다. */
export interface SharedCourse {
  course: string[]
  breaks: string[]
}

const list = (v: string | null) => (v ? v.split('.').filter((x) => /^\d+$/.test(x)) : [])

export function shareUrl({ course, breaks }: SharedCourse) {
  const base = location.href.split('#')[0]
  const qs = new URLSearchParams({ c: course.join('.') })
  if (breaks.length) qs.set('b', breaks.join('.'))
  return `${base}#${qs}`
}

/** 주소의 #c=… 를 읽는다. 공유 링크가 아니면 null */
export function readShared(hash: string): SharedCourse | null {
  if (!hash.includes('c=')) return null
  const qs = new URLSearchParams(hash.replace(/^#/, ''))
  const course = [...new Set(list(qs.get('c')))]
  return course.length ? { course, breaks: list(qs.get('b')) } : null
}
