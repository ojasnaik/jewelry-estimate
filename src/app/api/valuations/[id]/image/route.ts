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

  const { data: valuation, error: fetchError } = await supabase
    .from('valuations')
    .select('image_path, user_id')
    .eq('id', id)
    .single()

  if (fetchError || !valuation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (valuation.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!valuation.image_path) {
    return NextResponse.json({ error: 'No image' }, { status: 404 })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('jewelry-images')
    .createSignedUrl(valuation.image_path, 60)

  if (signError || !signed) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  return NextResponse.json({ signedUrl: signed.signedUrl })
}
