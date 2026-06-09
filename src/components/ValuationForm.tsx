'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const METAL_KARATS: Record<string, string[]> = {
  Gold: ['24K', '22K', '18K', '14K', '10K'],
  Silver: ['Sterling 925', 'Fine 999'],
  Platinum: ['950', '900', '750'],
  'White Gold': ['950', '900', '750'],
  'Rose Gold': ['950', '900', '750'],
}

const METAL_TYPES = Object.keys(METAL_KARATS)
const GEMSTONE_TYPES = ['None', 'Diamond', 'Ruby', 'Emerald', 'Sapphire', 'Pearl', 'Other']
const CONDITIONS = [
  { label: 'Excellent', value: 'excellent' },
  { label: 'Good',      value: 'good' },
  { label: 'Fair',      value: 'fair' },
  { label: 'Poor',      value: 'poor' },
] as const

type ConditionValue = typeof CONDITIONS[number]['value']

type FieldErrors = Partial<Record<
  'metal_type' | 'karat' | 'weight_grams' | 'condition' | 'image',
  string
>>

interface Props {
  userId: string
}

export default function ValuationForm({ userId }: Props) {
  const router = useRouter()

  const [metalType, setMetalType] = useState('')
  const [karat, setKarat] = useState('')
  const [weightGrams, setWeightGrams] = useState('')
  const [gemstoneType, setGemstoneType] = useState('None')
  const [gemstoneCarat, setGemstoneCarat] = useState('')
  const [condition, setCondition] = useState<ConditionValue | ''>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleMetalChange(value: string) {
    setMetalType(value)
    setKarat('')
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setFieldErrors((prev) => ({ ...prev, image: undefined }))

    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, image: 'Image must be under 5 MB.' }))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function validate(): boolean {
    const errors: FieldErrors = {}
    if (!metalType) errors.metal_type = 'Metal type is required.'
    if (!karat) errors.karat = 'Karat is required.'
    if (!weightGrams || Number(weightGrams) <= 0) errors.weight_grams = 'Weight is required.'
    if (!condition) errors.condition = 'Condition is required.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) return

    setLoading(true)

    try {
      let imagePath: string | null = null

      if (imageFile) {
        const supabase = createClient()
        const filename = `${crypto.randomUUID()}-${imageFile.name}`
        const path = `${userId}/${filename}`

        const { error: uploadError } = await supabase.storage
          .from('jewelry-images')
          .upload(path, imageFile, { contentType: imageFile.type, upsert: false })

        if (uploadError) throw new Error('Image upload failed.')
        imagePath = path
      }

      const res = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metal_type: metalType,
          karat,
          weight_grams: Number(weightGrams),
          gemstone_type: gemstoneType === 'None' ? null : gemstoneType,
          gemstone_carat: gemstoneType !== 'None' && gemstoneCarat ? Number(gemstoneCarat) : null,
          condition,
          image_path: imagePath,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Submission failed. Please try again.')
      }

      const { id } = await res.json()
      router.push(`/dashboard/valuations/${id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  const karatOptions = metalType ? METAL_KARATS[metalType] : []

  const inputClass =
    'w-full bg-[#0F3460] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/60 transition disabled:opacity-50'
  const labelClass = 'block text-sm text-gray-300 mb-1.5'
  const errorClass = 'mt-1 text-xs text-red-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Metal & Karat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="metal_type" className={labelClass}>Metal type</label>
          <select
            id="metal_type"
            value={metalType}
            onChange={(e) => handleMetalChange(e.target.value)}
            disabled={loading}
            className={inputClass}
          >
            <option value="" disabled>Select metal</option>
            {METAL_TYPES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {fieldErrors.metal_type && <p className={errorClass}>{fieldErrors.metal_type}</p>}
        </div>

        <div>
          <label htmlFor="karat" className={labelClass}>Karat / purity</label>
          <select
            id="karat"
            value={karat}
            onChange={(e) => setKarat(e.target.value)}
            disabled={!metalType || loading}
            className={inputClass}
          >
            <option value="" disabled>
              {metalType ? 'Select karat' : 'Select metal first'}
            </option>
            {karatOptions.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {fieldErrors.karat && <p className={errorClass}>{fieldErrors.karat}</p>}
        </div>

        {/* Weight */}
        <div>
          <label htmlFor="weight_grams" className={labelClass}>Weight (grams)</label>
          <input
            id="weight_grams"
            type="number"
            min={0.1}
            max={9999}
            step={0.01}
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value)}
            disabled={loading}
            placeholder="e.g. 4.50"
            className={inputClass}
          />
          {fieldErrors.weight_grams && <p className={errorClass}>{fieldErrors.weight_grams}</p>}
        </div>

        {/* Gemstone type */}
        <div>
          <label htmlFor="gemstone_type" className={labelClass}>Gemstone</label>
          <select
            id="gemstone_type"
            value={gemstoneType}
            onChange={(e) => { setGemstoneType(e.target.value); setGemstoneCarat('') }}
            disabled={loading}
            className={inputClass}
          >
            {GEMSTONE_TYPES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Gemstone carat — only when a gemstone is selected */}
        {gemstoneType !== 'None' && (
          <div>
            <label htmlFor="gemstone_carat" className={labelClass}>Gemstone carat</label>
            <input
              id="gemstone_carat"
              type="number"
              min={0.01}
              max={999}
              step={0.01}
              value={gemstoneCarat}
              onChange={(e) => setGemstoneCarat(e.target.value)}
              disabled={loading}
              placeholder="e.g. 0.50"
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Condition */}
      <div>
        <p className={labelClass}>Condition</p>
        <div className="flex flex-wrap gap-3">
          {CONDITIONS.map(({ label, value }) => (
            <label
              key={value}
              className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition text-sm font-medium select-none ${
                condition === value
                  ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                  : 'border-white/10 text-gray-400 hover:border-white/30'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="condition"
                value={value}
                checked={condition === value}
                onChange={() => setCondition(value)}
                disabled={loading}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {fieldErrors.condition && <p className={errorClass}>{fieldErrors.condition}</p>}
      </div>

      {/* Image upload */}
      <div>
        <label className={labelClass}>Photo <span className="text-gray-500">(optional, max 5 MB)</span></label>
        <div className="flex items-center gap-4">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              width={64}
              height={64}
              className="h-16 w-16 rounded-lg object-cover border border-white/10 flex-shrink-0"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={loading}
            className="block text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#C9A84C]/20 file:text-[#C9A84C] hover:file:bg-[#C9A84C]/30 file:cursor-pointer disabled:opacity-50 transition"
          />
        </div>
        {fieldErrors.image && <p className={errorClass}>{fieldErrors.image}</p>}
      </div>

      {/* Submit error */}
      {submitError && (
        <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-2.5">
          {submitError}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#C9A84C] hover:bg-[#b8963e] disabled:opacity-60 disabled:cursor-not-allowed text-black font-semibold rounded-lg px-8 py-2.5 transition"
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {loading ? 'Submitting…' : 'Get valuation'}
      </button>
    </form>
  )
}
