import { NextResponse, type NextRequest } from 'next/server'
import { processValuation } from '@/lib/valuations/processValuation'

// Optional manual / retry entry point. The primary flow no longer calls this —
// POST /api/valuations runs processValuation() in-process via after(). Kept as
// a secret-guarded way to re-trigger processing for a stuck row.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-process-secret')
  if (!secret || secret !== process.env.PROCESS_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { valuationId } = await request.json().catch(() => ({ valuationId: undefined }))
  if (!valuationId) {
    return NextResponse.json({ error: 'Missing valuationId' }, { status: 400 })
  }

  await processValuation(valuationId)
  return NextResponse.json({ success: true }, { status: 200 })
}
