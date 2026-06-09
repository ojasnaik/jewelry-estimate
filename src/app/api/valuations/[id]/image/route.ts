import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
