import { useEffect, useState, type FormEvent } from 'react'
import { AuthError, useAuth } from '../store/AuthContext'

export type AuthMode = 'login' | 'signup' | 'forgot' | 'recover'

const input = 'w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm outline-none focus:border-sea-500 focus:ring-2 focus:ring-sea-100'
const RESEND_COOLDOWN = 60

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

function validate(email: string, password: string, nickname?: string) {
  if (!isEmail(email)) return '이메일 형식이 올바르지 않아요.'
  if (nickname !== undefined && (nickname.trim().length < 2 || nickname.trim().length > 12)) return '닉네임은 2~12자로 입력해 주세요.'
  if (password.length < 8) return '비밀번호는 8자 이상이어야 해요.'
  if (nickname !== undefined && !(/[A-Za-z]/.test(password) && /\d/.test(password))) return '비밀번호에 영문과 숫자를 함께 넣어 주세요.'
  return ''
}

/** 메일 재발송 버튼 (연타 방지용 대기 시간 포함) */
function ResendButton({ email, label = '메일 다시 보내기' }: { email: string; label?: string }) {
  const { resendConfirmation } = useAuth()
  const [wait, setWait] = useState(0)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const send = async () => {
    setMsg('')
    setWait(RESEND_COOLDOWN)
    try {
      await resendConfirmation(email)
      setMsg('메일을 다시 보냈어요.')
    } catch (e) {
      setMsg(e instanceof AuthError ? e.message : '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <div className="mt-3 text-center">
      <button type="button" onClick={send} disabled={wait > 0} className="text-sm font-semibold text-sea-700 underline-offset-2 hover:underline disabled:text-basalt-500 disabled:no-underline">
        {wait > 0 ? `${label} (${wait}초 후 가능)` : label}
      </button>
      {msg && (
        <p role="status" className="mt-1 text-xs text-basalt-500">
          {msg}
        </p>
      )}
    </div>
  )
}

export default function AuthModal({ initialMode, onClose }: { initialMode: AuthMode; onClose: () => void }) {
  const { logIn, signUp, sendPasswordReset, updatePassword, finishRecovery, configured } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  /** 메일을 보낸 뒤 보여 줄 안내: signup = 인증 메일, reset = 재설정 메일 */
  const [sent, setSent] = useState<{ kind: 'signup' | 'reset'; to: string } | null>(null)
  const signup = mode === 'signup'

  const close = () => {
    if (mode === 'recover') finishRecovery()
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setUnconfirmed(false)

    if (mode === 'forgot') {
      if (!isEmail(email)) return setError('이메일 형식이 올바르지 않아요.')
    } else if (mode === 'recover') {
      if (password.length < 8 || !(/[A-Za-z]/.test(password) && /\d/.test(password))) return setError('비밀번호는 8자 이상, 영문과 숫자를 함께 넣어 주세요.')
      if (password !== confirm) return setError('비밀번호 확인이 일치하지 않아요.')
    } else {
      const msg = validate(email, password, signup ? nickname : undefined)
      if (msg) return setError(msg)
      if (signup && password !== confirm) return setError('비밀번호 확인이 일치하지 않아요.')
    }

    setBusy(true)
    try {
      if (mode === 'forgot') {
        await sendPasswordReset(email)
        return setSent({ kind: 'reset', to: email.trim() })
      }
      if (mode === 'recover') {
        await updatePassword(password)
        return onClose()
      }
      if (signup) {
        const { needsConfirm } = await signUp(email, password, nickname)
        if (needsConfirm) return setSent({ kind: 'signup', to: email.trim() })
      } else {
        await logIn(email, password)
      }
      onClose()
    } catch (err) {
      setError(err instanceof AuthError ? err.message : '문제가 생겼어요. 잠시 후 다시 시도해 주세요.')
      setUnconfirmed(err instanceof AuthError && err.kind === 'unconfirmed')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (m: AuthMode) => {
    setMode(m)
    setError('')
    setUnconfirmed(false)
    setPassword('')
    setConfirm('')
  }

  const title = { login: '로그인', signup: '회원가입', forgot: '비밀번호 찾기', recover: '새 비밀번호 설정' }[mode]
  const submitLabel = { login: '로그인', signup: '가입하기', forgot: '재설정 메일 보내기', recover: '비밀번호 변경' }[mode]

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-sea-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-full w-full max-w-sm overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        {sent ? (
          <div className="py-4 text-center">
            <div className="text-4xl" aria-hidden>
              ✉️
            </div>
            <h2 className="mt-2 text-lg font-bold text-sea-900">{sent.kind === 'signup' ? '확인 메일을 보냈어요' : '재설정 메일을 보냈어요'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-basalt-500">
              <b className="text-basalt-800">{sent.to}</b> 의 받은 편지함에서{' '}
              {sent.kind === 'signup' ? '인증 링크를 누르면 가입이 완료돼요. 인증 후 로그인해 주세요.' : '링크를 누르고 새 비밀번호를 정해 주세요.'}
            </p>
            <p className="mt-2 rounded-xl bg-sand-50 px-3 py-2 text-xs leading-relaxed text-basalt-500">메일이 안 보이면 스팸함도 확인해 주세요. 도착까지 몇 분 걸릴 수 있어요.</p>
            {sent.kind === 'signup' ? (
              <ResendButton email={sent.to} />
            ) : (
              <button type="button" onClick={() => setSent(null)} className="mt-3 text-sm font-semibold text-sea-700 hover:underline">
                다른 이메일로 다시 보내기
              </button>
            )}
            <button type="button" onClick={onClose} className="mt-4 w-full rounded-full bg-sea-600 py-2.5 text-sm font-bold text-white hover:bg-sea-500">
              확인
            </button>
          </div>
        ) : (
          <>
            {mode === 'login' || mode === 'signup' ? (
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
            ) : (
              <div className="mb-4">
                <h2 className="text-lg font-bold text-sea-900">{title}</h2>
                <p className="mt-1 text-sm text-basalt-500">
                  {mode === 'forgot' ? '가입한 이메일을 입력하면 비밀번호를 다시 정할 수 있는 링크를 보내 드려요.' : '앞으로 사용할 새 비밀번호를 입력해 주세요.'}
                </p>
              </div>
            )}

            {!configured && (
              <p role="alert" className="mb-3 rounded-xl bg-canola-300/40 px-3 py-2 text-xs leading-relaxed text-basalt-800">
                로그인 서버(Supabase)가 아직 연결되지 않았어요. <code>.env.local</code> 에 환경변수를 넣고 다시 실행해 주세요. (README 참고)
              </p>
            )}

            <form onSubmit={submit} className="space-y-3" noValidate>
              {mode !== 'recover' && (
                <label className="block text-sm font-medium">
                  이메일
                  <input type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 ${input}`} placeholder="you@example.com" />
                </label>
              )}
              {signup && (
                <label className="block text-sm font-medium">
                  닉네임
                  <input value={nickname} maxLength={12} onChange={(e) => setNickname(e.target.value)} className={`mt-1 ${input}`} placeholder="2~12자" />
                </label>
              )}
              {mode !== 'forgot' && (
                <label className="block text-sm font-medium">
                  {mode === 'recover' ? '새 비밀번호' : '비밀번호'}
                  <input
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    autoFocus={mode === 'recover'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`mt-1 ${input}`}
                    placeholder={mode === 'login' ? '' : '8자 이상, 영문+숫자'}
                  />
                </label>
              )}
              {(signup || mode === 'recover') && (
                <label className="block text-sm font-medium">
                  비밀번호 확인
                  <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`mt-1 ${input}`} />
                </label>
              )}

              {error && (
                <div role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                  {unconfirmed && <ResendButton email={email} label="인증 메일 다시 받기" />}
                </div>
              )}

              <button type="submit" disabled={busy} className="w-full rounded-full bg-sea-600 py-2.5 text-sm font-bold text-white hover:bg-sea-500 disabled:opacity-60">
                {busy ? '처리 중…' : submitLabel}
              </button>
            </form>

            {mode === 'login' && (
              <button type="button" onClick={() => switchMode('forgot')} className="mt-3 w-full text-center text-sm text-sea-700 hover:underline">
                비밀번호를 잊으셨나요?
              </button>
            )}
            {mode === 'forgot' && (
              <button type="button" onClick={() => switchMode('login')} className="mt-3 w-full text-center text-sm text-sea-700 hover:underline">
                ← 로그인으로 돌아가기
              </button>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <p className="mt-4 text-xs leading-relaxed text-basalt-500">
                {signup && '지금 담아 둔 찜·방문 기록은 새 계정으로 옮겨져요. '}
                찜·방문 기록은 이 브라우저에 계정별로 저장돼요.
              </p>
            )}
            <button type="button" onClick={close} className="mt-3 w-full text-center text-sm text-basalt-500 hover:text-sea-700">
              {mode === 'recover' ? '나중에 하기' : '닫기'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
