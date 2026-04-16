export default function NewIntakeLoading() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
      <div className="w-64 hidden lg:block" />
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-56 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-gray-100 dark:bg-[#1f2937] rounded animate-pulse mb-8" />
          <div className="h-2 w-full bg-gray-200 rounded-full animate-pulse mb-8" />
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-[#1f2937] p-6">
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-10 w-full bg-gray-100 dark:bg-[#1f2937] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
