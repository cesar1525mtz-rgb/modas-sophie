alter table public.cash_registers
  add column if not exists closed_by uuid references public.users(id),
  add column if not exists closed_at timestamptz,
  add column if not exists counted_cash numeric(12,2),
  add column if not exists expected_cash numeric(12,2),
  add column if not exists difference numeric(12,2),
  add column if not exists notes text;

create index if not exists cash_registers_status_idx
on public.cash_registers(status);

create index if not exists cash_registers_branch_id_idx
on public.cash_registers(branch_id);
