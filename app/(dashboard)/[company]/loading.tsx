// app/(dashboard)/[company]/loading.tsx
// Next.js streaming — shows while page data is loading

export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-pulse">
      {/* Announcement skeleton */}
      <div className="h-16 bg-muted rounded-2xl mb-6" />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 h-28">
            <div className="w-10 h-10 rounded-xl bg-muted mb-4" />
            <div className="h-8 bg-muted rounded w-16 mb-2" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 h-64">
            <div className="h-4 bg-muted rounded w-24 mb-4" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 h-48">
            <div className="h-4 bg-muted rounded w-40 mb-4" />
            <div className="h-36 bg-muted rounded-xl" />
          </div>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-40">
              <div className="h-4 bg-muted rounded w-32 mb-3" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2 border-b border-border/50">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <div className="h-3 bg-muted rounded flex-1" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
