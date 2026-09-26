-- Limpieza inicial de todas las ventas de prueba.
-- Todas las ventas actuales son pruebas y ninguna es una venta real.

create temp table ventas_a_limpiar on commit drop as
select
  id,
  branch_id
from public.sales;

create temp table partidas_a_restaurar on commit drop as
select
  s.branch_id,
  si.variant_id,
  sum(si.quantity)::integer as quantity
from public.sales s
join public.sale_items si on si.sale_id = s.id
group by s.branch_id, si.variant_id;

update public.inventory i
set
  quantity = i.quantity + p.quantity,
  updated_at = now()
from partidas_a_restaurar p
where i.branch_id = p.branch_id
  and i.variant_id = p.variant_id;

delete from public.sale_items si
using ventas_a_limpiar v
where si.sale_id = v.id;

delete from public.sales s
using ventas_a_limpiar v
where s.id = v.id;
