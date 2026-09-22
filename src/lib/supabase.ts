import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bwbiwiuovsvfxpudtywy.supabase.co'
const supabasePublishableKey = 'sb_publishable_2JdAHryckEpJJSuN6-wV_Q_bkX7m9Fz'

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
)
