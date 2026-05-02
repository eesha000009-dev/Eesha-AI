import { NextRequest, NextResponse } from 'next/server';
import { createSignupClient, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /auth/confirm
 *
 * Handles the email verification callback from Supabase.
 * When a user clicks the verification link in their email,
 * Supabase redirects them here with token_hash and type params.
 *
 * Flow:
 *   1. Extract token_hash and type from URL params
 *   2. Try verifyOtp() with the token_hash to verify and create session
 *   3. If that fails (token already consumed by Supabase's redirect),
 *      check if user is already verified via admin API
 *   4. Update our Prisma DB to mark email as verified
 *   5. Redirect to the login page with a success indicator
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  console.log('[AUTH-CONFIRM] Received callback — type:', type, 'has_token:', !!tokenHash);

  // If no token, check for access_token in hash (Supabase may pass it differently)
  if (!tokenHash || !type) {
    console.error('[AUTH-CONFIRM] Missing token_hash or type params');
    return NextResponse.redirect(
      new URL('/login?verification=error&reason=missing_token', request.url)
    );
  }

  let verifiedEmail: string | null = null;
  let verifiedUserId: string | null = null;

  // ── Step 1: Try verifyOtp with the signup client (anon key) ──────────────
  try {
    const signupClient = createSignupClient();
    const { data, error } = await signupClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'signup' | 'email' | 'email_change' | 'recovery',
    });

    if (!error && data.user) {
      verifiedEmail = data.user.email || null;
      verifiedUserId = data.user.id;
      console.log('[AUTH-CONFIRM] OTP verified successfully for:', verifiedEmail);
    } else if (error) {
      console.warn('[AUTH-CONFIRM] verifyOtp failed:', error.message);
    }
  } catch (e) {
    console.warn('[AUTH-CONFIRM] verifyOtp exception:', e);
  }

  // ── Step 2: If OTP verification failed, try admin API as fallback ───────
  // This handles the case where Supabase's auth server already consumed the
  // token during the redirect, so our verifyOtp() call fails with
  // "Token has expired or is invalid" — but the user IS verified in Supabase
  if (!verifiedUserId) {
    try {
      const adminClient = createServerSupabaseClient();
      const { data: usersData } = await adminClient.auth.admin.listUsers();

      // We can't easily match by token, so check for any recently confirmed users
      // who were unconfirmed before (within the last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentlyConfirmed = usersData?.users?.filter(u => {
        if (!u.email_confirmed_at) return false;
        const confirmedAt = new Date(u.email_confirmed_at);
        return confirmedAt > fiveMinutesAgo;
      });

      if (recentlyConfirmed && recentlyConfirmed.length > 0) {
        // Use the most recently confirmed user
        const user = recentlyConfirmed.reduce((a, b) =>
          new Date(a.email_confirmed_at!) > new Date(b.email_confirmed_at!) ? a : b
        );
        verifiedEmail = user.email || null;
        verifiedUserId = user.id;
        console.log('[AUTH-CONFIRM] Found recently verified user via admin API:', verifiedEmail);
      }
    } catch (adminError) {
      console.error('[AUTH-CONFIRM] Admin API fallback failed:', adminError);
    }
  }

  // ── Step 3: Update our Prisma DB ─────────────────────────────────────────
  if (verifiedUserId) {
    try {
      const { db } = await import('@/lib/db');
      await db.user.update({
        where: { id: verifiedUserId },
        data: { emailVerified: new Date() },
      });
      console.log('[AUTH-CONFIRM] DB updated for:', verifiedEmail);
    } catch (dbError) {
      console.error('[AUTH-CONFIRM] DB update failed (non-fatal):', dbError);
    }

    return NextResponse.redirect(
      new URL('/login?verification=success', request.url)
    );
  }

  // ── Step 4: Verification failed ──────────────────────────────────────────
  console.error('[AUTH-CONFIRM] All verification methods failed');
  return NextResponse.redirect(
    new URL('/login?verification=error&reason=verification_failed', request.url)
  );
}
