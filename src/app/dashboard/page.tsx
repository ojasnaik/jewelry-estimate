import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

const STATUS_STYLES: Record<string, string> = {
  complete: 'bg-[#C9A84C]/20 text-[#C9A84C]',
  pending: 'bg-gray-500/20 text-gray-400',
  processing: 'bg-gray-500/20 text-gray-400',
  error: 'bg-red-500/20 text-red-400',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: valuations } = await supabase
    .from('valuations')
    .select('id, status, metal_type, karat, estimated_low, estimated_high, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      {/* CTA */}
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Recent Valuations</h1>
        <Link
          href="/dashboard/new"
          className="rounded-lg bg-[#C9A84C] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#b8963e] transition"
        >
          + Estimate a New Item
        </Link>
      </div>

      {/* Empty state */}
      {(!valuations || valuations.length === 0) ? (
        <div className="rounded-2xl border border-white/10 bg-[#16213E] p-16 text-center">
          <p className="mb-1 text-white font-medium">No estimates yet</p>
          <p className="text-sm text-gray-400 mb-6">
            Submit your first piece of jewelry to get a resale value estimate.
          </p>
          <Link
            href="/dashboard/new"
            className="inline-block rounded-lg bg-[#C9A84C] px-6 py-2.5 text-sm font-semibold text-black hover:bg-[#b8963e] transition"
          >
            Estimate a New Item
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-[#16213E] text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Estimate</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#16213E]/60">
              {valuations.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.02] transition">
                  <td className="whitespace-nowrap px-6 py-4 text-gray-400">
                    {formatDate(v.created_at)}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {[v.metal_type, v.karat].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[v.status] ?? STATUS_STYLES.pending}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {v.status === 'complete' && v.estimated_low != null && v.estimated_high != null
                      ? `$${v.estimated_low.toLocaleString()} – $${v.estimated_high.toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/valuations/${v.id}`}
                      className="text-[#C9A84C] hover:underline font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
