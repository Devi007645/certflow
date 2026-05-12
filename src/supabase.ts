import { createClient } from '@supabase/supabase-js'

// You must add these to your .env file:
// VITE_SUPABASE_URL=https://wvopnfrbjlposcuoziok.supabase.co
// VITE_SUPABASE_ANON_KEY=your_anon_key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wvopnfrbjlposcuoziok.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2b3BuZnJiamxwb3NjdW96aW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0OTYzNzUsImV4cCI6MjA5NDA3MjM3NX0.UT_Qx3m1kYkhFlYs8mSOcO1DDK1gmDRB6L0q1jcd0jE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
