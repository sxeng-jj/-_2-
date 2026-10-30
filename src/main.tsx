import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App'
import { localTripStorage, userStorage } from './lib/storage'
import { AuthProvider, useAuth } from './store/AuthContext'
import { TripProvider } from './store/TripContext'

/** 로그인한 계정마다 별도 저장소를 쓰고, 계정이 바뀌면 상태를 새로 불러온다 */
function TripGate() {
  const { user, loading } = useAuth()
  const id = user?.id
  const storage = useMemo(() => (id ? userStorage(id) : localTripStorage), [id])
  if (loading) return <div className="flex h-full items-center justify-center text-sea-600">제주잇길 불러오는 중…</div>
  return (
    <TripProvider key={id ?? 'guest'} storage={storage}>
      <App />
    </TripProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TripGate />
    </AuthProvider>
  </StrictMode>,
)
