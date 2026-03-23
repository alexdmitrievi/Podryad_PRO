interface SkeletonProps {
  className?: string;
}

export function SkeletonLine({ className = '' }: SkeletonProps) {
  return <div className={`skeleton h-4 rounded-md ${className}`} />;
}

export function SkeletonBlock({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return <div className={`skeleton rounded-full ${className}`} />;
}

export function SkeletonOrderCard() {
  return (
    <div className="bg-white dark:bg-dark-card rounded-card border border-gray-100 dark:border-dark-border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonLine className="w-28 h-5" />
          <SkeletonLine className="w-40 h-3" />
        </div>
        <SkeletonBlock className="w-20 h-6 rounded-full" />
      </div>
      <div className="space-y-2">
        <SkeletonLine className="w-full h-3" />
        <SkeletonLine className="w-3/4 h-3" />
      </div>
      <div className="flex gap-2 pt-1">
        <SkeletonBlock className="flex-1 h-10 rounded-button" />
        <SkeletonBlock className="w-24 h-10 rounded-button" />
      </div>
    </div>
  );
}

export function SkeletonWorkerCard() {
  return (
    <div className="bg-white dark:bg-dark-card rounded-card border border-gray-100 dark:border-dark-border p-5 flex items-center gap-4">
      <SkeletonCircle className="w-12 h-12 shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="w-32 h-5" />
        <SkeletonLine className="w-24 h-3" />
      </div>
      <SkeletonBlock className="w-16 h-6 rounded-full" />
    </div>
  );
}

export function SkeletonStatsGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-[80px] rounded-card" />
      ))}
    </div>
  );
}
