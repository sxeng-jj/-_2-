/** 데이터를 불러오는 동안 보여 주는 화면 뼈대 */
export function AppSkeleton() {
  return (
    <div className="flex h-full flex-col" role="status" aria-live="polite" aria-label="제주 역사문화 데이터를 불러오는 중">
      <div className="flex items-center justify-between border-b border-sand-200 bg-white px-4 py-3">
        <div className="h-8 w-32 animate-pulse rounded-full bg-sand-100" />
        <div className="h-8 w-56 animate-pulse rounded-full bg-sand-100" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="order-2 flex-1 space-y-3 bg-sand-50 p-4 lg:order-1 lg:w-[430px] lg:flex-none">
          <div className="h-10 animate-pulse rounded-full bg-sand-100" />
          <p className="py-1 text-center text-sm text-sea-600">제주 역사문화 데이터를 불러오는 중…</p>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2 rounded-2xl bg-white p-4">
              <div className="h-4 w-2/5 animate-pulse rounded bg-sand-100" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-sand-100" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-sand-100" />
            </div>
          ))}
        </div>
        <div className="order-1 h-[30vh] animate-pulse bg-sea-100 lg:order-2 lg:h-auto lg:flex-1" />
      </div>
    </div>
  )
}

/** 목록 항목 크기의 로딩 틀 (사진 대체 등 작은 영역용) */
export function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-sand-100 ${className}`} />
}
