import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/requireAuth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { user, supabase } = auth

  const { id } = await params

  const { data, error } = await supabase
    .from('valuations')
    .select('status, estimated_low, estimated_high, user_id')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (data.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    status: data.status,
    estimated_low: data.estimated_low,
    estimated_high: data.estimated_high,
  })
}
