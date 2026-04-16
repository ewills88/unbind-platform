export default function CasesLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1526]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading cases...</p>
      </div>
    </div>
  )
}
