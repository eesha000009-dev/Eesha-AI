import { NextRequest, NextResponse } from 'next/server';
import { dbRest } from '@/lib/db-rest';

// ─── POST /api/auth/check-status ────────────────────────────────────────────
// Checks whether an email is registered in our `users` table.
// Uses Supabase REST API (HTTPS) for database operations.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await dbRest.findUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json({
        exists: false,
        status: 'not_found',
        message: 'No account found with this email.',
      });
    }

    return NextResponse.json({
      exists: true,
      status: user.emailVerified ? 'verified' : 'found',
      message: user.emailVerified
        ? 'Your email is verified. You can sign in now.'
        : 'Account found. Please verify your email.',
    });

  } catch (error) {
    console.error('[CHECK-STATUS] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
