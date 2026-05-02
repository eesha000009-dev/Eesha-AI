import { NextRequest, NextResponse } from 'next/server';
import { dbRest } from '@/lib/db-rest';

// ─── POST /api/auth/check-status ────────────────────────────────────────────
// Checks whether an email is registered in our `users` table.
// SECURITY: Returns a generic response to prevent email enumeration.
// The actual verification status is only revealed after proper auth flow.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await dbRest.findUserByEmail(normalizedEmail);

    // SECURITY: Always return same generic response to prevent email enumeration.
    // The login page will show appropriate errors based on the actual auth attempt.
    return NextResponse.json({
      exists: true,
      status: 'check_email',
      message: 'If an account exists with this email, check your inbox for next steps.',
    });

  } catch (error) {
    console.error('[CHECK-STATUS] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
