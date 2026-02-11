-- 1. Update get_binance_symbols to return market_type
DROP FUNCTION IF EXISTS public.get_binance_symbols();

CREATE OR REPLACE FUNCTION public.get_binance_symbols()
RETURNS TABLE(
  id bigint,
  symbol varchar,
  icon_url text,
  market_type public.market_type
)
LANGUAGE sql
STABLE
AS $$
  select
    s.id,
    s.symbol,
    s.icon_url,
    es.market_type
  from public.exchanges e
  join public.exchange_symbols es on es.exchange_id = e.id
  join public.symbols s on s.id = es.symbol_id
  where lower(e.code) = 'binance' or lower(e.name) = 'binance'
  order by s.id;
$$;

-- 2. Switch all 'spot' to 'futures' in exchange_symbols for Binance
DO $$
DECLARE
    v_exchange_id bigint;
BEGIN
    SELECT id INTO v_exchange_id FROM public.exchanges WHERE name = 'Binance';
    
    -- Update existing records from spot to futures
    UPDATE public.exchange_symbols
    SET market_type = 'futures'
    WHERE exchange_id = v_exchange_id AND market_type = 'spot';

END $$;
