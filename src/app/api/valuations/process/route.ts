import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import type { Database } from '@/types/supabase'

function getServiceClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function buildPrompt(row: {
  metal_type: string | null
  karat: string | null
  weight_grams: number | null
  gemstone_type: string | null
  gemstone_carat: number | null
  condition: string | null
}): string {
  return (
    'You are a certified jewelry appraiser. Estimate the resale market value in USD. ' +
    'Respond ONLY with valid JSON (no markdown, no preamble) with keys: ' +
    'estimated_low (number), estimated_high (number), reasoning (string max 150 words). ' +
    `Item: ${row.metal_type} ${row.karat}, weight ${row.weight_grams}g, ` +
    `gemstone: ${row.gemstone_type ?? 'None'} ${row.gemstone_carat ?? 0}ct, ` +
    `condition: ${row.condition}.`
  )
}

function stripJsonFences(raw: string): string {
  return raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-process-secret')
  if (!secret || secret !== process.env.PROCESS_SECRET) {
    Sentry.captureMessage('Process route called with invalid or missing secret', {
      level: 'warning',
      extra: { secretPresent: !!secret },
    })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getServiceClient()
  let valuationId: string | undefined

  try {
    ;({ valuationId } = await request.json())
    if (!valuationId) throw new Error('Missing valuationId')

    console.log(`[process] starting valuationId=${valuationId}`)

    const { data: valuation, error: fetchError } = await supabase
      .from('valuations')
      .select('metal_type, karat, weight_grams, gemstone_type, gemstone_carat, condition')
      .eq('id', valuationId)
      .single()

    if (fetchError || !valuation) {
      throw fetchError ?? new Error('Valuation not found')
    }

    await supabase
      .from('valuations')
      .update({ status: 'processing' })
      .eq('id', valuationId)

    console.log(`[process] calling Groq valuationId=${valuationId}`)

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        temperature: 0.1,
        messages: [{ role: 'user', content: buildPrompt(valuation) }],
      }),
    })

    if (!groqRes.ok) {
      const groqError = await groqRes.text()
      Sentry.captureMessage('Groq API error', {
        level: 'error',
        extra: { valuationId, status: groqRes.status, body: groqError },
      })
      throw new Error(`Groq API error: ${groqRes.status} — ${groqError}`)
    }

    const groqData = await groqRes.json()
    const rawContent: string = groqData.choices?.[0]?.message?.content ?? ''

    console.log(`[process] Groq responded valuationId=${valuationId}`)

    const parsed = JSON.parse(stripJsonFences(rawContent))
    const { estimated_low, estimated_high, reasoning } = parsed

    await supabase
      .from('valuations')
      .update({
        estimated_low: Number(estimated_low),
        estimated_high: Number(estimated_high),
        llm_reasoning: String(reasoning),
        status: 'complete',
      })
      .eq('id', valuationId)

    console.log(`[process] complete valuationId=${valuationId}`)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    Sentry.captureException(err, { extra: { valuationId } })
    console.error(`[process] failed valuationId=${valuationId}`, err)

    if (valuationId) {
      await supabase
        .from('valuations')
        .update({ status: 'error' })
        .eq('id', valuationId)
    }

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
