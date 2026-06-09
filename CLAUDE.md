# jewelry-estimate -- Project Context

## Stack
- Next.js 14+ App Router (TypeScript, strict mode)
- Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- Tailwind CSS for styling
- Groq API (llama-3.3-70b-versatile) for LLM-based jewelry valuation
- Sentry for error tracking and performance monitoring
- Vercel for hosting

## Directory Architecture
- src/app              -- App Router pages, layouts, and API routes
- src/components       -- Shared React components
- src/lib/supabase     -- Supabase client factories (browser vs server)
- src/lib/groq         -- Groq LLM valuation logic
- src/types            -- Shared TypeScript types and Database type

## SECURITY RULES - NEVER VIOLATE
- SUPABASE_SERVICE_ROLE_KEY is used ONLY in server-side files (API routes,
  Server Components). Never in Client Components.
- GROQ_API_KEY is used ONLY in API routes. Never client-side.
- Client Components ONLY read env vars prefixed with NEXT_PUBLIC_
- RLS (Row Level Security) is enabled on ALL Supabase tables
- Every API route validates the user session BEFORE any database operation
- Use getUser() for session verification, NOT getSession().
  getUser() verifies the JWT with Supabase server. getSession() trusts the
  local cookie and can be spoofed.

## Database Tables
- valuations: id, user_id, status, metal_type, karat, weight_grams,
  gemstone_type, gemstone_carat, condition, image_path,
  estimated_low, estimated_high, llm_reasoning, created_at, updated_at

## Supabase Client Pattern
- src/lib/supabase/client.ts  -- Browser client (anon key, used in
  Client Components)
- src/lib/supabase/server.ts  -- Server client (reads cookies, used in
  Server Components, API routes, middleware)

## Naming Conventions
- React components: PascalCase
- Utility functions: camelCase
- Database columns: snake_case
- Environment variables: SCREAMING_SNAKE_CASE
- API routes: kebab-case paths

## Error Handling
- All API routes wrap logic in try/catch and call Sentry.captureException
  on errors
- Client-side errors use Sentry.captureException in catch blocks
- Never expose raw Supabase or system error messages to the user
- Return user-friendly messages. Log details to Sentry.

## Styling
- Use Tailwind utility classes only. No CSS modules.
- Brand accent color: #C9A84C (gold)
- Background: dark neutral #1A1A2E for authenticated sections
- Keep the design minimal and premium-feeling