import { NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';

// ─── GET /api/auth/debug-db ──────────────────────────────────────────────────
// Debug endpoint to check if the database connection and `users` table are working.
// This helps diagnose signup errors by showing the actual DB state.

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check if DATABASE_URL is set
  results.databaseUrlSet = !!process.env.DATABASE_URL;
  results.directUrlSet = !!process.env.DIRECT_URL;
  results.databaseAvailable = isDatabaseAvailable();

  // 2. Try connecting to the DB
  try {
    await db.$connect();
    results.dbConnection = 'OK';
  } catch (err) {
    results.dbConnection = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json(results, { status: 500 });
  }

  // 3. Check if `users` table exists and has the right columns
  try {
    // Try a raw query to check column names
    const columns = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    results.usersTableColumns = columns;
  } catch (err) {
    results.usersTableColumns = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }

  // 4. Try a simple query on the users table
  try {
    const userCount = await db.user.count();
    results.usersTableExists = true;
    results.userCount = userCount;
  } catch (err) {
    results.usersTableExists = false;
    results.usersTableError = err instanceof Error ? err.message : String(err);
  }

  // 5. Check Supabase env vars
  results.supabaseUrlSet = !!process.env.SUPABASE_URL;
  results.supabaseAnonKeySet = !!process.env.SUPABASE_ANON_KEY;
  results.supabaseServiceKeySet = !!process.env.SUPABASE_SERVICE_KEY;
  results.nextauthSecretSet = !!process.env.NEXTAUTH_SECRET;

  // 6. Try creating a test user (then delete it) to verify the schema
  try {
    const testUser = await db.user.create({
      data: {
        email: '__debug_test__@test.com',
        name: 'Debug Test',
        passwordHash: '$2a$12$test',
        emailVerified: null,
      },
    });
    results.createUserWorks = true;
    results.testUserId = testUser.id;

    // Clean up
    await db.user.delete({ where: { id: testUser.id } });
    results.deleteUserWorks = true;
  } catch (err) {
    results.createUserWorks = false;
    results.createUserError = err instanceof Error ? err.message : String(err);
  }

  try {
    await db.$disconnect();
  } catch { /* ignore */ }

  return NextResponse.json(results, { status: 200 });
}
