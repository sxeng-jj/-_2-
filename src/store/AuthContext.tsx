import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { authConfigured, supabase } from '../lib/supabase'
import { localTripStorage, userStorage } from '../lib/storage'

export interface User {
  id: string
  email: string
  nickname: string
}

export class AuthError extends Error {
  /** 'unconfirmed' = 가입은 됐지만 이메일 인증 전 */
  constructor(
    message: string,
    readonly kind?: 'unconfirmed',
  ) {
    super(message)
  }
}

interface AuthApi {
  user: User | null
  /** 저장된 세션을 확인하는 동안 true */
  loading: boolean
  /** Supabase 환경변수가 설정되어 있는지 */
  configured: boolean
  /** 이메일 인증이 필요하면 needsConfirm: true */
  signUp: (email: string, password: string, nickname: string) => Promise<{ needsConfirm: boolean }>
  logIn: (email: string, password: string) => Promise<void>
  logOut: () => Promise<void>
  /** 인증 메일을 다시 보낸다 */
  resendConfirmation: (email: string) => Promise<void>
  /** 비밀번호 재설정 메일을 보낸다 */
  sendPasswordReset: (email: string) => Promise<void>
  /** 재설정 메일의 링크로 들어와 새 비밀번호를 정해야 하는 중 */
  recovering: boolean
  updatePassword: (password: string) => Promise<void>
  /** 재설정 화면을 닫는다 */
  finishRecovery: () => void
}

/** 메일 속 링크가 돌아올 주소. 파일(file:)로 열었을 때는 쓸 수 없어서 Supabase 기본값에 맡긴다. */
const redirectTo = () => (location.protocol.startsWith('http') ? location.origin + location.pathname : undefined)

const Ctx = createContext<AuthApi | null>(null)

const toUser = (u: SupabaseUser): User => ({
  id: u.id,
  email: u.email ?? '',
  nickname: (u.user_metadata?.nickname as string | undefined) || u.email?.split('@')[0] || '여행자',
})

function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않아요.'
  if (m.includes('email not confirmed')) return '이메일 인증이 아직 안 됐어요. 받은 편지함의 확인 메일을 눌러 주세요.'
  if (m.includes('already registered')) return '이미 가입된 이메일이에요.'
  if (m.includes('rate limit') || m.includes('too many')) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
  if (m.includes('different from the old')) return '이전과 다른 비밀번호를 입력해 주세요.'
  if (m.includes('password')) return '비밀번호 조건을 확인해 주세요. (8자 이상)'
  if (m.includes('fetch') || m.includes('network')) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.'
}

const need = () => {
  if (!supabase) throw new AuthError('로그인 기능이 아직 설정되지 않았어요. (Supabase 환경변수 필요)')
  return supabase
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(authConfigured)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setUser(data.session ? toUser(data.session.user) : null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setUser(session ? toUser(session.user) : null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const api = useMemo<AuthApi>(
    () => ({
      user,
      loading,
      configured: authConfigured,
      async signUp(email, password, nickname) {
        const { data, error } = await need().auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nickname: nickname.trim() } },
        })
        if (error) throw new AuthError(friendly(error.message))
        // 이메일 인증이 켜져 있으면 이미 가입된 이메일도 에러 없이 identities 가 비어서 돌아온다
        if (data.user && data.user.identities?.length === 0) throw new AuthError('이미 가입된 이메일이에요.')
        // 게스트로 담아 둔 찜·방문 기록을 새 계정으로 옮겨 준다
        const guest = localTripStorage.load()
        if (data.user && (guest.course.length || Object.keys(guest.visits).length)) userStorage(data.user.id).save(guest)
        return { needsConfirm: !data.session }
      },
      async logIn(email, password) {
        const { error } = await need().auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw new AuthError(friendly(error.message), error.message.toLowerCase().includes('email not confirmed') ? 'unconfirmed' : undefined)
      },
      async logOut() {
        await supabase?.auth.signOut()
      },
      async resendConfirmation(email) {
        const { error } = await need().auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectTo() } })
        if (error) throw new AuthError(friendly(error.message))
      },
      async sendPasswordReset(email) {
        // 가입 여부와 상관없이 같은 결과를 보여 주도록, 호출 오류가 아니면 성공으로 처리한다 (계정 존재 여부 노출 방지)
        const { error } = await need().auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() })
        if (error) throw new AuthError(friendly(error.message))
      },
      recovering,
      async updatePassword(password) {
        const { error } = await need().auth.updateUser({ password })
        if (error) throw new AuthError(friendly(error.message))
        setRecovering(false)
      },
      finishRecovery: () => setRecovering(false),
    }),
    [user, loading, recovering],
  )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.')
  return v
}
