import { after, NextResponse, type NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { requireAuth } from '@/lib/auth/requireAuth'
import { processValuation } from '@/lib/valuations/processValuation'

// Processing runs in after() within this invocation, so the function must be
// allowed to live past the response long enough for the Groq call to finish.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response) return auth.response
    const { user, supabase } = auth

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

    // Process in the background after the response is sent. No self-fetch —
    // this runs in-process, avoiding base-URL resolution and Vercel
    // Deployment Protection (which 401s server-to-server requests).
    after(() => processValuation(valuation.id))

    return NextResponse.json({ id: valuation.id, status: 'pending' }, { status: 201 })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to create valuation' }, { status: 500 })
  }
}
