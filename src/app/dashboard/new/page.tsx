import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ValuationForm from '@/components/ValuationForm'

export default async function NewValuationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Estimate Your Jewelry</h1>
        <p className="mt-1 text-sm text-gray-400">
          Enter your item details and we'll estimate its resale market value.
        </p>
      </div>
      <ValuationForm userId={user.id} />
    </main>
  )
}
