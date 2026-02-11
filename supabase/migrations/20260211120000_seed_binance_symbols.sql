-- Seed Binance symbols
DO $$
DECLARE
    v_exchange_id bigint;
    v_symbol_id bigint;
    v_exists boolean;
    r record;
BEGIN
    -- 1. Ensure Binance Exchange exists
    SELECT id INTO v_exchange_id FROM public.exchanges WHERE name = 'Binance';
    
    IF v_exchange_id IS NULL THEN
        INSERT INTO public.exchanges (name, code, is_active) 
        VALUES ('Binance', 'binance', true)
        RETURNING id INTO v_exchange_id;
    END IF;

    -- 2. Loop through symbols to insert
    FOR r IN SELECT * FROM (VALUES 
        ('BTC/USDT', 'bitcoin'), 
        ('ETH/USDT', 'ethereum'),
        ('SOL/USDT', 'solana'),
        ('BNB/USDT', 'bnb'),
        ('XRP/USDT', 'xrp'),
        ('DOGE/USDT', 'dogecoin'),
        ('ADA/USDT', 'cardano'),
        ('AVAX/USDT', 'avalanche'),
        ('LINK/USDT', 'chainlink'),
        ('MATIC/USDT', 'polygon'),
        ('DOT/USDT', 'polkadot'),
        ('TRX/USDT', 'tron'),
        ('LTC/USDT', 'litecoin'),
        ('SHIB/USDT', 'shiba-inu'),
        ('UNI/USDT', 'uniswap'),
        ('ATOM/USDT', 'cosmos'),
        ('XLM/USDT', 'stellar'),
        ('OP/USDT', 'optimism'),
        ('ARB/USDT', 'arbitrum'),
        ('NEAR/USDT', 'near-protocol')
    ) AS t(symbol, slug)
    LOOP
        -- Check/Create Symbol
        SELECT id INTO v_symbol_id FROM public.symbols WHERE symbol = r.symbol;
        
        IF v_symbol_id IS NULL THEN
            INSERT INTO public.symbols (symbol, is_active, icon_url)
            VALUES (r.symbol, true, 'https://cryptologos.cc/logos/' || r.slug || '-' || lower(split_part(r.symbol, '/', 1)) || '-logo.svg')
            RETURNING id INTO v_symbol_id;
        END IF;

        -- Check/Create Exchange_Symbol link
        SELECT EXISTS(SELECT 1 FROM public.exchange_symbols WHERE exchange_id = v_exchange_id AND symbol_id = v_symbol_id) INTO v_exists;
        
        IF NOT v_exists THEN
            INSERT INTO public.exchange_symbols (exchange_id, symbol_id, market_type)
            VALUES (v_exchange_id, v_symbol_id, 'spot');
        END IF;
    END LOOP;
END $$;
