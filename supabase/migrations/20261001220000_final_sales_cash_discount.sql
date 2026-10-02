create or replace function public.create_sale_with_items(
  p_branch_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_discount numeric,
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
  v_subtotal numeric := 0;
  v_discount numeric := greatest(coalesce(p_discount, 0), 0);
  v_item jsonb;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric;
  v_stock integer;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe contener al menos un producto';
  end if;

  if p_payment_method not in ('efectivo','tarjeta','transferencia','otro') then
    raise exception 'Método de pago no válido';
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

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'La cantidad debe ser mayor a cero';
    end if;

    select
      p.price,
      i.quantity
    into
      v_unit_price,
      v_stock
    from public.inventory i
    join public.product_variants pv
      on pv.id = i.variant_id
    join public.products p
      on p.id = pv.product_id
    where i.branch_id = p_branch_id
      and i.variant_id = v_variant_id
      and p.active = true
    for update;

    if not found then
      raise exception 'El producto no existe en esta sucursal';
    end if;

    if v_stock < v_quantity then
      raise exception 'Stock insuficiente';
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  v_discount := least(v_discount, v_subtotal);

  insert into public.sales(
    branch_id,
    seller_id,
    total,
    payment_method,
    discount,
    notes,
    cash_register_id
  )
  values(
    p_branch_id,
    auth.uid(),
    v_subtotal - v_discount,
    p_payment_method::public.payment_method,
    v_discount,
    nullif(trim(p_notes), ''),
    p_cash_register_id
  )
  returning id into v_sale_id;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    select p.price
    into v_unit_price
    from public.inventory i
    join public.product_variants pv
      on pv.id = i.variant_id
    join public.products p
      on p.id = pv.product_id
    where i.branch_id = p_branch_id
      and i.variant_id = v_variant_id
      and p.active = true;

    insert into public.sale_items(
      sale_id,
      variant_id,
      quantity,
      unit_price
    )
    values(
      v_sale_id,
      v_variant_id,
      v_quantity,
      v_unit_price
    );

    update public.inventory
    set
      quantity = quantity - v_quantity,
      updated_at = now()
    where branch_id = p_branch_id
      and variant_id = v_variant_id;
  end loop;

  return v_sale_id;
end;
$$;
