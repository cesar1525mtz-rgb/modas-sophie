import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../App.css'
import PageHeader from "./PageHeader"

type Role = 'admin' | 'vendedor'

type SalesProps = {
  userRole: Role
  onBack: () => void
}

type Sale = {
  id: string
  folio: number
  branch_id: string
  seller_id: string
  total: number
  discount: number
  payment_method: string
  notes: string | null
  created_at: string
}

type Branch = {
  id: string
  name: string
}

type Profile = {
  id: string
  username: string
  full_name: string
}

type SaleItem = {
  id: string
  sale_id: string
  variant_id: string
  quantity: number
  unit_price: number
  subtotal: number
}

type Variant = {
  id: string
  product_id: string
  size: string | null
  color: string | null
}

type Product = {
  id: string
  name: string
  sku: string | null
}

export default function Sales({ userRole, onBack }: SalesProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('Todos')
  const [selectedSaleId, setSelectedSaleId] = useState('')
  const [items, setItems] = useState<SaleItem[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState('')

  async function loadSales() {
    setLoading(true)
    setError('')

    const [
      { data: salesData, error: salesError },
      { data: branchData, error: branchError },
      { data: profileData, error: profileError },
    ] = await Promise.all([
      supabase
        .from('sales')
        .select('id,folio,branch_id,seller_id,total,discount,payment_method,notes,created_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('branches')
        .select('id,name')
        .eq('active', true)
        .order('name'),

      supabase
        .from('profiles')
        .select('id,username,full_name')
        .order('full_name'),
    ])

    if (salesError || branchError || profileError) {
      setError(
        salesError?.message ||
          branchError?.message ||
          profileError?.message ||
          'No fue posible cargar las ventas.',
      )
    } else {
      setSales((salesData || []) as Sale[])
      setBranches((branchData || []) as Branch[])
      setProfiles((profileData || []) as Profile[])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadSales()

    const handleDataUpdated = () => {
      loadSales()
    }

    window.addEventListener('modas-sophie-data-updated', handleDataUpdated)

    return () => {
      window.removeEventListener('modas-sophie-data-updated', handleDataUpdated)
    }
  }, [])

  async function openSale(saleId: string) {
    setSelectedSaleId(saleId)
    setLoadingItems(true)
    setError('')

    const { data, error: itemsError } = await supabase
      .from('sale_items')
      .select('id,sale_id,variant_id,quantity,unit_price,subtotal')
      .eq('sale_id', saleId)
      .order('id')

    if (itemsError) {
      setError(itemsError.message)
      setLoadingItems(false)
      return
    }

    const saleItems = (data || []) as SaleItem[]
    setItems(saleItems)

    const variantIds = [...new Set(saleItems.map((item) => item.variant_id))]

    if (variantIds.length === 0) {
      setVariants([])
      setProducts([])
      setLoadingItems(false)
      return
    }

    const { data: variantData, error: variantError } = await supabase
      .from('product_variants')
      .select('id,product_id,size,color')
      .in('id', variantIds)

    if (variantError) {
      setError(variantError.message)
      setLoadingItems(false)
      return
    }

    const saleVariants = (variantData || []) as Variant[]
    setVariants(saleVariants)

    const productIds = [...new Set(saleVariants.map((variant) => variant.product_id))]

    if (productIds.length > 0) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id,name,sku')
        .in('id', productIds)

      if (productError) {
        setError(productError.message)
      } else {
        setProducts((productData || []) as Product[])
      }
    }

    setLoadingItems(false)
  }

  function closeDetails() {
    setSelectedSaleId('')
    setItems([])
    setVariants([])
    setProducts([])
  }

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase()

    return sales.filter((sale) => {
      const seller = profiles.find((profile) => profile.id === sale.seller_id)

      const matchesSearch =
        !term ||
        sale.id.toLowerCase().includes(term) ||
        seller?.username?.toLowerCase().includes(term) ||
        seller?.full_name?.toLowerCase().includes(term)

      const matchesPayment =
        paymentFilter === 'Todos' ||
        sale.payment_method === paymentFilter

      return matchesSearch && matchesPayment
    })
  }, [sales, profiles, search, paymentFilter])

  const selectedSale = sales.find((sale) => sale.id === selectedSaleId)

  const visibleTotal = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total),
    0,
  )

  function getBranchName(branchId: string) {
    return branches.find((branch) => branch.id === branchId)?.name || 'Sucursal'
  }

  function getSellerName(sellerId: string) {
    const profile = profiles.find((item) => item.id === sellerId)

    return profile?.full_name || profile?.username || 'Vendedor'
  }

  function getPaymentName(payment: string) {
    if (payment === 'efectivo') return '💵 Efectivo'
    if (payment === 'tarjeta') return '💳 Tarjeta'
    if (payment === 'transferencia') return '📱 Transferencia'
    return 'Otro'
  }

  function getProductName(variantId: string) {
    const variant = variants.find((item) => item.id === variantId)

    if (!variant) {
      return {
        name: 'Producto',
        detail: '',
      }
    }

    const product = products.find((item) => item.id === variant.product_id)

    return {
      name: product?.name || 'Producto',
      detail: [
        product?.sku ? `SKU: ${product.sku}` : '',
        variant.size ? `Talla: ${variant.size}` : '',
        variant.color ? `Color: ${variant.color}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    }
  }

  if (loading) {
    return (
      <main className="inventory-page">
        <section className="inventory-list-card">
          <strong>Cargando ventas...</strong>
        </section>
      </main>
    )
  }

  return (
    <main className="inventory-page">
      <PageHeader
        title="Ventas"
        subtitle={
          userRole === "admin"
            ? "Consulta todas las ventas registradas."
            : "Consulta tus ventas registradas."
        }
        onBack={onBack}
      />

      {error && <div className="inventory-message error">{error}</div>}

      <section className="inventory-list-card">
        <div className="section-title">
          <span>🧾</span>

          <div>
            <h2>Historial de ventas</h2>
            <p>
              {filteredSales.length} venta(s) · Total visible:{' '}
              <strong>${visibleTotal.toFixed(2)}</strong>
            </p>
          </div>
        </div>

        <div className="sales-filters">
          <label className="sales-filter-field">
            <span>Buscar</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Folio o vendedor"
            />
          </label>

          <label className="sales-filter-field">
            <span>Método de pago</span>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
            >
              <option value="Todos">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
          </label>
        </div>

        {filteredSales.length === 0 ? (
          <div className="inventory-empty">
            No hay ventas que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="sales-list">
            {filteredSales.map((sale) => (
              <article className="sale-history-card" key={sale.id}>
                <div className="sale-history-main">
                  <strong>Folio: {`F${String(sale.folio).padStart(4, '0')}`}</strong>

                  <small>
                    {new Date(sale.created_at).toLocaleString('es-MX')}
                  </small>

                  <span>
                    {getSellerName(sale.seller_id)} ·{' '}
                    {getBranchName(sale.branch_id)}
                  </span>

                  <span>{getPaymentName(sale.payment_method)}</span>
                </div>

                <div className="sale-history-total">
                  <strong>${Number(sale.total).toFixed(2)}</strong>

                  <button
                    type="button"
                    className="primary-button sales-detail-button"
                    onClick={(event) => {
                      event.currentTarget.blur()

                      if (selectedSaleId === sale.id) {
                        closeDetails()
                      } else {
                        openSale(sale.id)
                      }
                    }}
                  >
                    {selectedSaleId === sale.id ? 'Ocultar detalle' : 'Ver detalle'}
                  </button>
            {selectedSale && selectedSale!.id === sale.id && (
              <section className="inventory-list-card sale-detail-card">
                <div className="section-title">
                  <span>🔎</span>
                  <div>
                    <h2>Detalle de venta</h2>
                    <p>
                      Folio completo:{' '}
                      <strong>
                        {`F${String(selectedSale!.folio).padStart(4, '0')}`}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="sale-detail-summary">
                  <span>
                    <strong>Fecha:</strong>{' '}
                    {new Date(selectedSale!.created_at).toLocaleString('es-MX')}
                  </span>

                  <span>
                    <strong>Vendedor:</strong>{' '}
                    {getSellerName(selectedSale!.seller_id)}
                  </span>

                  {userRole === 'admin' && (
                    <span>
                      <strong>Sucursal:</strong>{' '}
                      {getBranchName(selectedSale!.branch_id)}
                    </span>
                  )}

                  <span>
                    <strong>Pago:</strong>{' '}
                    {getPaymentName(selectedSale!.payment_method)}
                  </span>
                </div>

                {loadingItems ? (
                  <div className="inventory-empty">
                    Cargando productos...
                  </div>
                ) : (
                  <div className="sale-detail-items">
                    {items.map((item) => {
                      const product = getProductName(item.variant_id)

                      return (
                        <article
                          className="sale-detail-item"
                          key={item.id}
                        >
                          <div className="sale-detail-product">
                            <strong>{product.name}</strong>
                            <small>{product.detail}</small>
                          </div>

                          <div className="sale-detail-line">
                            <span className="sale-detail-quantity">
                              Cantidad: {item.quantity}
                            </span>

                            <span className="sale-detail-price">
                              Precio: ${Number(item.unit_price).toFixed(2)}
                            </span>

                            <strong className="sale-detail-subtotal">
                              Subtotal: ${Number(item.subtotal).toFixed(2)}
                            </strong>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}

                {(() => {
              const subtotalDetalle = items.reduce(
                (sum, item) => sum + Number(item.subtotal || 0),
                0
              )

              const totalVenta = Number(selectedSale!.total || 0)
              const descuento = subtotalDetalle - totalVenta

              return descuento > 0.009 ? (
                <div
                  className="sale-detail-total"
                  style={{
                    borderTop: '1px solid #ddd',
                    marginTop: 12,
                    paddingTop: 12,
                  }}
                >
                  <span>Descuento</span>
                  <strong>-${descuento.toFixed(2)}</strong>
                </div>
              ) : null
            })()}

            <div className="sale-detail-total">
              <span>Total</span>
              <strong>
                ${Number(selectedSale!.total).toFixed(2)}
              </strong>
            </div>
              </section>
            )}

                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {false && selectedSale && (
        <section className="inventory-list-card sale-detail-card">
          <div className="section-title">
            <span>🔎</span>

            <div>
              <h2>Detalle de venta</h2>
              <p>
                Folio completo: <strong>{`F${String(selectedSale!.folio).padStart(4, '0')}`}</strong>
              </p>
            </div>
          </div>

          <div className="sale-detail-summary">
            <span>
              <strong>Fecha:</strong>{' '}
              {new Date(selectedSale!.created_at).toLocaleString('es-MX')}
            </span>

            <span>
              <strong>Vendedor:</strong>{' '}
              {getSellerName(selectedSale!.seller_id)}
            </span>

            {userRole === 'admin' && (
              <span>
                <strong>Sucursal:</strong>{' '}
                {getBranchName(selectedSale!.branch_id)}
              </span>
            )}

            <span>
              <strong>Pago:</strong>{' '}
              {getPaymentName(selectedSale!.payment_method)}
            </span>
          </div>

          {loadingItems ? (
            <div className="inventory-empty">Cargando productos...</div>
          ) : (
            <div className="sale-detail-items">
              {items.map((item) => {
                const product = getProductName(item.variant_id)

                return (
                  <article className="sale-detail-item" key={item.id}>
  <div className="sale-detail-product">
    <strong>{product.name}</strong>
    <small>{product.detail}</small>
  </div>

  <div className="sale-detail-line">
    <span className="sale-detail-quantity">
      Cantidad: {item.quantity}
    </span>
    <span className="sale-detail-price">
      Precio: ${Number(item.unit_price).toFixed(2)}
    </span>
    <strong className="sale-detail-subtotal">
      Subtotal: ${Number(item.subtotal).toFixed(2)}
    </strong>
  </div>
</article>
                )
              })}
            </div>
          )}

          {(() => {
            const subtotalDetalle = items.reduce(
              (sum, item) => sum + Number(item.subtotal || 0),
              0
            )
            const descuentoCalculado =
              subtotalDetalle - Number(selectedSale!.total || 0)

            return descuentoCalculado > 0.009 ? (
              <div
                className="sale-detail-total"
                style={{
                  borderTop: '1px solid #ddd',
                  marginTop: 12,
                  paddingTop: 12,
                }}
              >
                <span>Descuento</span>
                <strong>-${descuentoCalculado.toFixed(2)}</strong>
              </div>
            ) : null
          })()}

          <div className="sale-detail-total">
            <span>Total</span>
            <strong>${Number(selectedSale!.total).toFixed(2)}</strong>
          </div>

          <button type="button" className="back-button" onClick={closeDetails}>
            Cerrar detalle
          </button>
        </section>
      )}
    </main>
  )
}
