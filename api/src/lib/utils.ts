/**
 * Shared API Utilities
 */

/** Check if a Supabase error is due to a missing table (pre-migration state) */
export function isTableMissing(error: { message?: string; code?: string }): boolean {
  const msg = (error.message || '').toLowerCase();
  return msg.includes('does not exist') || error.code === '42P01';
}

/** Check if a Supabase error is due to a missing RPC function (pre-migration state) */
export function isRpcMissing(error: { message?: string; code?: string }): boolean {
  const msg = (error.message || '').toLowerCase();
  return error.code === 'PGRST202' || error.code === '42883' ||
    msg.includes('could not find the function') || msg.includes('function') && msg.includes('does not exist');
}
