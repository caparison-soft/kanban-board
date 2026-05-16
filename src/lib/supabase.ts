import { createBrowserClient } from '@supabase/ssr';

// Hub Client (Frontend Auth)
// Connects to the Caparison Lab main project to read the user's session
// Uses @supabase/ssr with shared cookie domain so the session set by the Hub
// is automatically available on all *.caparisonlab.com subdomains.
export const createHubClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Caparison Hub Supabase environment variables');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: process.env.NODE_ENV === 'production' ? { domain: '.caparisonlab.com' } : {},
  });
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
