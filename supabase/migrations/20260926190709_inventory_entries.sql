create table if not exists public.inventory_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  variant_id uuid not null references public.product_variants(id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric not null check (unit_cost >= 0),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_entries_branch_idx
  on public.inventory_entries(branch_id);

create index if not exists inventory_entries_variant_idx
  on public.inventory_entries(variant_id);

create index if not exists inventory_entries_created_at_idx
  on public.inventory_entries(created_at desc);

alter table public.inventory_entries enable row level security;

drop policy if exists admins_read_inventory_entries
  on public.inventory_entries;

create policy admins_read_inventory_entries
on public.inventory_entries
for select
to authenticated
using (public.is_admin());

create or replace function public.add_inventory_entry(
  p_branch_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_unit_cost numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_cost numeric;
  v_product_id uuid;
  v_branch_active boolean;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not public.is_admin() then
    raise exception 'Solo un administrador puede registrar entradas de mercancía';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  select active
  into v_branch_active
  from public.branches
  where id = p_branch_id;

  if coalesce(v_branch_active, false) = false then
    raise exception 'La sucursal no existe o está inactiva';
  end if;

  select pv.product_id, p.cost
  into v_product_id, v_cost
  from public.product_variants pv
  join public.products p on p.id = pv.product_id
  where pv.id = p_variant_id
    and p.active = true;

  if not found then
    raise exception 'La variante no existe o el producto está inactivo';
  end if;

  if p_unit_cost is not null then
    if p_unit_cost < 0 then
      raise exception 'El costo no puede ser negativo';
    end if;

    v_cost := p_unit_cost;
  end if;

  insert into public.inventory_entries(
    branch_id,
    variant_id,
    quantity,
    unit_cost,
    notes,
    created_by
  )
  values(
    p_branch_id,
    p_variant_id,
    p_quantity,
    coalesce(v_cost, 0),
    nullif(trim(p_notes), ''),
    auth.uid()
  )
  returning id into v_entry_id;

  insert into public.inventory(
    branch_id,
    variant_id,
    quantity,
    min_stock,
    updated_at
  )
  values(
    p_branch_id,
    p_variant_id,
    p_quantity,
    0,
    now()
  )
  on conflict (branch_id, variant_id)
  do update set
    quantity = public.inventory.quantity + excluded.quantity,
    updated_at = now();

  return v_entry_id;
end;
$$;

revoke all on function public.add_inventory_entry(uuid, uuid, integer, numeric, text)
from public;

grant execute on function public.add_inventory_entry(uuid, uuid, integer, numeric, text)
to authenticated;
