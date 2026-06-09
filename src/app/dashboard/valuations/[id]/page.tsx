import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ValuationPending from '@/components/ValuationPending'
import ValuationResult from '@/components/ValuationResult'

export const dynamic = 'force-dynamic'

// A row still pending/processing after this long is treated as failed, even if
// the client that created it never stayed open long enough to time it out.
const STALE_MS = 2 * 60 * 1000

interface Props {
  params: Promise<{ id: string }>
}

export default async function ValuationDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: valuation } = await supabase
    .from('valuations')
    .select('*')
    .eq('id', id)
    .single()

  if (!valuation || valuation.user_id !== user.id) {
    redirect('/dashboard')
  }

  // If a row has been stuck in pending/processing past the stale threshold,
  // mark it as error now. This catches valuations whose client navigated away
  // before the in-page timeout could fire. RLS-safe: it's the user's own row.
  let status = valuation.status
  if (
    (status === 'pending' || status === 'processing') &&
    Date.now() - new Date(valuation.created_at).getTime() > STALE_MS
  ) {
    await supabase.from('valuations').update({ status: 'error' }).eq('id', id)
    status = 'error'
  }

  return (
    <main className="min-h-screen bg-[#1A1A2E] px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
            ← Dashboard
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-sm text-gray-300">Valuation</span>
        </div>

        {(status === 'pending' || status === 'processing') && (
          <ValuationPending id={id} />
        )}

        {status === 'complete' && (
          <ValuationResult valuation={valuation} />
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center rounded-2xl bg-[#16213E] border border-white/10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Estimation failed</p>
              <p className="mt-1 text-sm text-gray-400">We couldn&apos;t process this item. Please try again.</p>
            </div>
            <Link
              href="/dashboard/new"
              className="mt-2 inline-block rounded-lg bg-[#C9A84C] px-6 py-2.5 text-sm font-semibold text-black hover:bg-[#b8963e] transition"
            >
              Try Again
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
