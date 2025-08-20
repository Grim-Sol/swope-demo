import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hbobhnosfrqshvcboves.supabase.co';         // <-- colle ton Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhib2Jobm9zZnJxc2h2Y2JvdmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjQxODAsImV4cCI6MjA3MTE0MDE4MH0.i0Zp7mKxR3mxJMrxEZpnm6XCFJkQU8Lb19APH0RF0bg'; // <-- colle ta anon public key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
