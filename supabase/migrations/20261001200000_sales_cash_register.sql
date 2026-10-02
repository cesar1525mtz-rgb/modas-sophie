create or replace function public.create_sale_with_items(
  p_branch_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_cash_register_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_register_branch_id uuid;
  v_register_status text;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  select branch_id, status
  into v_register_branch_id, v_register_status
  from public.cash_registers
  where id = p_cash_register_id
  for update;

  if v_register_branch_id is null then
    raise exception 'La caja no existe';
  end if;

  if v_register_branch_id <> p_branch_id then
    raise exception 'La caja no pertenece a esta sucursal';
  end if;

  if v_register_status <> 'open' then
    raise exception 'La caja está cerrada';
  end if;

  v_sale_id := public.create_sale_with_items(
    p_branch_id,
    p_payment_method,
    p_items,
    p_notes
  );

  update public.sales
  set cash_register_id = p_cash_register_id
  where id = v_sale_id;

  return v_sale_id;
end;
$$;
