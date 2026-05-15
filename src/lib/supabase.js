/**
 * Stoic AgentOS — Supabase Client Singleton
 * Shared across all components for auth + data
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hwmpphhujhxdzuhjkskh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3bXBwaGh1amh4ZHp1aGprc2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDQ2MzcsImV4cCI6MjA4OTUyMDYzN30.KNvwkuH59783zbVLHuzlDwEQw2bVw8z22tyRO79g1j0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// API base URL for the backend
export const API_BASE = import.meta.env.VITE_API_URL || 'https://stoic-agentos-api-production.up.railway.app';
