import { NextResponse } from 'next/server';
import { dbRest } from '@/lib/db-rest';

/**
 * Health check for auth configuration.
 * Returns which env vars are set (without revealing values).
 * Uses Supabase REST API for DB check (bypasses IPv4 issues).
 */
export async function GET() {
  const config = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    GITHUB_ID: !!process.env.GITHUB_ID,
    GITHUB_SECRET: !!process.env.GITHUB_SECRET,
  };

  const allRequired = config.SUPABASE_URL && config.SUPABASE_SERVICE_KEY && config.NEXTAUTH_SECRET;

  // Test database connection via Supabase REST API
  let dbStatus = 'unknown';
  try {
    const healthy = await dbRest.isHealthy();
    dbStatus = healthy ? 'connected_via_rest_api' : 'unhealthy';
  } catch (e) {
    dbStatus = `connection_failed: ${e instanceof Error ? e.message : 'unknown'}`;
  }

  return NextResponse.json({
    status: allRequired ? 'ok' : 'misconfigured',
    config,
    database: dbStatus,
    authType: 'custom-bcrypt-via-rest-api',
    timestamp: new Date().toISOString(),
  });
}
