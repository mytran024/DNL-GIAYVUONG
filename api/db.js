import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
    }
}

// Ensure URL is valid before creating client to avoid crash
const options = {
    auth: {
        persistSession: false
    }
};

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey, options)
    : null;

export default supabase;
