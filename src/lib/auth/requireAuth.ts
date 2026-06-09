import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type AuthSuccess = {
  user: User
  supabase: SupabaseClient<Database>
  response: null
}

type AuthFailure = {
  user: null
  supabase: null
  response: NextResponse
}

export async function requireAuth(_request: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      supabase: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { user, supabase, response: null }
}
