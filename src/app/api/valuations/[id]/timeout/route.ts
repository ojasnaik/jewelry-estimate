import { NextResponse, type NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { requireAuth } from '@/lib/auth/requireAuth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { user, supabase } = auth

  const { id } = await params

  const { data: valuation, error: fetchError } = await supabase
    .from('valuations')
    .select('user_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !valuation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (valuation.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only mark as error if still stuck in pending/processing — do not
  // overwrite a row that completed between the timeout firing and this call.
  if (valuation.status === 'pending' || valuation.status === 'processing') {
    await supabase
      .from('valuations')
      .update({ status: 'error' })
      .eq('id', id)

    Sentry.captureMessage('Valuation timed out on client', {
      level: 'warning',
      extra: { valuationId: id, stuckStatus: valuation.status },
    })
  }

  return NextResponse.json({ ok: true })
}
