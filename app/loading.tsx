// app/loading.tsx — Global loading skeleton (App Router)

export default function Loading() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header skeleton */}
      <div className="animate-pulse mb-6">
        <div className="h-8 bg-muted rounded-xl w-48 mb-2" />
        <div className="h-4 bg-muted rounded w-64" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-muted mb-4" />
            <div className="h-8 bg-muted rounded w-16 mb-2" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
            <div className="h-5 bg-muted rounded w-24 mb-5" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
            <div className="h-5 bg-muted rounded w-36 mb-5" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
            <div className="h-5 bg-muted rounded w-28 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 py-2.5 border-b border-border/50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-muted mt-1.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-2 bg-muted rounded w-16" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
            <div className="h-5 bg-muted rounded w-28 mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-24" />
                  <div className="h-2 bg-muted rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
