import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** 환경변수가 없으면 null — 앱은 로그인 없이(게스트)도 동작한다. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null
export const authConfigured = supabase !== null
