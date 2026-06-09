import { NextResponse, type NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { metal_type, karat, weight_grams, condition, gemstone_type, gemstone_carat, image_path } = body

    if (!metal_type || !karat || !weight_grams || !condition) {
      return NextResponse.json({ error: 'Missing required fields: metal_type, karat, weight_grams, condition' }, { status: 400 })
    }

    if (image_path !== undefined && image_path !== null && typeof image_path !== 'string') {
      return NextResponse.json({ error: 'Invalid image_path' }, { status: 400 })
    }

    const { data: valuation, error: insertError } = await supabase
      .from('valuations')
      .insert({
        user_id: user.id,
        status: 'pending',
        metal_type,
        karat,
        weight_grams,
        condition,
        gemstone_type: gemstone_type ?? null,
        gemstone_carat: gemstone_carat ?? null,
        image_path: image_path ?? null,
      })
      .select('id')
      .single()

    if (insertError || !valuation) {
      throw insertError ?? new Error('Insert returned no data')
    }

    const processUrl = new URL('/api/valuations/process', request.url).toString()
    fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-process-secret': process.env.PROCESS_SECRET ?? '',
      },
      body: JSON.stringify({ valuationId: valuation.id }),
    })

    return NextResponse.json({ id: valuation.id, status: 'pending' }, { status: 201 })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to create valuation' }, { status: 500 })
  }
}
