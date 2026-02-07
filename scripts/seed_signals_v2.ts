
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing env vars.");
    process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
    console.log("Seeding mock signals with new user...");

    // 1. Create a temporary user to act as KOL
    const email = `mock_${Math.floor(Math.random() * 10000)}@example.com`;
    const password = "password123";
    
    console.log(`Signing up ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });
    
    if (authError) {
        console.error("Sign up failed:", authError.message);
        return;
    }

    const userId = authData.user?.id;
    if (!userId) {
        console.error("No user ID returned. Maybe confirming email is required?");
        return;
    }
    console.log("User created with ID:", userId);

    // 2. Try to insert into 'kols' table for this user
    // We assume 'kols' table uses the same ID as auth.users
    const kolRow = {
        id: userId,
        name: "MockTrader",
        short_name: "Mock",
        icon: "🤖",
        main_coin: "BTC",
        account_value: 50000,
        return_rate: 10,
        total_pnl: 5000,
        win_rate: 50,
        trading_days: 1
    };

    const { error: kolError } = await supabase.from('kols').insert(kolRow);
    if (kolError) {
        console.warn("KOL insert warning:", kolError.message);
        console.warn("Attempting to proceed with signals anyway (maybe KOL entry via trigger?)");
    } else {
        console.log("KOL profile inserted.");
    }

    // 3. Insert Signals
    const now = new Date(); 
    const time1 = new Date(now.getTime() - 20 * 60 * 1000).toISOString(); // 20 mins ago
    const time2 = new Date(now.getTime() - 120 * 60 * 1000).toISOString(); // 2 hours ago
    const time3Open = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const time3Close = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();

    const mockData = [
        {
            kol_id: userId,
            symbol: "BTC/USDT",
            direction: "long",
            leverage: 10,
            margin_mode: "cross",
            entry_price: 68900, // Should be visible near current price
            status: "active",
            entry_time: time1,
            take_profit: 72000,
            stop_loss: 67000
        },
        {
            kol_id: userId,
            symbol: "BTC/USDT",
            direction: "short",
            leverage: 20,
            margin_mode: "isolated",
            entry_price: 69800,
            status: "active",
            entry_time: time2,
            take_profit: 65000,
            stop_loss: 70000
        },
        {
            kol_id: userId,
            symbol: "BTC/USDT",
            direction: "long",
            leverage: 5,
            margin_mode: "cross",
            entry_price: 67000,
            exit_price: 68500,
            status: "closed",
            entry_time: time3Open,
            exit_time: time3Close,
            pnl_percentage: 15.5,
            exit_type: 'take_profit'
        }
    ];

    const { error: sigError } = await supabase.from('signals').insert(mockData);
    if (sigError) {
        console.error("Signal insert failed:", sigError);
    } else {
        console.log("Success! Inserted 3 mock signals.");
    }
}

seed();
