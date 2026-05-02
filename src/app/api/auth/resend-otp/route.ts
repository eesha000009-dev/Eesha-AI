import { NextRequest, NextResponse } from 'next/server';
import { createSignupClient, createServerSupabaseClient } from '@/lib/supabase-server';

// ─── Rate limiting for resend attempts ────────────────────────────────────────
const resendAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_RESEND_ATTEMPTS = 5;
const RESEND_WINDOW_MS = 15 * 60_000;
const RESEND_COOLDOWN_MS = 60_000; // 1 minute between resends

const lastResendTime = new Map<string, number>();

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────
//
// Resends an OTP code to the user's email.
// Uses signInWithOtp() which generates tokens of type 'email'.
//
// After a resend, the user should enter the NEW code from the new email.
// The old code (from signUp(), type 'signup') is INVALIDATED because
// signInWithOtp() overwrites the confirmation_token in auth.users.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const emailKey = email.toLowerCase().trim();

    // ── Cooldown check (1 minute between resends) ───────────────────────────
    const lastSent = lastResendTime.get(emailKey) || 0;
    const now = Date.now();
    if (now - lastSent < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSeconds} seconds before requesting a new code.` },
        { status: 429 }
      );
    }

    // ── Rate limit check ────────────────────────────────────────────────────
    const entry = resendAttempts.get(emailKey);
    if (!entry || now > entry.resetTime) {
      resendAttempts.set(emailKey, { count: 1, resetTime: now + RESEND_WINDOW_MS });
    } else if (entry.count >= MAX_RESEND_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many resend attempts. Please try again later.' },
        { status: 429 }
      );
    } else {
      entry.count++;
    }

    // ── Verify the user exists before sending ───────────────────────────────
    const adminClient = createServerSupabaseClient();
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const user = usersData?.users?.find(u => u.email?.toLowerCase() === emailKey);

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email. Please sign up first.' },
        { status: 404 }
      );
    }

    // If already verified, tell them to log in
    if (user.email_confirmed_at) {
      return NextResponse.json({
        success: true,
        message: 'Your email is already verified. You can sign in now.',
        alreadyVerified: true,
      });
    }

    // ── Send OTP via signInWithOtp ──────────────────────────────────────────
    // This generates a token of type 'email' and OVERRIDES any existing
    // 'signup' type token from signUp(). The user must use the NEW code.
    const signupClient = createSignupClient();

    // Attempt 1: with shouldCreateUser: false (user already exists)
    const { error: otpError1 } = await signupClient.auth.signInWithOtp({
      email: emailKey,
      options: { shouldCreateUser: false },
    });

    if (!otpError1) {
      lastResendTime.set(emailKey, now);
      console.log('[RESEND-OTP] OTP sent (shouldCreateUser: false) for:', emailKey);
      return NextResponse.json({
        success: true,
        message: 'A new verification code has been sent to your email. Use the NEW code — previous codes are no longer valid.',
        tokenType: 'email',
      });
    }

    console.warn('[RESEND-OTP] Attempt 1 failed:', otpError1.message);

    // Attempt 2: without flag (more permissive)
    const { error: otpError2 } = await signupClient.auth.signInWithOtp({
      email: emailKey,
    });

    if (!otpError2) {
      lastResendTime.set(emailKey, now);
      console.log('[RESEND-OTP] OTP sent (no flag) for:', emailKey);
      return NextResponse.json({
        success: true,
        message: 'A new verification code has been sent to your email. Use the NEW code — previous codes are no longer valid.',
        tokenType: 'email',
      });
    }

    console.error('[RESEND-OTP] All attempts failed:', otpError2.message);
    return NextResponse.json(
      { error: 'Unable to send verification code. Please wait a minute and try again.' },
      { status: 500 }
    );

  } catch (error) {
    console.error('[RESEND-OTP] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
