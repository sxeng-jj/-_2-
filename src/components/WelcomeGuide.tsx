import { useEffect } from 'react'

const STEPS = [
  { icon: '🧭', title: '둘러보기', text: '지도와 목록에서 제주의 역사·문화 장소 120곳을 찾아보세요. 검색, 지역·분류 필터를 쓸 수 있어요.' },
  { icon: '⭐', title: '코스 만들기', text: '마음에 드는 곳의 ☆를 눌러 담으면 담은 순서대로 코스가 만들어져요. 하루씩 나누고, 링크로 친구와 공유할 수도 있어요.' },
  { icon: '👣', title: '다녀온 곳 기록', text: '다녀온 곳은 "방문 기록하기"로 날짜·별점·메모를 남겨 보세요. 얼마나 다녔는지 한눈에 볼 수 있어요.' },
]

export default function WelcomeGuide({ canSignUp, onSignUp, onClose }: { canSignUp: boolean; onSignUp: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-sea-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="제주잇길 이용 안내" className="max-h-full w-full max-w-md overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="text-xs font-semibold tracking-[0.2em] text-sea-600">JEJU IT-GIL</div>
        <h2 className="mt-1 text-xl font-extrabold text-sea-900">제주잇길에 오신 것을 환영해요</h2>
        <p className="mt-1 text-sm text-basalt-500">제주의 역사와 문화 유적을 지도에서 찾아, 나만의 답사 코스로 만들어 보세요.</p>

        <ol className="mt-4 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl bg-sand-50 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sea-600 text-base text-white" aria-hidden>
                {s.icon}
              </span>
              <div>
                <div className="text-sm font-bold text-sea-900">
                  {i + 1}. {s.title}
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-basalt-800">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-xs leading-relaxed text-basalt-500">
          로그인 없이도 모든 기능을 쓸 수 있어요. 담은 코스와 방문 기록은 이 브라우저에 저장돼요.
          {canSignUp && ' 가입하면 계정별로 따로 저장돼요.'}
        </p>

        <div className="mt-5 flex gap-2">
          {canSignUp && (
            <button type="button" onClick={onSignUp} className="flex-1 rounded-full border border-sea-600 py-2.5 text-sm font-bold text-sea-700 hover:bg-sea-50">
              회원가입
            </button>
          )}
          <button type="button" autoFocus onClick={onClose} className="flex-1 rounded-full bg-sea-600 py-2.5 text-sm font-bold text-white hover:bg-sea-500">
            시작하기
          </button>
        </div>
      </div>
    </div>
  )
}
