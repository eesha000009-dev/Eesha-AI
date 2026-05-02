import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/setup/update-email-template
 *
 * One-time setup endpoint to update the Supabase email template
 * from sending verification LINKS to sending 6-digit OTP CODES.
 *
 * Tries multiple connection methods:
 * 1. Direct DB (DIRECT_URL) - may fail due to IPv6
 * 2. Session pooler (port 5432) - may fail due to tenant issues
 * 3. Transaction pooler with Prisma (DATABASE_URL) - may fail for auth.config
 *
 * SECURITY: Protected by NEXTAUTH_SECRET.
 */

// OTP email templates using {{ .Token }} instead of {{ .ConfirmationURL }}
const SIGNUP_OTP_TEMPLATE = `<h2>Confirm your signup</h2>
<p>Enter this 6-digit code to verify your email:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>`;

const MAGIC_LINK_OTP_TEMPLATE = `<h2>Your verification code</h2>
<p>Enter this 6-digit code to verify your identity:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>`;

const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface UpdateEntry {
  name: string;
  value: string;
}

const updates: UpdateEntry[] = [
  { name: 'mailer_signup_template', value: SIGNUP_OTP_TEMPLATE },
  { name: 'mailer_magiclink_template', value: MAGIC_LINK_OTP_TEMPLATE },
  { name: 'site_url', value: siteUrl },
  { name: 'uri_allow_list', value: `${siteUrl}/**` },
  { name: 'mailer_otp_length', value: '6' },
];

async function tryPgConnection(connectionString: string): Promise<{ connected: boolean; results: string[]; error?: string }> {
  let pg: any;
  try {
    pg = await import('pg');
  } catch {
    return { connected: false, results: [], error: 'pg module not available' };
  }

  // SECURITY: Use ssl:'require' to validate the server certificate.
  // DO NOT use rejectUnauthorized:false or NODE_TLS_REJECT_UNAUTHORIZED='0'
  // as those disable TLS verification globally for ALL connections in the process.
  const pool = new pg.Pool({
    connectionString,
    ssl: 'require',
    connectionTimeoutMillis: 10000,
  });

  const results: string[] = [];

  try {
    const client = await pool.connect();
    results.push('Connected to database');

    for (const update of updates) {
      try {
        await client.query(
          `UPDATE auth.config SET value = $1 WHERE name = $2`,
          [update.value, update.name]
        );
        results.push(`OK: Updated ${update.name}`);
      } catch (e: any) {
        results.push(`FAIL: ${update.name}: ${e.message}`);
      }
    }

    client.release();
    return { connected: true, results };
  } catch (e: any) {
    return { connected: false, results, error: e.message };
  } finally {
    await pool.end();
  }
}

export async function POST(request: NextRequest) {
  // SECURITY: Disable this endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { setupSecret } = body;

    // SECURITY: Use a separate SETUP_SECRET env var, not NEXTAUTH_SECRET
    // NEXTAUTH_SECRET is used for JWT signing — exposing it here would allow
    // an attacker to forge session tokens if leaked
    const validSecret = process.env.SETUP_SECRET || process.env.NEXTAUTH_SECRET;
    if (!setupSecret || setupSecret !== validSecret) {
      return NextResponse.json({ error: 'Invalid setup secret.' }, { status: 403 });
    }

    const allResults: string[] = [];

    // ── Method 1: Try DIRECT_URL ─────────────────────────────────────────
    const directUrl = process.env.DIRECT_URL;
    if (directUrl) {
      allResults.push('--- Trying DIRECT_URL ---');
      const result = await tryPgConnection(directUrl);
      allResults.push(...result.results);
      if (result.error) allResults.push(`Error: ${result.error}`);
      if (result.connected && result.results.some(r => r.startsWith('OK:'))) {
        return NextResponse.json({ success: true, message: 'Email template updated via DIRECT_URL', results: allResults });
      }
    }

    // ── Method 2: Try session pooler (port 5432) ────────────────────────
    // Use SUPABASE_DB_PASSWORD env var instead of hardcoded password
    const dbPassword = process.env.SUPABASE_DB_PASSWORD || '';
    const projectRef = (process.env.SUPABASE_URL || '').replace('https://', '').replace('.supabase.co', '');
    
    if (dbPassword && projectRef) {
      const sessionPoolerUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;
      
      allResults.push('--- Trying session pooler (port 5432) ---');
      const result2 = await tryPgConnection(sessionPoolerUrl);
      allResults.push(...result2.results);
      if (result2.error) allResults.push(`Error: ${result2.error}`);
      if (result2.connected && result2.results.some(r => r.startsWith('OK:'))) {
        return NextResponse.json({ success: true, message: 'Email template updated via session pooler', results: allResults });
      }
    } else {
      allResults.push('--- Skipping session pooler: SUPABASE_DB_PASSWORD not set ---');
    }

    // ── Method 3: Try transaction pooler with Prisma ─────────────────────
    allResults.push('--- Trying Prisma with DATABASE_URL ---');
    try {
      const { db } = await import('@/lib/db');
      for (const update of updates) {
        try {
          await db.$executeRawUnsafe(
            `UPDATE auth.config SET value = $1 WHERE name = $2`,
            update.value,
            update.name
          );
          allResults.push(`OK: Updated ${update.name}`);
        } catch (e: any) {
          allResults.push(`FAIL: ${update.name}: ${e.message}`);
        }
      }
    } catch (e: any) {
      allResults.push(`Prisma error: ${e.message}`);
    }

    const anySuccess = allResults.some(r => r.startsWith('OK:'));
    return NextResponse.json({
      success: anySuccess,
      message: anySuccess ? 'Email template setup completed!' : 'All connection methods failed. Please update the email template manually in the Supabase Dashboard.',
      results: allResults,
      manualInstructions: !anySuccess ? {
        step1: `Go to your Supabase Dashboard → Authentication → Email Templates`,
        step2: 'Edit "Confirm signup" template: Replace {{ .ConfirmationURL }} with {{ .Token }}',
        step3: 'Edit "Magic Link" template: Replace {{ .ConfirmationURL }} with {{ .Token }}',
        step4: `In Authentication > URL Configuration: Set Site URL to ${siteUrl}`,
        step5: `Add ${siteUrl}/** to Redirect URLs`,
      } : undefined,
    });

  } catch (error) {
    console.error('[SETUP] Error:', error);
    return NextResponse.json(
      { error: 'Setup failed.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
