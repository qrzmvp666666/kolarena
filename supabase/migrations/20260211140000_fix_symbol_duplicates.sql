
DO $$
DECLARE
    r record;
    v_clean_symbol text;
    v_existing_id bigint;
BEGIN
    -- 1. Identify symbols with '/'
    FOR r IN SELECT id, symbol FROM public.symbols WHERE symbol LIKE '%/%'
    LOOP
        v_clean_symbol := replace(r.symbol, '/', '');
        
        -- Check if the clean version already exists (e.g., 'BTC/USDT' -> 'BTCUSDT' exists?)
        SELECT id INTO v_existing_id FROM public.symbols WHERE symbol = v_clean_symbol;
        
        IF v_existing_id IS NOT NULL THEN
            -- DUPLICATE CASE: 'BTC/USDT' exists, and 'BTCUSDT' also exists.
            -- We want to keep 'BTCUSDT' and delete 'BTC/USDT'.
            
            -- Remove reference from exchange_symbols for the SLASH version
            DELETE FROM public.exchange_symbols WHERE symbol_id = r.id;
            
            -- Remove from symbols table
            DELETE FROM public.symbols WHERE id = r.id;
            
            RAISE NOTICE 'Deleted duplicate symbol: % (kept %)', r.symbol, v_clean_symbol;
        ELSE
            -- RENAME CASE: 'ADA/USDT' exists, but 'ADAUSDT' does not.
            -- We just rename it to 'ADAUSDT'.
            
            UPDATE public.symbols 
            SET symbol = v_clean_symbol 
            WHERE id = r.id;
            
            RAISE NOTICE 'Renamed symbol: % -> %', r.symbol, v_clean_symbol;
        END IF;
    END LOOP;
END $$;
