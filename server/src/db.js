const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
    // We might want to throw error or exit, but for now let it fail gracefully or user notices.
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false // Server-side usage
    }
});

module.exports = supabase;
