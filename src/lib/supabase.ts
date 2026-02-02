import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uexocpbwozdypvlzwhuh.supabase.co';
const supabaseAnonKey = 'sb_publishable_PjobQfxgJMHRu_LByaMnaQ_TeFwHZ_-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
