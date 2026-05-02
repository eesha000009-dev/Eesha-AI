/**
 * Startup script: Update Supabase email templates
 * 
 * Tries to connect to the Supabase database and update auth.config
 * so that verification emails contain OTP codes instead of magic links.
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

const SITE_URL = 'https://fuhaddesmond-eesha-ai.hf.space';

async function main() {
  let pg;
  try {
    pg = require('pg');
  } catch {
    console.log('[EMAIL-TEMPLATES] pg module not available, skipping');
    process.exit(0);
  }
  
  const projectRef = (process.env.SUPABASE_URL || '').replace('https://', '').replace('.supabase.co', '');
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
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const pool = new pg.Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    try {
      const client = await pool.connect();
      console.log('[EMAIL-TEMPLATES] Connected to DB');

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
        } catch (e) {
          console.warn(`[EMAIL-TEMPLATES] Failed: ${u.name}: ${e.message}`);
        }
      }

      client.release();
      await pool.end();
      
      if (ok > 0) {
        console.log(`[EMAIL-TEMPLATES] Updated ${ok}/${updates.length} templates successfully!`);
        process.exit(0);
      }
    } catch (e) {
      console.warn(`[EMAIL-TEMPLATES] Connection failed: ${e.message}`);
      try { await pool.end(); } catch {}
    } finally {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }
  }

  console.log('[EMAIL-TEMPLATES] All DB methods failed. Templates may need manual update in Supabase Dashboard.');
  process.exit(0); // Non-fatal
}

main().catch(e => {
  console.error('[EMAIL-TEMPLATES] Error:', e.message);
  process.exit(0); // Non-fatal
});
