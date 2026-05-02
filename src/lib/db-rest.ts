/**
 * Database operations using Supabase REST API (PostgREST).
 *
 * WHY: HF Spaces runs on IPv4-only networks. Supabase's direct PostgreSQL
 * connection (db.xxx.supabase.co) only resolves to IPv6, and the connection
 * pooler (aws-0-region.pooler.supabase.com) may not be configured for all projects.
 * The REST API works over HTTPS which is universally accessible.
 *
 * This module replaces Prisma for the core auth operations (users table).
 * Prisma is still available for other features but may fail on HF Spaces
 * due to IPv4 connectivity issues.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { nanoid } from 'nanoid';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null; // ISO timestamp or null
  image: string | null;
  passwordHash: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helper ─────────────────────────────────────────────────────────────────────

function getAdminClient() {
  return createServerSupabaseClient();
}

// ─── User Operations ────────────────────────────────────────────────────────────

export const dbRest = {
  /**
   * Find a user by email address.
   */
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('[DB-REST] findUserByEmail error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
    return data as UserRecord | null;
  },

  /**
   * Find a user by ID.
   */
  async findUserById(id: string): Promise<UserRecord | null> {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[DB-REST] findUserById error:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
    return data as UserRecord | null;
  },

  /**
   * Create a new user with email, name, and hashed password.
   * Returns the created user record.
   */
  async createUser(data: {
    email: string;
    name: string;
    passwordHash: string;
    emailVerified?: Date | null;
  }): Promise<UserRecord> {
    const supabase = getAdminClient();
    // Generate a unique ID (CUID-style) since the DB column doesn't auto-generate
    const id = `cl${nanoid(22)}`;
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id,
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        emailVerified: data.emailVerified ? data.emailVerified.toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('[DB-REST] createUser error:', error.message, error.details);
      // Check for duplicate email
      if (error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505') {
        throw new Error('UNIQUE_CONSTRAINT: An account with this email already exists.');
      }
      throw new Error(`Database error creating user: ${error.message}`);
    }
    return user as UserRecord;
  },

  /**
   * Update a user's password hash and/or name.
   */
  async updateUser(id: string, data: {
    passwordHash?: string;
    name?: string;
    emailVerified?: Date | null;
  }): Promise<UserRecord> {
    const supabase = getAdminClient();
    const updateData: Record<string, unknown> = {};
    if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.emailVerified !== undefined) {
      updateData.emailVerified = data.emailVerified ? data.emailVerified.toISOString() : null;
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DB-REST] updateUser error:', error.message);
      throw new Error(`Database error updating user: ${error.message}`);
    }
    return user as UserRecord;
  },

  /**
   * Mark a user's email as verified by setting emailVerified to current timestamp.
   */
  async verifyUserEmail(email: string): Promise<boolean> {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from('users')
      .update({ emailVerified: new Date().toISOString() })
      .eq('email', email);

    if (error) {
      console.error('[DB-REST] verifyUserEmail error:', error.message);
      throw new Error(`Database error verifying email: ${error.message}`);
    }
    return true;
  },

  /**
   * Count users in the table (for health checks).
   */
  async countUsers(): Promise<number> {
    const supabase = getAdminClient();
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[DB-REST] countUsers error:', error.message);
      throw new Error(`Database error counting users: ${error.message}`);
    }
    return count ?? 0;
  },

  /**
   * Check if the database connection is working.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.countUsers();
      return true;
    } catch {
      return false;
    }
  },
};
