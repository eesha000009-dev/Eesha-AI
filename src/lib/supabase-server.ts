import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase server-side client (service role key — admin privileges).
 * Use ONLY in server-side API routes. NEVER expose to the browser.
 *
 * This client bypasses Row Level Security and is used for:
 * - Admin operations (listing users, deleting users, etc.)
 * - Verifying OTP codes
 * - Looking up user records securely
 * - Updating user metadata
 *
 * ⚠️ Do NOT use this for signUp() — the service role auto-confirms emails
 * and does NOT send OTP verification emails. Use createSignupClient() instead.
 */
export function createServerSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    const missing: string[] = [];
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

/**
 * Supabase server-side client with the anon (public) key.
 * Use ONLY in server-side API routes. NEVER expose to the browser.
 *
 * This client respects Row Level Security and normal Supabase Auth flows.
 * It is used specifically for:
 * - signUp() — triggers OTP email verification (the service role auto-confirms, skipping OTP)
 * - resend() — resends OTP verification emails
 *
 * The anon key is safe to use on the server because it is never sent to the browser.
 * It must NOT be prefixed with NEXT_PUBLIC_ to prevent frontend exposure.
 */
export function createSignupClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing: string[] = [];
    if (!url) missing.push('SUPABASE_URL');
    if (!anonKey) missing.push('SUPABASE_ANON_KEY');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Set these in your HF Space Secrets.`);
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
