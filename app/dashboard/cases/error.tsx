'use client'

import { useRouter } from 'next/navigation'

export default function CasesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1526]">
      <div className="text-center p-8 max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Cases</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{error.message || 'Something went wrong loading your cases.'}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
