import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Role = 'admin' | 'vendedor'

type NewSaleProps = {
  userId: string
  userRole: Role
  onBack: () => void
}

type Branch = {
  id: string
  name: string
}

type Product = {
  id: string
  name: string
  sku: string | null
  category: string | null
  price: number
  active: boolean
}

type Variant = {
  id: string
  product_id: string
  size: string | null
  color: string | null
  barcode: string | null
}

type Stock = {
  branch_id: string
  variant_id: string
  quantity: number
}

type CartItem = {
  variantId: string
  productName: string
  sku: string
  size: string
  color: string
  unitPrice: number
  quantity: number
  available: number
}

const categories = [
  'Todas',
  'Ropa para dama',
  'Ropa para caballero',
  'PANTALÓN DAMA',
  'Bolsas y mochilas',
  'Accesorios',
  'Regalos',
  'Calzado',
  'Otros',
]

export default function NewSale({ userId, onBack }: NewSaleProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [stock, setStock] = useState<Stock[]>([])

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<
    'efectivo' | 'tarjeta' | 'transferencia'
  >('efectivo')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    const [
      { data: branchData, error: branchError },
      { data: productData, error: productError },
      { data: variantData, error: variantError },
      { data: stockData, error: stockError },
    ] = await Promise.all([
      supabase
        .from('branches')
        .select('id,name')
        .eq('active', true)
        .order('name'),
      supabase
        .from('products')
        .select('id,name,sku,category,price,active')
        .eq('active', true)
        .order('name'),
      supabase
        .from('product_variants')
        .select('id,product_id,size,color,barcode')
        .order('created_at'),
      supabase
        .from('inventory')
        .select('branch_id,variant_id,quantity'),
    ])

    if (branchError || productError || variantError || stockError) {
      setError(
        branchError?.message ||
          productError?.message ||
          variantError?.message ||
          stockError?.message ||
          'No fue posible cargar los productos.'
      )
    } else {
      const safeBranches = (branchData || []) as Branch[]
      setBranches(safeBranches)
      setProducts((productData || []) as Product[])
      setVariants((variantData || []) as Variant[])
      setStock((stockData || []) as Stock[])

      if (!branchId && safeBranches.length > 0) {
        setBranchId(safeBranches[0].id)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesCategory =
        category === 'Todas' || product.category === category

      const name = (product.name || '').toLowerCase()
      const sku = (product.sku || '').toLowerCase()

      const matchesSearch =
        !term ||
        name.includes(term) ||
        sku.includes(term)

      return matchesCategory && matchesSearch
    })
  }, [products, search, category])

  const availableVariants = useMemo(() => {
    if (!selectedVariantId) return []

    return variants
      .filter((variant) => variant.id === selectedVariantId)
      .map((variant) => {
        const product = products.find(
          (item) => item.id === variant.product_id
        )

        const inventory = stock.find(
          (item) =>
            item.branch_id === branchId &&
            item.variant_id === variant.id
        )

        return {
          variant,
          product,
          available: inventory?.quantity || 0,
        }
      })
  }, [selectedVariantId, variants, products, stock, branchId])

  const selectedData = availableVariants[0]

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      ),
    [cart]
  )

  function addToCart() {
    setError('')
    setMessage('')

    if (!selectedData?.product) {
      setError('Selecciona un producto.')
      return
    }

    const requested = Number(quantity)

    if (!Number.isInteger(requested) || requested <= 0) {
      setError('La cantidad debe ser mayor a cero.')
      return
    }

    if (selectedData.available < requested) {
      setError(
        `Existencia insuficiente. Disponible: ${selectedData.available}.`
      )
      return
    }

    const variant = selectedData.variant
    const product = selectedData.product

    setCart((current) => {
      const existing = current.find(
        (item) => item.variantId === variant.id
      )

      if (existing) {
        const newQuantity = existing.quantity + requested

        if (newQuantity > selectedData.available) {
          setError(
            `No puedes agregar más de ${selectedData.available} piezas.`
          )
          return current
        }

        return current.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: newQuantity }
            : item
        )
      }

      return [
        ...current,
        {
          variantId: variant.id,
          productName: product.name,
          sku: product.sku || '',
          size: variant.size || 'Sin talla',
          color: variant.color || 'Sin color',
          unitPrice: Number(product.price),
          quantity: requested,
          available: selectedData.available,
        },
      ]
    })

    setQuantity('1')
    setSelectedVariantId('')
  }

  function removeFromCart(variantId: string) {
    setCart((current) =>
      current.filter((item) => item.variantId !== variantId)
    )
  }

  function changeCartQuantity(variantId: string, value: number) {
    setCart((current) =>
      current.map((item) => {
        if (item.variantId !== variantId) return item

        const newQuantity = Math.max(
          1,
          Math.min(value, item.available)
        )

        return {
          ...item,
          quantity: newQuantity,
        }
      })
    )
  }

  async function saveSale() {
    setError('')
    setMessage('')

    if (!branchId) {
      setError('No hay una sucursal disponible.')
      return
    }

    if (cart.length === 0) {
      setError('Agrega al menos un producto a la venta.')
      return
    }

    setSaving(true)

    const { data, error: saveError } = await supabase.rpc(
      'create_sale_with_items',
      {
        p_branch_id: branchId,
        p_seller_id: userId,
        p_payment_method: paymentMethod,
        p_items: cart.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
        })),
        p_notes: null,
      }
    )

    if (saveError) {
      setError(saveError.message || 'No fue posible registrar la venta.')
      setSaving(false)
      return
    }

    setMessage(`Venta registrada correctamente. Folio: ${data}`)
    setCart([])
    setSaving(false)

    await loadData()
  }

  if (loading) {
    return (
      <main className="inventory-page">
        <section className="inventory-list-card">
          <strong>Cargando Nueva Venta...</strong>
        </section>
      </main>
    )
  }

  return (
    <main className="inventory-page">
      <header className="inventory-header">
        <div>
          <button type="button" className="back-button" onClick={onBack}>
            ← Volver
          </button>
          <p className="eyebrow">MODAS SOPHIE</p>
          <h1>Nueva venta</h1>
          <p>Registra una venta y descuenta automáticamente el inventario.</p>
        </div>
      </header>

      {error && <div className="inventory-message error">{error}</div>}
      {message && <div className="inventory-message success">{message}</div>}

      <section className="inventory-form-card">
        <div className="section-title">
          <span>🛍️</span>
          <div>
            <h2>Agregar productos</h2>
            <p>Busca el producto y selecciona su variante.</p>
          </div>
        </div>

        <div className="inventory-fields">
          <label>
            Sucursal
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Buscar producto o SKU
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej. ZH-2098"
            />
          </label>

          <label>
            Categoría
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Producto / talla / color
            <select
              value={selectedVariantId}
              onChange={(event) =>
                setSelectedVariantId(event.target.value)
              }
            >
              <option value="">Selecciona una variante</option>

              {visibleProducts.flatMap((product) =>
                variants
                  .filter((variant) => variant.product_id === product.id)
                  .map((variant) => {
                    const itemStock = stock.find(
                      (item) =>
                        item.branch_id === branchId &&
                        item.variant_id === variant.id
                    )

                    const available = itemStock?.quantity || 0

                    return (
                      <option
                        key={variant.id}
                        value={variant.id}
                        disabled={available <= 0}
                      >
                        {product.name}
                        {product.sku ? ` · ${product.sku}` : ''}
                        {' · '}
                        {variant.size || 'Sin talla'}
                        {' · '}
                        {variant.color || 'Sin color'}
                        {' · '}
                        {available} disponibles
                      </option>
                    )
                  })
              )}
            </select>
          </label>

          <label>
            Cantidad
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
        </div>

        {selectedData?.product && (
          <div className="sale-selected-product">
            <strong>{selectedData.product.name}</strong>
            <span>
              {selectedData.variant.size || 'Sin talla'} ·{' '}
              {selectedData.variant.color || 'Sin color'}
            </span>
            <span>
              Precio: ${Number(selectedData.product.price).toFixed(2)}
            </span>
            <span>
              Existencia: {selectedData.available}
            </span>
          </div>
        )}

        <button
          type="button"
          className="primary-button"
          onClick={addToCart}
        >
          + Agregar al carrito
        </button>
      </section>

      <section className="inventory-list-card">
        <div className="section-title">
          <span>🛒</span>
          <div>
            <h2>Carrito</h2>
            <p>{cart.length} producto(s)</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="inventory-empty">
            No hay productos agregados.
          </div>
        ) : (
          <div className="sale-cart">
            {cart.map((item) => (
              <article className="sale-cart-item" key={item.variantId}>
                <div>
                  <strong>{item.productName}</strong>
                  <small>
                    {item.sku || 'Sin SKU'} · {item.size} · {item.color}
                  </small>
                  <small>
                    ${item.unitPrice.toFixed(2)} c/u
                  </small>
                </div>

                <div className="sale-cart-controls">
                  <input
                    type="number"
                    min="1"
                    max={item.available}
                    value={item.quantity}
                    onChange={(event) =>
                      changeCartQuantity(
                        item.variantId,
                        Number(event.target.value)
                      )
                    }
                  />

                  <strong>
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </strong>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => removeFromCart(item.variantId)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
          ))}
          </div>
        )}

        <div className="sale-total">
          <span>Total</span>
          <strong>${total.toFixed(2)}</strong>
        </div>

        <div className="payment-methods">
          <strong>Método de pago</strong>

          <div>
            <button
              type="button"
              className={paymentMethod === 'efectivo' ? 'active' : ''}
              onClick={() => setPaymentMethod('efectivo')}
            >
              💵 Efectivo
            </button>

            <button
              type="button"
              className={paymentMethod === 'tarjeta' ? 'active' : ''}
              onClick={() => setPaymentMethod('tarjeta')}
            >
              💳 Tarjeta
            </button>

            <button
              type="button"
              className={
                paymentMethod === 'transferencia' ? 'active' : ''
              }
              onClick={() => setPaymentMethod('transferencia')}
            >
              📲 Transferencia
            </button>
          </div>
        </div>

        <button
          type="button"
          className="primary-button sale-save-button"
          disabled={saving || cart.length === 0}
          onClick={saveSale}
        >
          {saving ? 'Registrando venta...' : '✓ Registrar venta'}
        </button>
      </section>
    </main>
  )
}
