'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ValuationType } from '@/types/valuation'

interface Props {
  valuation: ValuationType
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function ValuationResult({ valuation }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [reasoningOpen, setReasoningOpen] = useState(false)

  useEffect(() => {
    if (!valuation.image_path) return
    fetch(`/api/valuations/${valuation.id}/image`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data?.signedUrl && setSignedUrl(data.signedUrl))
      .catch(() => {})
  }, [valuation.id, valuation.image_path])

  const low = valuation.estimated_low ?? 0
  const high = valuation.estimated_high ?? 0
  const mid = Math.round((low + high) / 2)

  return (
    <div className="space-y-6">
      {/* Price card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/30 p-8 text-center">
        <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">Estimated Value</p>
        <p className="text-4xl font-bold text-[#C9A84C]">{formatUSD(mid)}</p>
        <p className="mt-2 text-gray-300 text-sm">
          Range: {formatUSD(low)} – {formatUSD(high)}
        </p>
      </div>

      {/* Image */}
      {signedUrl && (
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <img
            src={signedUrl}
            alt="Submitted jewelry"
            className="w-full max-h-72 object-cover"
          />
        </div>
      )}

      {/* Jewelry summary */}
      <div className="rounded-2xl bg-[#16213E] border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-4">Item Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <SummaryRow label="Metal" value={valuation.metal_type} />
          <SummaryRow label="Karat" value={valuation.karat} />
          <SummaryRow label="Weight" value={valuation.weight_grams != null ? `${valuation.weight_grams}g` : null} />
          <SummaryRow label="Condition" value={valuation.condition} />
          {valuation.gemstone_type && valuation.gemstone_type !== 'None' && (
            <>
              <SummaryRow label="Gemstone" value={valuation.gemstone_type} />
              {valuation.gemstone_carat != null && (
                <SummaryRow label="Gem carat" value={`${valuation.gemstone_carat}ct`} />
              )}
            </>
          )}
        </dl>
      </div>

      {/* Reasoning collapsible */}
      {valuation.llm_reasoning && (
        <div className="rounded-2xl bg-[#16213E] border border-white/10 overflow-hidden">
          <button
            onClick={() => setReasoningOpen((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold text-gray-300 hover:text-white transition"
          >
            Appraiser reasoning
            <svg
              className={`h-4 w-4 transition-transform ${reasoningOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {reasoningOpen && (
            <p className="px-6 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/10 pt-4">
              {valuation.llm_reasoning}
            </p>
          )}
        </div>
      )}

      <Link
        href="/dashboard/new"
        className="inline-block rounded-lg border border-[#C9A84C] px-6 py-2.5 text-sm font-semibold text-[#C9A84C] hover:bg-[#C9A84C]/10 transition"
      >
        Get New Estimate
      </Link>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-white">{value}</dd>
    </>
  )
}
