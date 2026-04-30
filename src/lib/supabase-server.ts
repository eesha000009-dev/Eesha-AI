import { createClient } from '@supabase/supabase-js';

/**
 * Supabase server-side client (service role key — admin privileges).
 * Use ONLY in server-side API routes. NEVER expose to the browser.
 *
 * This client bypasses Row Level Security and is used for:
 * - Creating users (sign-up)
 * - Sending / verifying OTP codes
 * - Looking up user records securely
 */
export function createServerSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('SUPABASE_URL');
    if (!key) missing.push('SUPABASE_SERVICE_KEY');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Set these in your HF Space Secrets.`);
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
