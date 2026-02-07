
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing env vars. Please ensure .env exists and contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(url, key);

async function inspect() {
    console.log("--- Inspecting Tables ---");
    
    // Check 'kols'
    const { data: kols, error: kErr } = await supabase.from('kols').select('*').limit(1);
    if (kErr) console.log("Table 'kols' check failed:", kErr.message);
    else console.log("Table 'kols' exists. Sample:", kols?.[0] || "No rows");

    // Check 'signals'
    const { data: signals, error: sErr } = await supabase.from('signals').select('*').limit(1);
    if (sErr) console.log("Table 'signals' check failed:", sErr.message);
    else console.log("Table 'signals' exists. Sample:", signals?.[0] || "No rows");
    
    // Check joined columns via RPC idea - we can't see RPC code but we can see row keys from Select *
}

inspect();
