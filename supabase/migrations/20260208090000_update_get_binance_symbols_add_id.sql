create or replace function public.get_binance_symbols()
returns table(
  id bigint,
  symbol varchar,
  icon_url text
)
language sql
stable
as $$
  select
    s.id,
    s.symbol,
    s.icon_url
  from public.exchanges e
  join public.exchange_symbols es on es.exchange_id = e.id
  join public.symbols s on s.id = es.symbol_id
  where lower(e.code) = 'binance' or lower(e.name) = 'binance'
  order by s.id;
$$;
