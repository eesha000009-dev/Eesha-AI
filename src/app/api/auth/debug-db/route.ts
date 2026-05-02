import { NextResponse } from 'next/server';
import { dbRest } from '@/lib/db-rest';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ─── GET /api/auth/debug-db ──────────────────────────────────────────────────
// Debug endpoint to check if the database connection and `users` table are working.
// Uses Supabase REST API (HTTPS) instead of Prisma.

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check env vars
  results.supabaseUrlSet = !!process.env.SUPABASE_URL;
  results.supabaseAnonKeySet = !!process.env.SUPABASE_ANON_KEY;
  results.supabaseServiceKeySet = !!process.env.SUPABASE_SERVICE_KEY;
  results.nextauthSecretSet = !!process.env.NEXTAUTH_SECRET;
  results.databaseUrlSet = !!process.env.DATABASE_URL;
  results.directUrlSet = !!process.env.DIRECT_URL;

  // 2. Test REST API connection (via service role)
  try {
    const supabase = createServerSupabaseClient();

    // Query users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (error) {
      results.restApiConnection = `FAILED: ${error.message}`;
    } else {
      results.restApiConnection = 'OK';
      results.usersTableExists = true;
      results.userCount = data?.length || 0;

      if (data && data.length > 0) {
        results.usersTableColumns = Object.keys(data[0]);
        results.sampleUser = {
          id: data[0].id,
          email: data[0].email,
          hasPasswordHash: !!data[0].passwordHash,
          emailVerified: data[0].emailVerified,
        };
      } else {
        // Get column info from OpenAPI spec
        try {
          const specResponse = await fetch(
            `${process.env.SUPABASE_URL}/rest/v1/`,
            {
              headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY!,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
              },
            }
          );
          const spec = await specResponse.json();
          if (spec.definitions?.users?.properties) {
            results.usersTableColumns = Object.keys(spec.definitions.users.properties);
          }
        } catch { /* ignore */ }
      }
    }
  } catch (err) {
    results.restApiConnection = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
    results.usersTableExists = false;
  }

  // 3. Test dbRest helper
  try {
    const healthy = await dbRest.isHealthy();
    results.dbRestHealthy = healthy;
  } catch (err) {
    results.dbRestHealthy = false;
    results.dbRestError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
