/**
 * Shared API Utilities
 */

/** Check if a Supabase error is due to a missing table (pre-migration state) */
export function isTableMissing(error: { message?: string; code?: string }): boolean {
  const msg = (error.message || '').toLowerCase();
  return msg.includes('does not exist') || error.code === '42P01';
}
