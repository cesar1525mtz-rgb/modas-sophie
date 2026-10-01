create table if not exists public.cash_registers (
  id uuid primary key default gen_random_uuid(),

  branch_id uuid not null
    references public.branches(id),

  opened_by uuid not null
    references public.profiles(id),

  opening_cash numeric(12,2) not null default 0
    check (opening_cash >= 0),

  opened_at timestamptz not null default now(),

  status text not null default 'open'
    check (status in ('open', 'closed')),

  closed_by uuid
    references public.profiles(id),

  closing_cash numeric(12,2)
    check (closing_cash is null or closing_cash >= 0),

  expected_cash numeric(12,2),

  difference numeric(12,2),

  closed_at timestamptz,

  notes text
);

create unique index if not exists one_open_cash_register_per_branch
on public.cash_registers(branch_id)
where status = 'open';

alter table public.sales
add column if not exists cash_register_id uuid
references public.cash_registers(id);

alter table public.expenses
add column if not exists cash_register_id uuid
references public.cash_registers(id);

create index if not exists sales_cash_register_id_idx
on public.sales(cash_register_id);

create index if not exists expenses_cash_register_id_idx
on public.expenses(cash_register_id);

alter table public.cash_registers enable row level security;

drop policy if exists authenticated_read_cash_registers
on public.cash_registers;

create policy authenticated_read_cash_registers
on public.cash_registers
for select
to authenticated
using (
  is_admin()
  or opened_by = auth.uid()
  or closed_by = auth.uid()
);

drop policy if exists authenticated_create_cash_registers
on public.cash_registers;

create policy authenticated_create_cash_registers
on public.cash_registers
for insert
to authenticated
with check (
  opened_by = auth.uid()
  or is_admin()
);

drop policy if exists authenticated_update_cash_registers
on public.cash_registers;

create policy authenticated_update_cash_registers
on public.cash_registers
for update
to authenticated
using (
  is_admin()
  or opened_by = auth.uid()
)
with check (
  is_admin()
  or opened_by = auth.uid()
);

