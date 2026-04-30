import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/setup/update-email-template
 *
 * One-time setup endpoint to update the Supabase email template
 * from sending verification LINKS to sending 6-digit OTP CODES.
 *
 * This modifies the GoTrue auth config in the database directly.
 * The template is changed to use {{ .Token }} instead of {{ .ConfirmationURL }}.
 *
 * SECURITY: This endpoint is protected by a setup secret.
 * Call it once after deployment, then it can be disabled.
 */

// OTP email template — uses {{ .Token }} for 6-digit code instead of {{ .ConfirmationURL }}
const SIGNUP_OTP_TEMPLATE = `<h2>Confirm your signup</h2>
<p>Enter this 6-digit code to verify your email:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>`;

const MAGIC_LINK_OTP_TEMPLATE = `<h2>Your verification code</h2>
<p>Enter this 6-digit code to verify your identity:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { setupSecret } = body;

    // ── Security: Require setup secret ──────────────────────────────────────
    if (setupSecret !== process.env.NEXTAUTH_SECRET) {
      return NextResponse.json(
        { error: 'Invalid setup secret.' },
        { status: 403 }
      );
    }

    const results: string[] = [];

    // ── Update "Confirm signup" email template to use OTP code ──────────────
    try {
      await db.$executeRawUnsafe(`
        UPDATE auth.config
        SET value = $1
        WHERE name = 'mailer_signup_template'
      `, SIGNUP_OTP_TEMPLATE);
      results.push('Updated mailer_signup_template to use OTP code');
    } catch (e: any) {
      results.push(`mailer_signup_template: ${e.message}`);
    }

    // ── Update "Magic Link" email template to use OTP code ──────────────────
    try {
      await db.$executeRawUnsafe(`
        UPDATE auth.config
        SET value = $1
        WHERE name = 'mailer_magiclink_template'
      `, MAGIC_LINK_OTP_TEMPLATE);
      results.push('Updated mailer_magiclink_template to use OTP code');
    } catch (e: any) {
      results.push(`mailer_magiclink_template: ${e.message}`);
    }

    // ── Update site URL to the HF Space URL ─────────────────────────────────
    const siteUrl = process.env.NEXTAUTH_URL || 'https://fuhaddesmond-eesha-ai.hf.space';
    try {
      await db.$executeRawUnsafe(`
        UPDATE auth.config
        SET value = $1
        WHERE name = 'site_url'
      `, siteUrl);
      results.push(`Updated site_url to ${siteUrl}`);
    } catch (e: any) {
      results.push(`site_url: ${e.message}`);
    }

    // ── Update URI allow list for redirects ─────────────────────────────────
    try {
      await db.$executeRawUnsafe(`
        UPDATE auth.config
        SET value = $1
        WHERE name = 'uri_allow_list'
      `, `${siteUrl}/**`);
      results.push('Updated uri_allow_list');
    } catch (e: any) {
      results.push(`uri_allow_list: ${e.message}`);
    }

    // ── Set OTP length to 6 digits ──────────────────────────────────────────
    try {
      await db.$executeRawUnsafe(`
        UPDATE auth.config
        SET value = '6'
        WHERE name = 'mailer_otp_length'
      `);
      results.push('Set OTP length to 6 digits');
    } catch (e: any) {
      results.push(`mailer_otp_length: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Email template setup complete.',
      results,
    });

  } catch (error) {
    console.error('[SETUP] Error:', error);
    return NextResponse.json(
      { error: 'Setup failed.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
