alter table public.sales
add column if not exists discount numeric not null default 0;

create or replace function public.create_sale_with_items(
  p_branch_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_discount numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_subtotal numeric;
  v_discount numeric;
begin
  v_discount := greatest(coalesce(p_discount, 0), 0);

  v_sale_id := public.create_sale_with_items(
    p_branch_id,
    p_payment_method,
    p_items,
    p_notes
  );

  select total
    into v_subtotal
  from public.sales
  where id = v_sale_id;

  v_discount := least(v_discount, v_subtotal);

  update public.sales
  set
    discount = v_discount,
    total = v_subtotal - v_discount
  where id = v_sale_id;

  return v_sale_id;
end;
$$;
