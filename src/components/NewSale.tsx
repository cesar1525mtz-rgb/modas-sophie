import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from "./PageHeader"

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

export default function NewSale({ userId, userRole, onBack }: NewSaleProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [stock, setStock] = useState<Stock[]>([])

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')

  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] =
    useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')

  const [discount, setDiscount] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saleCompleted, setSaleCompleted] = useState(false)
  const [saleFolio, setSaleFolio] = useState('')
  const [draftReady, setDraftReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('modas-sophie-new-sale-draft')

      if (saved) {
        const draft = JSON.parse(saved)

        if (typeof draft.branchId === 'string') setBranchId(draft.branchId)
        if (typeof draft.search === 'string') setSearch(draft.search)
        if (typeof draft.category === 'string') setCategory(draft.category)
        if (typeof draft.selectedProductId === 'string') setSelectedProductId(draft.selectedProductId)
        if (typeof draft.selectedSize === 'string') setSelectedSize(draft.selectedSize)
        if (typeof draft.selectedColor === 'string') setSelectedColor(draft.selectedColor)
        if (Array.isArray(draft.cart)) setCart(draft.cart)
        if (['efectivo', 'tarjeta', 'transferencia'].includes(draft.paymentMethod)) {
          setPaymentMethod(draft.paymentMethod)
        }
        if (typeof draft.discount === 'string') setDiscount(draft.discount)
      }
    } catch {
      localStorage.removeItem('modas-sophie-new-sale-draft')
    }

    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!draftReady) return

    const draft = {
      branchId,
      search,
      category,
      selectedProductId,
      selectedSize,
      selectedColor,
      cart,
      paymentMethod,
      discount,
    }

    localStorage.setItem(
      'modas-sophie-new-sale-draft',
      JSON.stringify(draft)
    )
  }, [
    draftReady,
    branchId,
    search,
    category,
    selectedProductId,
    selectedSize,
    selectedColor,
    cart,
    paymentMethod,
    discount,
  ])


  async function loadData() {
    setLoading(true)
    setError('')

    const [
      { data: branchData, error: branchError },
      { data: productData, error: productError },
      { data: variantData, error: variantError },
      { data: stockData, error: stockError },
    ] = await Promise.all([
      userRole === 'admin'
        ? supabase
            .from('branches')
            .select('id,name')
            .eq('active', true)
            .order('name')
        : supabase
            .from('employee_branches')
            .select('branch_id,branches!inner(id,name)')
            .eq('user_id', userId)
            .eq('active', true)
            .eq('branches.active', true),

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
      const safeBranches = userRole === 'admin'
        ? ((branchData || []) as Branch[])
        : ((branchData || []) as Array<{
            branch_id: string
            branches: Branch | Branch[]
          }>)
            .map((item) => {
              const branch = Array.isArray(item.branches)
                ? item.branches[0]
                : item.branches

              return branch
            })
            .filter(Boolean) as Branch[]

      setBranches(safeBranches)
      setProducts((productData || []) as Product[])
      setVariants((variantData || []) as Variant[])
      setStock((stockData || []) as Stock[])

      if (userRole === 'vendedor') {
        const assignedBranchId = safeBranches[0]?.id || ''

        setBranchId(assignedBranchId)
        setCart([])
        clearSelection()
      } else if (!branchId && safeBranches.length > 0) {
        setBranchId(safeBranches[0].id)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [userId, userRole])

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesCategory =
        category === 'Todas' || product.category === category

      if (!term) {
        return matchesCategory
      }

      const name = (product.name || '').toLowerCase()
      const sku = (product.sku || '').toLowerCase()

      return matchesCategory &&
        (name.includes(term) || sku.includes(term))
    })
  }, [products, search, category])

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId]
  )

  const productVariants = useMemo(() => {
    if (!selectedProductId || !branchId) return []

    return variants
      .filter((variant) => variant.product_id === selectedProductId)
      .map((variant) => {
        const itemStock = stock.find(
          (item) =>
            item.branch_id === branchId &&
            item.variant_id === variant.id
        )

        return {
          variant,
          available: itemStock?.quantity ?? 0,
        }
      })
      .filter((item) => item.available > 0)
  }, [selectedProductId, branchId, variants, stock])

  const availableSizes = useMemo(() => {
    const values = productVariants
      .map((item) => item.variant.size?.trim() || 'Sin talla')

    return [...new Set(values)]
  }, [productVariants])

  const variantsForSelectedSize = useMemo(() => {
    if (!selectedSize) return productVariants

    return productVariants.filter(
      (item) =>
        (item.variant.size?.trim() || 'Sin talla') === selectedSize
    )
  }, [productVariants, selectedSize])

  const availableColors = useMemo(() => {
    const values = variantsForSelectedSize
      .map((item) => item.variant.color?.trim() || 'Sin color')

    return [...new Set(values)]
  }, [variantsForSelectedSize])

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      ),
    [cart]
  )

  const discountAmount = Math.max(
    0,
    Math.min(Number(discount) || 0, total)
  )

  const finalTotal = total - discountAmount

  function clearSelection() {
    setSelectedProductId('')
    setSelectedSize('')
    setSelectedColor('')
  }

  function selectProduct(productId: string) {
    setError('')
    setMessage('')
    setSelectedProductId(productId)
    setSelectedSize('')
    setSelectedColor('')
  }

  function changeCartQuantity(variantId: string, value: number) {
    setError('')

    setCart((current) =>
      current.flatMap((item) => {
        if (item.variantId !== variantId) {
          return [item]
        }

        const nextQuantity = item.quantity + value

        if (nextQuantity <= 0) {
          return []
        }

        if (nextQuantity > item.available) {
          setError(
            `Solo hay ${item.available} pieza${item.available === 1 ? '' : 's'} disponibles.`
          )
          return [item]
        }

        return [{ ...item, quantity: nextQuantity }]
      })
    )
  }

  async function registerSale() {
    setError('')
    setMessage('')
    setSaleCompleted(false)
    setSaleFolio('')

    if (!branchId) {
      setError(
        userRole === 'vendedor'
          ? 'Tu usuario no tiene una sucursal asignada.'
          : 'Selecciona una sucursal.'
      )
      return
    }

    if (cart.length === 0) {
      setError('Agrega al menos un producto a la venta.')
      return
    }

    const { data: cashRegister, error: cashRegisterError } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('branch_id', branchId)
      .eq('status', 'open')
      .maybeSingle()

    if (cashRegisterError) {
      setError(cashRegisterError.message)
      return
    }

    if (!cashRegister) {
      setError('No hay una caja abierta. Abre la caja antes de registrar una venta.')
      return
    }

    setSaving(true)

    const { data, error: saveError } = await supabase.rpc(
      'create_sale_with_items',
      {
        p_branch_id: branchId,
        p_payment_method: paymentMethod,
        p_items: cart.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        p_discount: discountAmount,
        p_cash_register_id: cashRegister.id,
        p_notes: null,
      }
    )

    if (saveError) {
      setError(
        saveError.message || 'No fue posible registrar la venta.'
      )
      setSaving(false)
      return
    }

    setSaleFolio(String(data))
    setSaleCompleted(true)
    setCart([])
    localStorage.removeItem('modas-sophie-new-sale-draft')
    clearSelection()
    setSaving(false)

    await loadData()

    window.dispatchEvent(
      new Event('modas-sophie-data-updated')
    )
  }

  if (saleCompleted) {
    return (
      <main className="inventory-page">
        <section
          style={{
            minHeight: '70vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              textAlign: 'center',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '40px 24px',
              boxShadow: '0 12px 35px rgba(0,0,0,0.08)',
              border: '1px solid #f0e1e9',
            }}
          >
            <div
              style={{
                width: '100px',
                height: '100px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: '#e8f8ee',
                color: '#20a464',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '58px',
                fontWeight: 800,
              }}
            >
              ✓
            </div>

            <h1
              style={{
                margin: '0 0 12px',
                fontSize: '32px',
                color: '#2f2930',
              }}
            >
              ¡Venta registrada!
            </h1>

            <p
              style={{
                margin: '0 0 10px',
                fontSize: '18px',
                color: '#77717a',
              }}
            >
              La venta se registró correctamente.
            </p>

            <p
              style={{
                margin: '0 0 30px',
                fontSize: '17px',
                color: '#55505a',
              }}
            >
              Folio: <strong>{saleFolio}</strong>
            </p>

            <button
              type="button"
              onClick={() => {
                setSaleCompleted(false)
                setSaleFolio('')
                setError('')
                setMessage('')
                setCart([])
                clearSelection()
                loadData()
              }}
              style={{
                width: '100%',
                minHeight: '58px',
                border: 'none',
                borderRadius: '16px',
                background: '#20a464',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(32,164,100,0.25)',
              }}
            >
              Registrar nueva venta
            </button>
          </div>
        </section>
      </main>
    )
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
      <PageHeader
        title="Nueva venta"
        subtitle="Busca el modelo, selecciona talla y color."
        onBack={onBack}
      />

      {error && (
        <div className="inventory-message error">
          {error}
        </div>
      )}

      {message && (
        <div className="inventory-message success">
          {message}
        </div>
      )}

      <section className="inventory-form-card">
        <div className="section-title">
          <span>🛍️</span>
          <div>
            <h2>Buscar producto</h2>
            <p>Selecciona primero el modelo.</p>
          </div>
        </div>

        <div className="inventory-fields">
          {userRole === 'admin' && (
            <label>
              Sucursal
              <select
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.target.value)
                  clearSelection()
                  setCart([])
                }}
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Buscar por nombre o SKU
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
        </div>

        {search.trim() && (
          <div className="sale-product-results">
            {visibleProducts.length === 0 ? (
              <div className="sale-product-empty">
                No se encontraron productos.
              </div>
            ) : (
              visibleProducts.map((product) => {
                const productStock = variants
                  .filter((variant) => variant.product_id === product.id)
                  .reduce((sum, variant) => {
                    const item = stock.find(
                      (entry) =>
                        entry.branch_id === branchId &&
                        entry.variant_id === variant.id
                    )

                    return sum + (item?.quantity || 0)
                  }, 0)

                return (
                  <button
                    key={product.id}
                    type="button"
                    className={`sale-product-result ${
                      selectedProductId === product.id
                        ? 'selected'
                        : ''
                    }`}
                    disabled={productStock <= 0}
                    onClick={() => selectProduct(product.id)}
                  >
                    <span className="sale-product-result-info">
                      <strong>{product.name}</strong>
                      <small>
                        {product.sku
                          ? `SKU: ${product.sku}`
                          : 'Sin SKU'}
                        {' · '}
                        {productStock} disponible
                        {productStock === 1 ? '' : 's'}
                      </small>
                    </span>

                    <span className="sale-product-result-price">
                      ${Number(product.price).toFixed(2)}
                    </span>

                    <span className="sale-product-result-arrow">
                      →
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </section>

      {selectedProduct && (
        <section className="inventory-form-card sale-variant-card">
          <div className="section-title">
            <span>👕</span>
            <div>
              <h2>{selectedProduct.name}</h2>
              <p>
                {selectedProduct.sku
                  ? `SKU: ${selectedProduct.sku}`
                  : 'Sin SKU'}
              </p>
            </div>
          </div>

          {productVariants.length === 0 ? (
            <div className="sale-product-empty">
              Este modelo no tiene existencias disponibles.
            </div>
          ) : (
            <>
              <div className="sale-choice-group">
                <strong>Talla</strong>
                <div className="sale-choice-grid">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`sale-choice-button ${
                        selectedSize === size ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setError('')
                        setSelectedSize(size)
                        setSelectedColor('')
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {selectedSize && (
                <div className="sale-choice-group">
                  <strong>Color</strong>
                  <div className="sale-choice-grid">
                    {availableColors.map((color) => {
                      const option = variantsForSelectedSize.find(
                        (item) =>
                          (item.variant.color?.trim() ||
                            'Sin color') === color
                      )

                      return (
                        <button
                          key={color}
                          type="button"
                          className={`sale-choice-button ${
                            selectedColor === color
                              ? 'selected'
                              : ''
                          }`}
                          onClick={() => {
                            setError('')

                            if (!option) return

                            const variant = option.variant
                            const existing = cart.find(
                              (item) =>
                                item.variantId === variant.id
                            )

                            const newQuantity =
                              (existing?.quantity || 0) + 1

                            if (
                              newQuantity >
                              option.available
                            ) {
                              setError(
                                `No puedes agregar más de ${option.available} pieza${option.available === 1 ? '' : 's'}.`
                              )
                              return
                            }

                            if (existing) {
                              setCart((current) =>
                                current.map((item) =>
                                  item.variantId === variant.id
                                    ? {
                                        ...item,
                                        quantity: newQuantity,
                                      }
                                    : item
                                )
                              )
                            } else {
                              setCart((current) => [
                                ...current,
                                {
                                  variantId: variant.id,
                                  productName:
                                    selectedProduct.name,
                                  sku:
                                    selectedProduct.sku || '',
                                  size:
                                    variant.size?.trim() ||
                                    'Sin talla',
                                  color:
                                    variant.color?.trim() ||
                                    'Sin color',
                                  unitPrice: Number(
                                    selectedProduct.price
                                  ),
                                  quantity: 1,
                                  available:
                                    option.available,
                                },
                              ])
                            }

                            // Después de agregar la variante,
                            // cerrar completamente la tarjeta de selección.
                            clearSelection()
                          }}
                        >
                          {color}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <section className="inventory-list-card">
        <div className="section-title">
          <span>🛒</span>
          <div>
            <h2>Carrito</h2>
            <p>
              {cart.reduce(
                (sum, item) => sum + item.quantity,
                0
              )}{' '}
              producto
              {cart.reduce(
                (sum, item) => sum + item.quantity,
                0
              ) === 1
                ? ''
                : 's'}
            </p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="inventory-empty">
            No hay productos agregados.
          </div>
        ) : (
          <div className="sale-cart">
            {cart.map((item) => (
              <article
                className="sale-cart-item"
                key={item.variantId}
              >
                <div>
                  <strong>{item.productName}</strong>
                  <small>
                    {item.sku || 'Sin SKU'} · {item.size} ·{' '}
                    {item.color}
                  </small>
                  <small>
                    ${item.unitPrice.toFixed(2)} c/u
                  </small>
                </div>

                <div className="sale-cart-controls">
                  <button
                    type="button"
                    className="sale-quantity-button"
                    aria-label="Disminuir cantidad"
                    onClick={() =>
                      changeCartQuantity(
                        item.variantId,
                        -1
                      )
                    }
                  >
                    −
                  </button>

                  <strong>{item.quantity}</strong>

                  <button
                    type="button"
                    className="sale-quantity-button"
                    aria-label="Aumentar cantidad"
                    onClick={() =>
                      changeCartQuantity(
                        item.variantId,
                        1
                      )
                    }
                  >
                    +
                  </button>
                </div>

                <strong className="sale-cart-subtotal">
                  $
                  {(item.unitPrice * item.quantity).toFixed(2)}
                </strong>
              </article>
            ))}
          </div>
        )}

        <div
  className="sale-total"
  style={{
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 86px minmax(0, 1fr)',
    alignItems: 'center',
    gap: '5px',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    padding: '14px 8px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  }}
>
  <div
    style={{
      minWidth: 0,
      textAlign: 'center',
      overflow: 'hidden',
    }}
  >
    <span
      style={{
        display: 'block',
        fontSize: '13px',
        lineHeight: '1.1',
        whiteSpace: 'nowrap',
      }}
    >
      Subtotal
    </span>
    <strong
      style={{
        display: 'block',
        fontSize: '20px',
        lineHeight: '1.1',
        whiteSpace: 'nowrap',
      }}
    >
      ${total.toFixed(2)}
    </strong>
  </div>

  <div
    style={{
      minWidth: 0,
      textAlign: 'center',
    }}
  >
    <label
      htmlFor="sale-discount"
      style={{
        display: 'block',
        fontSize: '12px',
        lineHeight: '1.1',
        marginBottom: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      Descuento
    </label>
    <input
      id="sale-discount"
      type="number"
      min="0"
      step="0.01"
      value={discount}
      onChange={(e) => setDiscount(e.target.value)}
      placeholder="0.00"
      inputMode="decimal"
      style={{
        display: 'block',
        width: '82px',
        maxWidth: '82px',
        height: '34px',
        padding: '4px',
        margin: '0 auto',
        boxSizing: 'border-box',
        textAlign: 'center',
        fontSize: '15px',
      }}
    />
  </div>

  <div
    style={{
      minWidth: 0,
      textAlign: 'center',
      overflow: 'hidden',
    }}
  >
    <span
      style={{
        display: 'block',
        fontSize: '13px',
        lineHeight: '1.1',
        whiteSpace: 'nowrap',
      }}
    >
      Total
    </span>
    <strong
      style={{
        display: 'block',
        fontSize: '20px',
        lineHeight: '1.1',
        whiteSpace: 'nowrap',
      }}
    >
      ${finalTotal.toFixed(2)}
    </strong>
  </div>
</div>

<div className="sale-payment">
          <strong>Método de pago</strong>

          <div
        className="sale-payment-buttons"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
            <button
              type="button"
              className={
                paymentMethod === 'efectivo'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setPaymentMethod('efectivo')
              }
            >
              💵 Efectivo
            </button>

            <button
              type="button"
              className={
                paymentMethod === 'tarjeta'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setPaymentMethod('tarjeta')
              }
            >
              💳 Tarjeta
            </button>

            <button
              type="button"
              className={
                paymentMethod === 'transferencia'
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setPaymentMethod('transferencia')
              }
            >
              🏦 Transferencia
            </button>
          </div>
        </div>

        <button type="button" className="new-sale-register-button-final"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            height: '60px',
            minHeight: '60px',
            margin: '14px 0 0 0',
            padding: '0 18px',
            boxSizing: 'border-box',
            border: '0',
            borderRadius: '15px',
            background: '#e6008c',
            color: '#ffffff',
            fontSize: '17px',
            fontWeight: 800,
            lineHeight: 1,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            boxShadow: '0 5px 14px rgba(220, 0, 120, 0.20)',
          }}
          disabled={saving || cart.length === 0}
          onClick={registerSale}
        >
          {saving
            ? 'Registrando venta...'
            : `Registrar venta · $${finalTotal.toFixed(2)}`}
        </button>
      </section>
    </main>
  )
}
