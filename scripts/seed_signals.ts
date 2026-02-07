
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing env vars.");
    process.exit(1);
}

const supabase = createClient(url, key);

// Using the KOL ID we found: 67a1af04-34fd-4c35-978d-65c1265217eb (飞扬)
const KOL_ID = "67a1af04-34fd-4c35-978d-65c1265217eb"; 

async function seed() {
    console.log("Seeding mock signals...");

    const now = new Date(); 
    // Adjust logic to be safe with timezone, use UTC ISO strings
    
    // Active Signal 1: LONG @ 68800 (Very close to current price)
    // Time: 30 mins ago
    const time1 = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    
    // Active Signal 2: SHORT @ 69500
    // Time: 2 hours ago
    const time2 = new Date(now.getTime() - 120 * 60 * 1000).toISOString();

    // Closed Signal 1: LONG @ 67000 -> Closed @ 68000
    // Time: 1 day ago
    const time3Open = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const time3Close = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();

    const mockData = [
        {
            kol_id: KOL_ID,
            symbol: "BTC/USDT",
            direction: "long",
            leverage: 10,
            margin_mode: "cross",
            entry_price: 68800,
            status: "active",
            entry_time: time1,
            take_profit: 72000,
            stop_loss: 67000
        },
        {
            kol_id: KOL_ID,
            symbol: "BTC/USDT",
            direction: "short",
            leverage: 20,
            margin_mode: "isolated",
            entry_price: 69500,
            status: "active",
            entry_time: time2,
            take_profit: 65000,
            stop_loss: 70000
        },
        {
            kol_id: KOL_ID,
            symbol: "BTC/USDT",
            direction: "long",
            leverage: 5,
            margin_mode: "cross",
            entry_price: 67000,
            exit_price: 68000,
            status: "closed",
            entry_time: time3Open,
            exit_time: time3Close,
            pnl_percentage: 15.5,
            exit_type: 'take_profit'
        }
    ];

    const { error } = await supabase.from('signals').insert(mockData);
    if (error) {
        console.error("Error inserting signals:", error);
    } else {
        console.log("Success! Inserted 3 mock signals for BTC/USDT.");
    }
}

seed();
