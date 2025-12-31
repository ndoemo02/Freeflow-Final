import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ezemaacyyvbpjlagchds.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZW1hYWN5eXZicGpsYWdjaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODU1MzYsImV4cCI6MjA3NTM2MTUzNn0.uRKmqxL0Isx3DmOxmgc_zPwG5foYXft9WpIROoTTgGU';

// Singleton instance to avoid multiple GoTrue clients under same storage key
const g: any = globalThis as any;
export const supabase =
  g.__freeflow_supabase__ ||
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey: 'freeflow-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (!g.__freeflow_supabase__) g.__freeflow_supabase__ = supabase;


