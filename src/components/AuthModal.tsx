import { useEffect, useState, type FormEvent } from 'react'
import { AuthError, useAuth } from '../store/AuthContext'

type Mode = 'login' | 'signup'

const input = 'w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm outline-none focus:border-sea-500 focus:ring-2 focus:ring-sea-100'

function validate(email: string, password: string, nickname?: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return '이메일 형식이 올바르지 않아요.'
  if (nickname !== undefined && (nickname.trim().length < 2 || nickname.trim().length > 12)) return '닉네임은 2~12자로 입력해 주세요.'
  if (password.length < 8) return '비밀번호는 8자 이상이어야 해요.'
  if (nickname !== undefined && !(/[A-Za-z]/.test(password) && /\d/.test(password))) return '비밀번호에 영문과 숫자를 함께 넣어 주세요.'
  return ''
}

export default function AuthModal({ initialMode, onClose }: { initialMode: Mode; onClose: () => void }) {
  const { logIn, signUp, configured } = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const signup = mode === 'signup'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const msg = validate(email, password, signup ? nickname : undefined)
    if (msg) return setError(msg)
    if (signup && password !== confirm) return setError('비밀번호 확인이 일치하지 않아요.')
    setBusy(true)
    try {
      if (signup) {
        const { needsConfirm } = await signUp(email, password, nickname)
        if (needsConfirm) return setSentTo(email.trim())
      } else {
        await logIn(email, password)
      }
      onClose()
    } catch (err) {
      setError(err instanceof AuthError ? err.message : '문제가 생겼어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-sea-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={signup ? '회원가입' : '로그인'} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        {sentTo ? (
          <div className="py-4 text-center">
            <div className="text-4xl" aria-hidden>
              ✉️
            </div>
            <h2 className="mt-2 text-lg font-bold text-sea-900">확인 메일을 보냈어요</h2>
            <p className="mt-2 text-sm leading-relaxed text-basalt-500">
              <b className="text-basalt-800">{sentTo}</b> 의 받은 편지함에서 인증 링크를 누르면 가입이 완료돼요. 인증 후 로그인해 주세요.
            </p>
            <button type="button" onClick={onClose} className="mt-5 w-full rounded-full bg-sea-600 py-2.5 text-sm font-bold text-white hover:bg-sea-500">
              확인
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex rounded-full bg-sand-100 p-1">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 rounded-full py-1.5 text-sm font-semibold ${mode === m ? 'bg-sea-600 text-white shadow' : 'text-basalt-500'}`}
                >
                  {m === 'login' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>

            {!configured && (
              <p role="alert" className="mb-3 rounded-xl bg-canola-300/40 px-3 py-2 text-xs leading-relaxed text-basalt-800">
                로그인 서버(Supabase)가 아직 연결되지 않았어요. <code>.env.local</code> 에 환경변수를 넣고 다시 실행해 주세요. (README 참고)
              </p>
            )}

            <form onSubmit={submit} className="space-y-3" noValidate>
              <label className="block text-sm font-medium">
                이메일
                <input type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 ${input}`} placeholder="you@example.com" />
              </label>
              {signup && (
                <label className="block text-sm font-medium">
                  닉네임
                  <input value={nickname} maxLength={12} onChange={(e) => setNickname(e.target.value)} className={`mt-1 ${input}`} placeholder="2~12자" />
                </label>
              )}
              <label className="block text-sm font-medium">
                비밀번호
                <input
                  type="password"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`mt-1 ${input}`}
                  placeholder={signup ? '8자 이상, 영문+숫자' : ''}
                />
              </label>
              {signup && (
                <label className="block text-sm font-medium">
                  비밀번호 확인
                  <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`mt-1 ${input}`} />
                </label>
              )}

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className="w-full rounded-full bg-sea-600 py-2.5 text-sm font-bold text-white hover:bg-sea-500 disabled:opacity-60">
                {busy ? '처리 중…' : signup ? '가입하기' : '로그인'}
              </button>
            </form>

            <p className="mt-4 text-xs leading-relaxed text-basalt-500">
              {signup && '지금 담아 둔 찜·방문 기록은 새 계정으로 옮겨져요. '}
              찜·방문 기록은 이 브라우저에 계정별로 저장돼요.
            </p>
            <button type="button" onClick={onClose} className="mt-3 w-full text-center text-sm text-basalt-500 hover:text-sea-700">
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  )
}
