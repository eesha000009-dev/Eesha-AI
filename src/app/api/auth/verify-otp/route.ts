import { NextRequest, NextResponse } from 'next/server';
import { createSignupClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';

// ─── Rate limiting for OTP verification attempts ──────────────────────────────
const otpAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_OTP_ATTEMPTS = 5;        // per email per window (strict for security)
const OTP_WINDOW_MS = 15 * 60_000; // 15 minutes

// Supabase OTP expiry — default is 3600s (1 hour) but can be configured in Dashboard.
// We use this to distinguish "wrong code" from "expired code".
const OTP_EXPIRY_SECONDS = 3600;

function checkOtpRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = otpAttempts.get(identifier);

  if (!entry || now > entry.resetTime) {
    otpAttempts.set(identifier, { count: 1, resetTime: now + OTP_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_OTP_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Verifies the OTP code sent to the user's email during sign-up.
//
// IMPORTANT: Supabase returns "Token has expired or is invalid" for BOTH
// wrong codes AND expired codes — it doesn't distinguish for security reasons.
//
// To give the user accurate feedback, we use the admin API to check the user's
// `confirmation_sent_at` timestamp after a verification failure:
//   - If the OTP was sent within the expiry window → code is WRONG
//   - If the OTP was sent outside the expiry window → code is EXPIRED

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required.' },
        { status: 400 }
      );
    }

    // Accept 6 or 8 digit OTPs (Supabase project config determines length)
    if (!/^\d{6,8}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Verification code must be 6 or 8 digits.' },
        { status: 400 }
      );
    }

    // ── Rate limiting (strict — only 5 attempts per 15 min) ─────────────────
    const normalizedEmail = email.toLowerCase().trim();
    const rateCheck = checkOtpRateLimit(normalizedEmail);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please request a new code.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 900) } }
      );
    }

    // ── Verify OTP with Supabase ────────────────────────────────────────────
    // Use the anon key client (same key that sent the OTP) — NOT the admin client.
    //
    // We try ALL possible token types because the type depends on how the OTP
    // was generated:
    //   - signUp() → generates 'signup' type
    //   - signInWithOtp() → generates 'email' type
    //   - Some Supabase configs → generate 'recovery' type
    const signupClient = createSignupClient();

    const tokenTypes = ['signup', 'email', 'recovery'] as const;
    let lastError: { message: string; status?: number } | null = null;
    let verifiedData: any = null;

    for (const type of tokenTypes) {
      const { data, error } = await signupClient.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type,
      });

      if (!error && data.user) {
        verifiedData = data;
        break;
      }

      if (error) {
        console.warn(`[VERIFY-OTP] type '${type}' failed:`, error.message);
        lastError = { message: error.message, status: error.status };
        // If the error is NOT "expired/invalid", it's a different kind of error
        // (e.g., "user not found") — don't try other types
        if (!error.message.includes('expired') && !error.message.includes('invalid')) {
          break;
        }
      }
    }

    // ── If all types failed, determine if code is WRONG or EXPIRED ──────────
    if (!verifiedData && lastError) {
      console.error('[VERIFY-OTP] All types failed. Last error:', lastError.message);

      // Use admin API to check when the OTP was last sent
      let specificError: string;

      try {
        const adminClient = createServerSupabaseClient();
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const user = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );

        if (user && user.confirmation_sent_at) {
          const sentAt = new Date(user.confirmation_sent_at).getTime();
          const now = Date.now();
          const elapsedSeconds = (now - sentAt) / 1000;

          console.log(`[VERIFY-OTP] confirmation_sent_at: ${user.confirmation_sent_at}, elapsed: ${elapsedSeconds.toFixed(0)}s, expiry: ${OTP_EXPIRY_SECONDS}s`);

          if (elapsedSeconds > OTP_EXPIRY_SECONDS) {
            specificError = 'Verification code has expired. Please click "Resend" to get a new one.';
          } else {
            specificError = 'Incorrect verification code. Please check the code and try again.';
          }
        } else if (user && !user.confirmation_sent_at) {
          // No confirmation was ever recorded — auto-resend OTP and tell the user
          console.log('[VERIFY-OTP] confirmation_sent_at is null for:', normalizedEmail, '— auto-resending OTP');

          try {
            const resendSignupClient = createSignupClient();
            const { error: resendError } = await resendSignupClient.auth.signInWithOtp({
              email: normalizedEmail,
              options: { shouldCreateUser: false },
            });

            if (!resendError) {
              specificError = 'No active verification code was found for this email. A new code has been sent. Please check your email and try again.';
            } else {
              // Retry without shouldCreateUser flag
              const { error: resendError2 } = await resendSignupClient.auth.signInWithOtp({
                email: normalizedEmail,
              });

              if (!resendError2) {
                specificError = 'No active verification code was found for this email. A new code has been sent. Please check your email and try again.';
              } else {
                specificError = 'Could not send a new verification code. Please go back and sign up again.';
              }
            }
          } catch {
            specificError = 'Could not send a new verification code. Please go back and sign up again.';
          }
        } else {
          // User not found in Supabase Auth
          specificError = 'No account found with this email. Please sign up first.';
        }
      } catch (adminError) {
        console.error('[VERIFY-OTP] Admin lookup failed:', adminError);
        // Fallback to generic error
        specificError = 'Verification failed. If your code has expired, please click "Resend" to get a new one.';
      }

      return NextResponse.json(
        { error: specificError },
        { status: 400 }
      );
    }

    if (!verifiedData) {
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 400 }
      );
    }

    // ── Update our database: mark email as verified ─────────────────────────
    if (verifiedData.user) {
      try {
        await db.user.update({
          where: { id: verifiedData.user.id },
          data: { emailVerified: new Date() },
        });
      } catch (dbError) {
        console.error('[VERIFY-OTP] Database update error:', dbError);
        // Non-fatal — Supabase auth is the source of truth for verification
      }
    }

    // ── Success ─────────────────────────────────────────────────────────────
    console.log('[VERIFY-OTP] Email verified for:', normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
    });

  } catch (error) {
    console.error('[VERIFY-OTP] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
