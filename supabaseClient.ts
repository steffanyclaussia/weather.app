import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mcodffgzvdwykxwylona.supabase.co';
const supabaseAnonKey = 'sb_publishable_v2OmSlZDU8bQRdvKbDWlAw_G6_ApNPo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);