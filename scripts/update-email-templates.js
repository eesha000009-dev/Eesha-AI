/**
 * Startup script: Update Supabase email templates
 *
 * Tries multiple methods to ensure verification emails contain OTP codes
 * instead of magic links:
 *
 * 1. Direct DB connection (pg module + connection strings)
 * 2. Supabase Management API (if SUPABASE_ACCESS_TOKEN is set)
 *
 * If all methods fail, prints manual instructions.
 *
 * Usage: node scripts/update-email-templates.js
 */

const SIGNUP_OTP_TEMPLATE = `<h2>Confirm your signup</h2>
<p>Enter this 6-digit code to verify your email:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>`;

const MAGIC_LINK_OTP_TEMPLATE = `<h2>Your verification code</h2>
<p>Enter this 6-digit code to verify your identity:</p>
<div style="padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; font-family: monospace;">{{ .Token }}</div>
<p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours. If you did not request this, please ignore this email.</p>`;

const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

const projectRef = (process.env.SUPABASE_URL || '').replace('https://', '').replace('.supabase.co', '');

// ─── Method 1: Direct database connection ──────────────────────────────────────
async function tryDirectDb() {
  let pg;
  try {
    pg = require('pg');
  } catch {
    console.log('[EMAIL-TEMPLATES] pg module not available, skipping direct DB method');
    return false;
  }

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const directUrl = process.env.DIRECT_URL;

  const connectionStrings = [
    directUrl,
    dbPassword ? `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require` : null,
    dbPassword ? `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require` : null,
    dbPassword ? `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require` : null,
  ].filter(Boolean);

  for (const connStr of connectionStrings) {
    if (!connStr) continue;
    // SECURITY: Use ssl:'require' to validate the server certificate.
    // DO NOT use rejectUnauthorized:false or NODE_TLS_REJECT_UNAUTHORIZED='0'
    // as those disable TLS verification globally for ALL connections in the process.
    const pool = new pg.Pool({
      connectionString: connStr,
      ssl: 'require',
      connectionTimeoutMillis: 10000,
    });

    try {
      const client = await pool.connect();
      console.log('[EMAIL-TEMPLATES] Connected to DB via:', connStr.substring(0, 30) + '...');

      const updates = [
        { name: 'mailer_signup_template', value: SIGNUP_OTP_TEMPLATE },
        { name: 'mailer_magiclink_template', value: MAGIC_LINK_OTP_TEMPLATE },
        { name: 'mailer_otp_length', value: '6' },
        { name: 'site_url', value: SITE_URL },
        { name: 'uri_allow_list', value: `${SITE_URL}/**` },
      ];

      let ok = 0;
      for (const u of updates) {
        try {
          await client.query('UPDATE auth.config SET value = $1 WHERE name = $2', [u.value, u.name]);
          ok++;
          console.log(`[EMAIL-TEMPLATES] Updated: ${u.name}`);
        } catch (e) {
          console.warn(`[EMAIL-TEMPLATES] Failed: ${u.name}: ${e.message}`);
        }
      }

      client.release();
      await pool.end();

      if (ok > 0) {
        console.log(`[EMAIL-TEMPLATES] Direct DB: Updated ${ok}/${updates.length} templates`);
        return true;
      }
    } catch (e) {
      console.warn(`[EMAIL-TEMPLATES] DB connection failed: ${e.message}`);
      try { await pool.end(); } catch {}
    }
  }

  return false;
}

// ─── Method 2: Supabase Management API ─────────────────────────────────────────
async function tryManagementApi() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken || !projectRef) {
    console.log('[EMAIL-TEMPLATES] Skipping Management API (SUPABASE_ACCESS_TOKEN not set)');
    return false;
  }

  const https = require('https');
  const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

  const body = JSON.stringify({
    mailer_signup_template: SIGNUP_OTP_TEMPLATE,
    mailer_magiclink_template: MAGIC_LINK_OTP_TEMPLATE,
    site_url: SITE_URL,
    uri_allow_list: `${SITE_URL}/**`,
  });

  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[EMAIL-TEMPLATES] Management API: Templates updated successfully');
          resolve(true);
        } else {
          console.warn(`[EMAIL-TEMPLATES] Management API failed: ${res.statusCode} ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.warn(`[EMAIL-TEMPLATES] Management API error: ${e.message}`);
      resolve(false);
    });

    req.write(body);
    req.end();
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('[EMAIL-TEMPLATES] Project ref:', projectRef || '(not detected)');
  console.log('[EMAIL-TEMPLATES] Attempting to update email templates...');

  // Try Method 1: Direct DB
  const dbOk = await tryDirectDb();
  if (dbOk) {
    console.log('[EMAIL-TEMPLATES] Success via direct DB connection');
    process.exit(0);
  }

  // Try Method 2: Management API
  const apiOk = await tryManagementApi();
  if (apiOk) {
    console.log('[EMAIL-TEMPLATES] Success via Management API');
    process.exit(0);
  }

  // All methods failed
  console.log('');
  console.log('='.repeat(70));
  console.log('[EMAIL-TEMPLATES] All automatic methods failed.');
  console.log('[EMAIL-TEMPLATES] Please update manually in Supabase Dashboard:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/auth/templates');
  console.log('2. Edit "Confirm signup" template:');
  console.log('   Replace {{ .ConfirmationURL }} with {{ .Token }}');
  console.log('3. Edit "Magic Link" template:');
  console.log('   Replace {{ .ConfirmationURL }} with {{ .Token }}');
  console.log('4. In Authentication > URL Configuration:');
  console.log('   Set Site URL to: ' + SITE_URL);
  console.log('5. Add redirect URL: ' + SITE_URL + '/**');
  console.log('='.repeat(70));

  process.exit(0); // Non-fatal
}

main().catch(e => {
  console.error('[EMAIL-TEMPLATES] Error:', e.message);
  process.exit(0); // Non-fatal
});
