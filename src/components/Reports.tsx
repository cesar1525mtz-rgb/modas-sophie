import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from "./PageHeader"

type ReportsProps = {
  userRole: 'admin' | 'vendedor'
  onBack: () => void
}

type Sale = {
  id: string
  total: number
  discount: number
  payment_method: string
  created_at: string
  seller_id: string
}

type Expense = {
  amount: number
  created_at: string
}

type SaleItem = {
  sale_id: string
  variant_id: string
  quantity: number
  subtotal: number
}

type Variant = {
  id: string
  product_id: string
  size?: string | null
  color?: string | null
}

type Product = {
  id: string
  name: string
  cost: number
  category: string | null
}

type InventoryRow = {
  variant_id: string
  quantity: number
  min_stock: number
}

export default function Reports({ userRole, onBack }: ReportsProps) {
  void userRole

  const [period, setPeriod] = useState<'hoy' | 'mes' | 'todo'>('mes')
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadReports()

    const handleDataUpdated = () => {
      loadReports()
    }

    window.addEventListener('modas-sophie-data-updated', handleDataUpdated)

    return () => {
      window.removeEventListener('modas-sophie-data-updated', handleDataUpdated)
    }
  }, [])

  async function loadReports() {
    setLoading(true)
    setMessage('')

    const [
      salesResult,
      expensesResult,
      itemsResult,
      variantsResult,
      productsResult,
      inventoryResult,
    ] = await Promise.all([
      supabase
        .from('sales')
        .select('id,total,discount,payment_method,created_at,seller_id')
        .order('created_at', { ascending: false }),

      supabase
        .from('expenses')
        .select('amount,created_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('sale_items')
        .select('sale_id,variant_id,quantity,subtotal'),

      supabase
        .from('product_variants')
        .select('id,product_id'),

      supabase
        .from('products')
        .select('id,name,cost,category')
        .eq('active', true),

      supabase
        .from('inventory')
        .select('variant_id,quantity,min_stock'),
    ])

    const error =
      salesResult.error ||
      expensesResult.error ||
      itemsResult.error ||
      variantsResult.error ||
      productsResult.error ||
      inventoryResult.error

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setSales((salesResult.data || []) as Sale[])
    setExpenses((expensesResult.data || []) as Expense[])
    setSaleItems((itemsResult.data || []) as SaleItem[])
    setVariants((variantsResult.data || []) as Variant[])
    setProducts((productsResult.data || []) as Product[])
    setInventory((inventoryResult.data || []) as InventoryRow[])
    setLoading(false)
  }

  const filteredSales = useMemo(() => {
    if (period === 'todo') return sales

    const now = new Date()

    return sales.filter((sale) => {
      const date = new Date(sale.created_at)

      if (period === 'hoy') {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        )
      }

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      )
    })
  }, [sales, period])

  const filteredExpenses = useMemo(() => {
    if (period === 'todo') return expenses

    const now = new Date()

    return expenses.filter((expense) => {
      const date = new Date(expense.created_at)

      if (period === 'hoy') {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        )
      }

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      )
    })
  }, [expenses, period])

  const totalVentas = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total),
    0,
  )

  const totalGastos = filteredExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  )

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  const variantMap = useMemo(
    () => new Map(variants.map((variant) => [variant.id, variant])),
    [variants],
  )

  const filteredSaleIds = new Set(filteredSales.map((sale) => sale.id))

  const costoProductosVendidos = saleItems
    .filter((item) => filteredSaleIds.has(item.sale_id))
    .reduce((sum, item) => {
      const variant = variantMap.get(item.variant_id)
      const product = variant ? productMap.get(variant.product_id) : undefined

      return sum + Number(item.quantity) * Number(product?.cost || 0)
    }, 0)

  const utilidad = totalVentas - costoProductosVendidos - totalGastos

  const efectivo = filteredSales
    .filter((sale) => sale.payment_method === 'efectivo')
    .reduce((sum, sale) => sum + Number(sale.total), 0)

  const tarjeta = filteredSales
    .filter((sale) => sale.payment_method === 'tarjeta')
    .reduce((sum, sale) => sum + Number(sale.total), 0)

  const transferencia = filteredSales
    .filter((sale) => sale.payment_method === 'transferencia')
    .reduce((sum, sale) => sum + Number(sale.total), 0)

  const otros = filteredSales
    .filter(
      (sale) =>
        !['efectivo', 'tarjeta', 'transferencia'].includes(
          sale.payment_method
        )
    )
    .reduce((sum, sale) => sum + Number(sale.total), 0)

  const totalDescuentos = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.discount || 0),
    0
  )

  const stockBajoItems = inventory.filter(
    (item) => Number(item.quantity) <= Number(item.min_stock),
  )

  const stockBajo = stockBajoItems.length

  const periodLabel =
    period === 'hoy'
      ? 'Hoy'
      : period === 'mes'
        ? 'Este mes'
        : 'Todo el historial'

  return (
    <main className="inventory-page">
      <PageHeader
        title="Reportes"
        subtitle="Resultados y resumen del negocio."
        onBack={onBack}
      />

      <section className="inventory-list-card">
        <div className="section-title">
          <span>📊</span>
          <div>
            <h2>Resumen del negocio</h2>
            <p>Consulta ventas, gastos y utilidad.</p>
          </div>
        </div>

        <div className="inventory-form-grid">
          <label>
            Periodo
            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as 'hoy' | 'mes' | 'todo')
              }
            >
              <option value="hoy">Hoy</option>
              <option value="mes">Este mes</option>
              <option value="todo">Todo el historial</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="inventory-empty">Cargando reportes...</div>
        ) : (
          <>
            <div className="dashboard-stats">
              <article className="stat-card">
                <span>💰</span>
                <small>Ventas</small>
                <strong>${totalVentas.toFixed(2)}</strong>
              </article>

              <article className="stat-card">
                <span>🧾</span>
                <small>Gastos</small>
                <strong>${totalGastos.toFixed(2)}</strong>
              </article>

              <article className="stat-card">
                <span>📦</span>
                <small>Costo vendido</small>
                <strong>${costoProductosVendidos.toFixed(2)}</strong>
              </article>

              <article className="stat-card">
                <span>📈</span>
                <small>Utilidad</small>
                <strong>${utilidad.toFixed(2)}</strong>
              </article>

        <article className="stat-card">
          <span>💰</span>
          <small>Otros</small>
          <strong>${otros.toFixed(2)}</strong>
        </article>

        <article className="stat-card">
          <span>🏷️</span>
          <small>Descuentos</small>
          <strong>${totalDescuentos.toFixed(2)}</strong>
        </article>
            </div>

            <div className="sale-detail-summary">
              <span>
                <strong>Periodo:</strong> {periodLabel}
              </span>
              <span>
                <strong>Ventas:</strong> {filteredSales.length}
              </span>
              <span>
                <strong>Productos con stock bajo:</strong> {stockBajo}
              </span>
            </div>

      {stockBajoItems.length > 0 && (
        <div className="sale-detail-summary" style={{ marginTop: 14 }}>
          <span style={{ display: "block", marginBottom: 8 }}>
            <strong>⚠️ Productos con stock bajo</strong>
          </span>
          {stockBajoItems.map((item) => {
            const variant = variantMap.get(item.variant_id)
            const product = variant ? productMap.get(variant.product_id) : undefined

            return (
              <div
                key={item.variant_id}
                style={{
                  padding: "10px 0",
                  borderTop: "1px solid #eadde5",
                }}
              >
                <strong>{product?.name || "Producto"}</strong>
                <div>
                  {variant?.size || "Sin talla"} · {variant?.color || "Sin color"}
                </div>
                <div>
                  Existencias: <strong>{Number(item.quantity)}</strong>
                  {" · "}
                  Mínimo: {Number(item.min_stock)}
                </div>
              </div>
            )
          })}
        </div>
      )}

            <div className="sale-detail-summary">
              <span>
                💵 <strong>Efectivo:</strong> ${efectivo.toFixed(2)}
              </span>
              <span>
                💳 <strong>Tarjeta:</strong> ${tarjeta.toFixed(2)}
              </span>
              <span>
                📲 <strong>Transferencia:</strong> ${transferencia.toFixed(2)}
              </span>
            </div>
          </>
        )}

        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  )
}
