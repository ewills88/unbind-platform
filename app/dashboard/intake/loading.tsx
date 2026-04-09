export default function IntakeLoading() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="w-64 hidden lg:block" />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-white rounded-lg border border-gray-200 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
