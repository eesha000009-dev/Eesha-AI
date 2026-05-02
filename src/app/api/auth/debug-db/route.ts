import { NextResponse } from 'next/server';
import { dbRest } from '@/lib/db-rest';

// ─── GET /api/auth/debug-db ──────────────────────────────────────────────────
// Debug endpoint to check if the database connection and `users` table are working.
// ⚠️ DISABLED IN PRODUCTION — only available in development mode.
// This endpoint exposes sensitive configuration details and must never be public.

export async function GET() {
  // SECURITY: Block this endpoint entirely in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const results: Record<string, unknown> = {};

  // 1. Check env vars (only boolean presence, never values)
  results.supabaseUrlSet = !!process.env.SUPABASE_URL;
  results.supabaseAnonKeySet = !!process.env.SUPABASE_ANON_KEY;
  results.supabaseServiceKeySet = !!process.env.SUPABASE_SERVICE_KEY;
  results.nextauthSecretSet = !!process.env.NEXTAUTH_SECRET;

  // 2. Test REST API connection
  try {
    const healthy = await dbRest.isHealthy();
    results.dbRestHealthy = healthy;
    if (healthy) {
      results.userCount = await dbRest.countUsers();
    }
  } catch (err) {
    results.dbRestError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
