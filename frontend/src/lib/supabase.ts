import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './mockData';
import { createMockSupabase } from './mockService';

const configured = isSupabaseConfigured();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = configured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabase();

export { configured as isSupabaseConfigured };
