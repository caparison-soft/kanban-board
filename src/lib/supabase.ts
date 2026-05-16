import { createClient } from '@supabase/supabase-js';

// 1. Hub Client (Frontend Auth)
// Connects to the Caparison Lab main project to read the user's session
export const createHubClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Caparison Hub Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

// 2. Spoke Client (Backend Data Admin)
// Connects to the isolated Kanban project using the Service Role Key to bypass RLS
export const createKanbanAdminClient = () => {
  const supabaseUrl = process.env.KANBAN_SUPABASE_URL;
  const supabaseServiceKey = process.env.KANBAN_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Kanban Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};
