/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the Next.js server starts.
 * Used to update Supabase email templates to send OTP codes ({{ .Token }})
 * instead of verification links ({{ .ConfirmationURL }}).
 */

export async function register() {
  // Only run on the server, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[STARTUP] Running instrumentation...');

    // Update email templates in the background (don't block startup)
    updateEmailTemplates().catch((err) => {
      console.error('[STARTUP] Email template update failed (non-fatal):', err);
    });
  }
}

// ─── Email Template Update Logic ──────────────────────────────────────────────
// Tries to connect to the Supabase database and update auth.config
// so that verification emails contain OTP codes instead of magic links.

const SIGNUP_OTP_TEMPLATE = `<h2>Confirm your signup</h2>
<p>Enter this 6-digit code to verify your email:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>`;

const MAGIC_LINK_OTP_TEMPLATE = `<h2>Your verification code</h2>
<p>Enter this 6-digit code to verify your identity:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>`;

const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

let templatesUpdated = false;

async function updateEmailTemplates(): Promise<void> {
  if (templatesUpdated) return;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log('[STARTUP] Skipping email template update: Missing Supabase env vars');
    return;
  }

  // Try updating via the Supabase Management API
  // This requires a personal access token which we don't have,
  // so we try the direct database approach instead.

  // Attempt 1: Use the Supabase REST API with service role key
  // The auth.config table is not exposed via PostgREST, so this won't work directly.
  // Instead, try using the Supabase Auth Admin API to check the current config.

  // Attempt 2: Use a direct database connection via pg module
  // SECURITY: We use ssl:'require' which validates the server certificate.
  // DO NOT use rejectUnauthorized:false or NODE_TLS_REJECT_UNAUTHORIZED='0'
  // as those disable TLS verification globally for ALL connections in the process.
  try {
    const pg = await import('pg');
    const dbPassword = process.env.SUPABASE_DB_PASSWORD;

    // Try various connection strings
    const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

    const connectionStrings = [
      // Transaction pooler (port 6543) — recommended for serverless
      dbPassword ? `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require` : null,
      // Session pooler (port 5432)
      dbPassword ? `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require` : null,
      // Direct connection — may not work on IPv4-only hosts (e.g., HF Spaces)
      dbPassword ? `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require` : null,
      // DATABASE_URL from Prisma
      process.env.DIRECT_URL,
    ].filter(Boolean) as string[];

    for (const connectionString of connectionStrings) {
      try {
        // SECURITY: Use ssl:'require' to validate the server certificate.
        // This rejects self-signed or invalid certificates.
        // The pooler connections use proper CA-signed certs, so this works.
        const pool = new pg.Pool({
          connectionString,
          ssl: 'require',
          connectionTimeoutMillis: 10000,
        });

        const client = await pool.connect();
        console.log('[STARTUP] Connected to Supabase DB for template update');

        const updates = [
          { name: 'mailer_signup_template', value: SIGNUP_OTP_TEMPLATE },
          { name: 'mailer_magiclink_template', value: MAGIC_LINK_OTP_TEMPLATE },
          { name: 'mailer_otp_length', value: '6' },
          { name: 'site_url', value: SITE_URL },
          { name: 'uri_allow_list', value: `${SITE_URL}/**` },
        ];

        let successCount = 0;
        for (const update of updates) {
          try {
            await client.query(
              'UPDATE auth.config SET value = $1 WHERE name = $2',
              [update.value, update.name]
            );
            successCount++;
          } catch (e: any) {
            console.warn(`[STARTUP] Failed to update ${update.name}:`, e.message);
          }
        }

        client.release();
        await pool.end();

        if (successCount > 0) {
          console.log(`[STARTUP] Email templates updated successfully (${successCount}/${updates.length})`);
          templatesUpdated = true;
          return;
        }
      } catch (e: any) {
        console.warn('[STARTUP] DB connection failed:', e.message);
      }
    }
  } catch (e: any) {
    console.warn('[STARTUP] pg module not available:', e.message);
  }

  // Attempt 3: Use Prisma to run raw SQL
  try {
    const { db } = await import('./src/lib/db');

    const updates = [
      { name: 'mailer_signup_template', value: SIGNUP_OTP_TEMPLATE },
      { name: 'mailer_magiclink_template', value: MAGIC_LINK_OTP_TEMPLATE },
      { name: 'mailer_otp_length', value: '6' },
      { name: 'site_url', value: SITE_URL },
      { name: 'uri_allow_list', value: `${SITE_URL}/**` },
    ];

    let successCount = 0;
    for (const update of updates) {
      try {
        await db.$executeRawUnsafe(
          'UPDATE auth.config SET value = $1 WHERE name = $2',
          update.value,
          update.name
        );
        successCount++;
      } catch (e: any) {
        console.warn(`[STARTUP] Prisma update failed for ${update.name}:`, e.message);
      }
    }

    if (successCount > 0) {
      console.log(`[STARTUP] Email templates updated via Prisma (${successCount}/${updates.length})`);
      templatesUpdated = true;
      return;
    }
  } catch (e: any) {
    console.warn('[STARTUP] Prisma approach failed:', e.message);
  }

  console.log('[STARTUP] Could not update email templates automatically.');
  console.log('[STARTUP] Please update manually: Supabase Dashboard → Authentication → Email Templates');
  console.log('[STARTUP] Replace {{ .ConfirmationURL }} with {{ .Token }} in "Confirm signup" and "Magic Link" templates');
}
