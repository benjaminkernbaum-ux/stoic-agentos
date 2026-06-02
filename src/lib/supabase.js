/**
 * Stoic AgentOS — Supabase Client Singleton
 * Shared across all components for auth + data
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://viiagdhtzbvkfhcjqrlz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpaWFnZGh0emJ2a2ZoY2pxcmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjM2NjEsImV4cCI6MjA5NDQzOTY2MX0.33k6RjLHBF_DCX6h9etnY9EsrsGBSQrBfMqTO2g7Z7o';

if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_SUPABASE_URL) console.warn('[Stoic] VITE_SUPABASE_URL not set — using production fallback');
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) console.warn('[Stoic] VITE_SUPABASE_ANON_KEY not set — using hardcoded key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// API base URL for the backend
export const API_BASE = import.meta.env.VITE_API_URL || 'https://api.stoicagentos.com';
