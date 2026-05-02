import { NextResponse } from 'next/server';
import { dbRest } from '@/lib/db-rest';

/**
 * Health check for auth configuration.
 * Returns minimal status — no config details exposed.
 * Detailed diagnostics only in development mode.
 */
export async function GET() {
  // Test database connection via Supabase REST API
  let dbHealthy = false;
  try {
    dbHealthy = await dbRest.isHealthy();
  } catch {
    dbHealthy = false;
  }

  // In production: return only a simple status
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      status: dbHealthy ? 'ok' : 'degraded',
      database: dbHealthy ? 'connected' : 'unhealthy',
      authType: 'custom-bcrypt',
      timestamp: new Date().toISOString(),
    });
  }

  // In development: return detailed config (never expose in prod)
  const config = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
  };

  return NextResponse.json({
    status: dbHealthy ? 'ok' : 'misconfigured',
    config,
    database: dbHealthy ? 'connected_via_rest_api' : 'unhealthy',
    authType: 'custom-bcrypt-via-rest-api',
    timestamp: new Date().toISOString(),
  });
}
