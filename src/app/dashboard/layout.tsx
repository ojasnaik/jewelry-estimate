import { redirect } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  Sentry.setUser({ id: user.id, email: user.email ?? undefined })

  return (
    <div className="min-h-screen bg-[#1A1A2E]">
      <nav className="border-b border-white/10 bg-[#16213E]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold tracking-tight text-[#C9A84C]">
            jewelry-estimate
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <div>{children}</div>
    </div>
  )
}
