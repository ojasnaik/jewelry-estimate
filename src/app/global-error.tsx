'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-[#1A1A2E] px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-400 mb-8">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-[#C9A84C] px-6 py-2.5 text-sm font-semibold text-black hover:bg-[#b8963e] transition"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
