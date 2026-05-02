import { NextRequest, NextResponse } from 'next/server';
import { createSignupClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';

// ─── Rate limiting for OTP verification attempts ──────────────────────────────
const otpAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_OTP_ATTEMPTS = 10;       // generous — wrong codes are not a security risk
const OTP_WINDOW_MS = 15 * 60_000; // 15 minutes

// Supabase OTP expiry — default is 3600s (1 hour).
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

// ─── Helper: Send OTP code (same as in signup route) ─────────────────────────
async function sendOtpCode(signupClient: ReturnType<typeof createSignupClient>, email: string): Promise<{ sent: boolean; error?: string }> {
  // Attempt 1: with shouldCreateUser: false
  try {
    const { error } = await signupClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (!error) {
      console.log('[VERIFY-OTP] OTP resent via signInWithOtp (shouldCreateUser: false)');
      return { sent: true };
    }
    console.warn('[VERIFY-OTP] signInWithOtp attempt 1 failed:', error.message);
  } catch (e) {
    console.warn('[VERIFY-OTP] signInWithOtp attempt 1 exception:', e);
  }

  // Attempt 2: without flag
  try {
    const { error } = await signupClient.auth.signInWithOtp({ email });
    if (!error) {
      console.log('[VERIFY-OTP] OTP resent via signInWithOtp (no flag)');
      return { sent: true };
    }
    return { sent: false, error: error.message };
  } catch (e) {
    return { sent: false, error: String(e) };
  }
}

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
//
// BULLETPROOF verification flow:
//
//   1. Try verifyOtp() with ALL token types (email first, then signup, then recovery)
//      - We prioritize 'email' because our signup route sends OTP via signInWithOtp()
//        which generates 'email' type tokens
//   2. If all fail, use admin API to diagnose:
//      - If confirmation_sent_at exists and is recent → code is WRONG
//      - If confirmation_sent_at exists and is old → code is EXPIRED → auto-resend
//      - If confirmation_sent_at is null → no code was sent → auto-resend
//   3. After auto-resend, tell user to check email for the new code
//
// We NEVER tell the user to "go back and sign up again" — we always auto-recover.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
    }

    // Accept 6 or 8 digit OTPs
    if (!/^\d{6,8}$/.test(otp)) {
      return NextResponse.json({ error: 'Verification code must be 6 digits.' }, { status: 400 });
    }

    // ── Rate limiting ───────────────────────────────────────────────────────
    const normalizedEmail = email.toLowerCase().trim();
    const rateCheck = checkOtpRateLimit(normalizedEmail);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please request a new code.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 900) } }
      );
    }

    // ── Verify OTP with Supabase ────────────────────────────────────────────
    // Try 'email' type FIRST because our signup route sends OTP via signInWithOtp()
    // which generates 'email' type tokens. The 'signup' type from signUp() may not
    // work if the template sends links instead of codes.
    const signupClient = createSignupClient();

    const tokenTypes = ['email', 'signup', 'recovery'] as const;
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
        console.log(`[VERIFY-OTP] Success with type '${type}' for:`, normalizedEmail);
        break;
      }

      if (error) {
        console.warn(`[VERIFY-OTP] type '${type}' failed:`, error.message);
        lastError = { message: error.message, status: error.status };
        // Only try other types for "expired/invalid" errors
        if (!error.message.includes('expired') && !error.message.includes('invalid')) {
          break;
        }
      }
    }

    // ── If verification failed, auto-recover ────────────────────────────────
    if (!verifiedData && lastError) {
      console.error('[VERIFY-OTP] All types failed. Last error:', lastError.message);

      let specificError: string;
      let shouldResend = false;

      try {
        const adminClient = createServerSupabaseClient();
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const user = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );

        if (!user) {
          // User not found in Supabase Auth at all
          specificError = 'No account found with this email. Please sign up first.';
        } else if (user.confirmation_sent_at) {
          const sentAt = new Date(user.confirmation_sent_at).getTime();
          const now = Date.now();
          const elapsedSeconds = (now - sentAt) / 1000;

          console.log(`[VERIFY-OTP] confirmation_sent_at: ${user.confirmation_sent_at}, elapsed: ${elapsedSeconds.toFixed(0)}s`);

          if (elapsedSeconds > OTP_EXPIRY_SECONDS) {
            // Code expired — auto-resend
            shouldResend = true;
            specificError = 'Your verification code has expired. A new code has been sent to your email.';
          } else {
            // Code was sent recently but is wrong
            specificError = 'Incorrect verification code. Please check the code and try again.';
          }
        } else {
          // confirmation_sent_at is null — no code was recorded as sent
          // This happens when signUp() sent a LINK instead of a code
          shouldResend = true;
          specificError = 'No active verification code was found. A new code has been sent to your email.';
        }
      } catch (adminError) {
        console.error('[VERIFY-OTP] Admin lookup failed:', adminError);
        // On admin API failure, still try to resend
        shouldResend = true;
        specificError = 'Verification failed. A new code has been sent to your email.';
      }

      // Auto-resend OTP if needed
      if (shouldResend) {
        console.log('[VERIFY-OTP] Auto-resending OTP for:', normalizedEmail);
        const otpResult = await sendOtpCode(signupClient, normalizedEmail);
        if (otpResult.sent) {
          specificError = specificError.replace(
            'A new code has been sent to your email.',
            'A new code has been sent to your email. Please wait a moment and check your inbox.'
          );
        } else {
          // Even resend failed — give user actionable advice
          console.error('[VERIFY-OTP] Auto-resend failed:', otpResult.error);
          specificError = 'Your verification code may have expired. Click "Resend" below to get a new one.';
        }
      }

      return NextResponse.json({ error: specificError }, { status: 400 });
    }

    if (!verifiedData) {
      return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 400 });
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
        // Non-fatal — Supabase auth is the source of truth
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
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
