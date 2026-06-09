'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
}

export default function ValuationPending({ id }: Props) {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/valuations/${id}/status`)
        if (!res.ok) return

        const { status } = await res.json()

        if (status === 'complete') {
          clearInterval(interval)
          router.refresh()
        } else if (status === 'error') {
          clearInterval(interval)
          setFailed(true)
        }
      } catch {
        // transient network error — keep polling
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [id, router])

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
          <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-white font-medium">Estimation failed</p>
        <p className="text-sm text-gray-400">Something went wrong during processing.</p>
        <a
          href="/dashboard/new"
          className="mt-2 inline-block rounded-lg bg-[#C9A84C] px-6 py-2.5 text-sm font-semibold text-black hover:bg-[#b8963e] transition"
        >
          Try Again
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <svg
        className="h-12 w-12 animate-spin text-[#C9A84C]"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <div>
        <p className="text-lg font-medium text-white">Estimating your jewelry value…</p>
        <p className="mt-1 text-sm text-gray-400">This typically takes 5–10 seconds</p>
      </div>
    </div>
  )
}
