create or replace function public.create_sale_with_items(p_branch_id uuid, p_payment_method text, p_items jsonb, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric;
  v_stock integer;
  v_branch_active boolean;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe contener al menos un producto';
  end if;

  select active
  into v_branch_active
  from public.branches
  where id = p_branch_id;

  if coalesce(v_branch_active, false) = false then
    raise exception 'La sucursal no existe o está inactiva';
  end if;

  if p_payment_method not in ('efectivo','tarjeta','transferencia','otro') then
    raise exception 'Método de pago no válido';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'La cantidad debe ser mayor a cero';
    end if;

    select i.quantity, p.price
    into v_stock, v_unit_price
    from public.inventory i
    join public.product_variants pv on pv.id = i.variant_id
    join public.products p on p.id = pv.product_id
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

    v_total := v_total + (v_unit_price * v_quantity);
  end loop;

  insert into public.sales(
    branch_id,
    seller_id,
    total,
    payment_method,
    notes
  )
  values(
    p_branch_id,
    auth.uid(),
    v_total,
    p_payment_method::public.payment_method,
    nullif(trim(p_notes),'')
  )
  returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    select p.price
    into v_unit_price
    from public.inventory i
    join public.product_variants pv on pv.id = i.variant_id
    join public.products p on p.id = pv.product_id
    where i.branch_id = p_branch_id
      and i.variant_id = v_variant_id;

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
    set quantity = quantity - v_quantity,
        updated_at = now()
    where branch_id = p_branch_id
      and variant_id = v_variant_id;
  end loop;

  return v_sale_id;
end;
$$;
