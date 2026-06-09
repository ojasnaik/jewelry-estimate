'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 hover:border-white/30 hover:text-white transition"
    >
      Sign out
    </button>
  )
}
