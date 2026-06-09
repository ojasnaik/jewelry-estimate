import { NextResponse, type NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { requireAuth } from '@/lib/auth/requireAuth'

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  return 'http://localhost:3000'
}

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

    // Await the dispatch so Vercel does not kill the in-flight request when
    // this function returns. We only wait for the connection to be accepted
    // (headers received), not for processing to complete.
    try {
      const dispatchRes = await fetch(`${getBaseUrl()}/api/valuations/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-process-secret': process.env.PROCESS_SECRET!,
        },
        body: JSON.stringify({ valuationId: valuation.id }),
      })

      if (!dispatchRes.ok) {
        const errBody = await dispatchRes.text().catch(() => '(unreadable)')
        Sentry.captureMessage('Dispatch to /api/valuations/process failed', {
          level: 'error',
          extra: { valuationId: valuation.id, status: dispatchRes.status, body: errBody },
        })
        console.error(`[valuations] dispatch failed status=${dispatchRes.status} body=${errBody}`)
      } else {
        console.log(`[valuations] dispatch accepted valuationId=${valuation.id}`)
      }
    } catch (dispatchErr) {
      Sentry.captureException(dispatchErr, { extra: { valuationId: valuation.id } })
      console.error('[valuations] dispatch threw', dispatchErr)
    }

    return NextResponse.json({ id: valuation.id, status: 'pending' }, { status: 201 })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to create valuation' }, { status: 500 })
  }
}
