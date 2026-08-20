export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className="h-14 bg-white dark:bg-neutral-900 border-b border-black/10 dark:border-white/8" />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="h-7 w-48 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-80 bg-gray-100 dark:bg-neutral-800 rounded animate-pulse mb-6" />
        <div className="card p-5 mb-6">
          <div className="h-10 bg-gray-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 mb-3 animate-pulse">
            <div className="h-4 bg-gray-100 dark:bg-neutral-800 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 dark:bg-neutral-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
