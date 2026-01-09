import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing - document storage will not work')
}

// For client-side (browser) - used for documents table
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)