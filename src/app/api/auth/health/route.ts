import { NextResponse } from 'next/server';

/**
 * Health check for auth configuration.
 * Returns which env vars are set (without revealing values).
 * Useful for debugging signup failures.
 */
export async function GET() {
  const config = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    GITHUB_ID: !!process.env.GITHUB_ID,
    GITHUB_SECRET: !!process.env.GITHUB_SECRET,
    AGENT1_API_KEY: !!process.env.AGENT1_API_KEY,
    AGENT2_API_KEY: !!process.env.AGENT2_API_KEY,
    AGENT3_API_KEY: !!process.env.AGENT3_API_KEY,
  };

  const allRequired = config.SUPABASE_URL && config.SUPABASE_SERVICE_KEY &&
                      config.SUPABASE_ANON_KEY &&
                      config.DATABASE_URL && config.NEXTAUTH_SECRET;

  // Test Supabase connection
  let supabaseStatus = 'unknown';
  if (config.SUPABASE_URL && config.SUPABASE_SERVICE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      // Quick health check — try to get the Supabase project settings
      const { error } = await supabase.auth.getSession();
      supabaseStatus = error ? `error: ${error.message}` : 'connected';
    } catch (e) {
      supabaseStatus = `connection_failed: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  } else {
    supabaseStatus = 'missing_env_vars';
  }

  return NextResponse.json({
    status: allRequired ? 'ok' : 'misconfigured',
    config,
    supabase: supabaseStatus,
    timestamp: new Date().toISOString(),
  });
}
