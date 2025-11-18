import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to get user by Clerk ID
export async function getUserByClerkId(clerkId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

// Helper function to create user
export async function createUser(clerkId: string, email: string) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkId,
      email,
      subscription_tier: 'free',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
