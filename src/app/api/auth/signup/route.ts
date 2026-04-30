import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ─── Rate limiting for sign-up attempts ──────────────────────────────────────
const signupAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_SIGNUP_ATTEMPTS = 5;       // per IP per window
const SIGNUP_WINDOW_MS = 15 * 60_000; // 15 minutes

function checkSignupRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = signupAttempts.get(ip);

  if (!entry || now > entry.resetTime) {
    signupAttempts.set(ip, { count: 1, resetTime: now + SIGNUP_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_SIGNUP_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
// Steps:
//   1. Validate input (email, password, policy agreement)
//   2. Rate limit by IP
//   3. Create user in Supabase Auth (email + password, email_confirm: false)
//   4. Supabase automatically sends a verification OTP email
//   5. Create a corresponding user record in our Prisma database (best-effort)
//   6. Return success — client will show OTP input

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, agreedToPolicy } = body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'A password is required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter.' },
        { status: 400 }
      );
    }

    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one lowercase letter.' },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one number.' },
        { status: 400 }
      );
    }

    if (!agreedToPolicy) {
      return NextResponse.json(
        { error: 'You must agree to the Eesha AI Privacy Policy and Terms of Service.' },
        { status: 400 }
      );
    }

    // ── Rate limiting ───────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const rateCheck = checkSignupRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many sign-up attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 900) } }
      );
    }

    // ── Supabase Auth: Create user ──────────────────────────────────────────
    let supabase;
    try {
      supabase = createServerSupabaseClient();
    } catch (envError) {
      console.error('[SIGNUP] Missing Supabase env vars:', envError);
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          agreed_to_policy: true,
          agreed_at: new Date().toISOString(),
        },
      },
    });

    if (authError) {
      console.error('[SIGNUP] Supabase auth error:', authError.message, '| Status:', authError.status);

      if (authError.message.includes('already registered') ||
          authError.message.includes('already been registered') ||
          authError.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in instead.' },
          { status: 409 }
        );
      }

      // Common Supabase Auth errors
      if (authError.message.includes('Password') && authError.message.includes('weak')) {
        return NextResponse.json(
          { error: 'Password is too weak. Please choose a stronger password.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Unable to create account. Please try again.' },
        { status: 500 }
      );
    }

    // ── Best-effort: Create Prisma user record ──────────────────────────────
    // This is not critical — Supabase Auth is the source of truth.
    // The DB record is for NextAuth/PrismaAdapter compatibility.
    if (authData.user) {
      try {
        const { db } = await import('@/lib/db');
        const existingUser = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!existingUser) {
          await db.user.create({
            data: {
              id: authData.user.id,
              email: email.toLowerCase().trim(),
              name: email.split('@')[0],
              emailVerified: null,
            },
          });
        }
      } catch (dbError) {
        // Non-fatal — log but don't fail the signup
        // The user can still verify their email and sign in via Supabase Auth
        console.error('[SIGNUP] DB user creation failed (non-fatal):', dbError instanceof Error ? dbError.message : dbError);
      }
    }

    // ── Success ─────────────────────────────────────────────────────────────
    console.log('[SIGNUP] Success for:', email.toLowerCase().trim(), '| Confirmed:', !!authData.user?.email_confirmed_at);

    return NextResponse.json({
      success: true,
      message: 'Account created. A verification code has been sent to your email.',
      email: email.toLowerCase().trim(),
      emailConfirmed: authData.user?.email_confirmed_at != null,
    });

  } catch (error) {
    // Detailed error logging for debugging (not shown to user)
    console.error('[SIGNUP] Unexpected error:', error instanceof Error ? error.message : error);
    console.error('[SIGNUP] Stack:', error instanceof Error ? error.stack : 'N/A');

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
