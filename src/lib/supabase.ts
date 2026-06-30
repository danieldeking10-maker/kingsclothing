// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Get Supabase config from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create Supabase client if configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to check if we should use Supabase or Firebase
export const useSupabase = isSupabaseConfigured;

console.log('Database System:', useSupabase ? 'Supabase' : 'Firebase');
