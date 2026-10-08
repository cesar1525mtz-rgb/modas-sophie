import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type InventoryPageProps = {
  userId: string
  userRole: 'admin' | 'vendedor'
  onBack: () => void
}

type Branch = {
  id: string
  name: string
}

type Product = {
  id: string
  sku: string | null
  name: string
  category: string | null
  cost: number
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
  variant_id: string
  quantity: number
  min_stock: number
  branch_id: string
}

type VariantForm = {
  id?: string
  size: string
  color: string
  barcode: string
  quantity: string
  minStock: string
}

const emptyVariant = (): VariantForm => ({
  size: '',
  color: '',
  barcode: '',
  quantity: '0',
  minStock: '0',
})

const categories = [
  'Ropa para dama',
  'Ropa para caballero',
  'PANTALÓN DAMA',
  'Bolsas y mochilas',
  'Accesorios',
  'Regalos',
  'Calzado',
  'Otros',
]

export default function Inventory({
  userId,
  userRole,
  onBack,
}: InventoryPageProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [stock, setStock] = useState<Stock[]>([])

  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [entryVariantId, setEntryVariantId] = useState('')
  const [entryQuantity, setEntryQuantity] = useState('1')
  const [entryCost, setEntryCost] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [savingEntry, setSavingEntry] = useState(false)
  const [entryError, setEntryError] = useState('')
  const [showEntriesHistory, setShowEntriesHistory] = useState(false)

  const [entries, setEntries] = useState<Array<{
    id: string
    branch_id: string
    variant_id: string
    quantity: number
    unit_cost: number
    notes: string | null
    created_at: string
  }>>([])


  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todas')

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [formVariants, setFormVariants] = useState<VariantForm[]>([
    emptyVariant(),
  ])
  const [showVariants, setShowVariants] = useState(false)
  const [initialQuantity, setInitialQuantity] = useState('0')
  const [initialMinStock, setInitialMinStock] = useState('0')
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  async function loadInventory() {
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
            .select('id, name')
            .eq('active', true)
            .order('name')
        : supabase
            .from('employee_branches')
            .select('branch_id, branches!inner(id, name)')
            .eq('user_id', userId)
            .eq('active', true)
            .eq('branches.active', true),

      supabase
        .from('products')
        .select('id, sku, name, category, cost, price, active')
        .eq('active', true)
        .order('name'),

      supabase
        .from('product_variants')
        .select('id, product_id, size, color, barcode')
        .order('created_at'),

      supabase
        .from('inventory')
        .select('variant_id, quantity, min_stock, branch_id'),
    ])

    if (branchError) {
      setError('No fue posible cargar las sucursales.')
    } else if (productError || variantError || stockError) {
      setError('No fue posible cargar el inventario.')
    } else {
      const safeBranches =
        userRole === 'admin'
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
        setSelectedProductId(null)
      } else if (!branchId && safeBranches.length > 0) {
        setBranchId(safeBranches[0].id)
      }
    }

    if (userRole === 'admin') {
      const { data: entryData, error: entryLoadError } = await supabase
        .from('inventory_entries')
        .select('id, branch_id, variant_id, quantity, unit_cost, notes, created_at')
        .order('created_at', { ascending: false })
        .limit(30)

      if (!entryLoadError) {
        setEntries((entryData || []) as typeof entries)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadInventory()

    const handleDataUpdated = () => {
      loadInventory()
    }

    window.addEventListener('modas-sophie-data-updated', handleDataUpdated)

    return () => {
      window.removeEventListener('modas-sophie-data-updated', handleDataUpdated)
    }
  }, [userId, userRole])

  function resetForm() {
    setEditingProductId(null)
    setName('')
    setSku('')
    setCategory('')
    setCost('')
    setPrice('')
    setFormVariants([emptyVariant()])
    setShowVariants(false)
    setInitialQuantity('0')
    setInitialMinStock('0')
    setError('')
  }

  function enableVariants() {
    setShowVariants(true)
  }

  function addVariant() {
    setShowVariants(true)
    setFormVariants((current) => [
      ...current,
      emptyVariant(),
    ])
  }

  function removeVariant(index: number) {
    setFormVariants((current) => {
      if (current.length <= 1) {
        setShowVariants(false)
        return [emptyVariant()]
      }

      return current.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  function updateVariant(
    index: number,
    field: keyof VariantForm,
    value: string,
  ) {
    setFormVariants((current) =>
      current.map((variant, itemIndex) =>
        itemIndex === index
          ? { ...variant, [field]: value }
          : variant,
      ),
    )
  }

  function editProduct(productId: string) {
    const product = products.find((item) => item.id === productId)

    if (!product) {
      setError('No se encontró el producto.')
      return
    }

    const productVariants = variants.filter(
      (variant) => variant.product_id === productId
    )

    setEditingProductId(productId)
  setShowForm(true)
    setName(product.name)
    setSku(product.sku || '')
    setCategory(product.category || '')
    setCost(String(product.cost))
    setPrice(String(product.price))

    setFormVariants(
      productVariants.map((variant) => {
        const itemStock = stock.find(
          (entry) =>
            entry.variant_id === variant.id &&
            entry.branch_id === branchId
        )

        return {
          id: variant.id,
          size: variant.size || '',
          color: variant.color || '',
          barcode: variant.barcode || '',
          quantity: String(itemStock?.quantity ?? 0),
          minStock: String(itemStock?.min_stock ?? 0),
        }
      })
    )

    setError('')
    setSuccess('')
    setShowForm(true)

    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault()

    if (userRole !== 'admin') {
      setError('Solo un administrador puede registrar productos.')
      return
    }

    if (!branchId) {
      setError('No hay una sucursal activa configurada.')
      return
    }

    if (!name.trim() || !category || !cost || !price) {
      setError('Completa nombre, categoría, costo y precio.')
      return
    }

    const numericCost = Number(cost)
    const numericPrice = Number(price)

    if (
      !Number.isFinite(numericCost) ||
      !Number.isFinite(numericPrice) ||
      numericCost < 0 ||
      numericPrice < 0
    ) {
      setError('Costo y precio deben ser cantidades válidas.')
      return
    }

    let variantsPayload

  if (showVariants) {
    if (formVariants.length === 0) {
      setError('Agrega al menos una variante.')
      return
    }

    for (const variant of formVariants) {
      if (!variant.size.trim() || !variant.color.trim()) {
        setError('Cada variante debe tener talla y color.')
        return
      }

      if (
        Number(variant.quantity) < 0 ||
        Number(variant.minStock) < 0
      ) {
        setError('La existencia y el stock mínimo no pueden ser negativos.')
        return
      }
    }

    variantsPayload = formVariants.map((variant) => ({
      id: variant.id || null,
      size: variant.size.trim(),
      color: variant.color.trim(),
      barcode: variant.barcode.trim() || null,
      quantity: Number(variant.quantity),
      min_stock: Number(variant.minStock),
    }))
  } else {
    if (
      Number(initialQuantity) < 0 ||
      Number(initialMinStock) < 0
    ) {
      setError('La existencia y el stock mínimo no pueden ser negativos.')
      return
    }

    variantsPayload = [
      {
        id: null,
        size: '',
        color: '',
        barcode: null,
        quantity: Number(initialQuantity),
        min_stock: Number(initialMinStock),
      },
    ]
  }

  setSaving(true)
    setError('')
    setSuccess('')

    const { error: saveError } = editingProductId
      ? await supabase.rpc('update_product_with_variants', {
          p_product_id: editingProductId,
          p_branch_id: branchId,
          p_sku: sku.trim() || null,
          p_name: name.trim(),
          p_category: category,
          p_cost: numericCost,
          p_price: numericPrice,
          p_variants: variantsPayload,
        })
      : await supabase.rpc('create_product_with_variants', {
          p_branch_id: branchId,
          p_sku: sku.trim() || null,
          p_name: name.trim(),
          p_category: category,
          p_cost: numericCost,
          p_price: numericPrice,
          p_variants: variantsPayload,
        })

    if (saveError) {
      if (saveError.message.includes('products_sku_key')) {
        setError('Ese SKU ya está registrado.')
      } else if (
        saveError.message.includes('product_variants_barcode_key')
      ) {
        setError('Uno de los códigos de barras ya está registrado.')
      } else {
        setError(saveError.message || 'No fue posible guardar el producto.')
      }

      setSaving(false)
      return
    }

    setSuccess('Producto guardado correctamente.')
    resetForm()
    setShowForm(false)
    await loadInventory()
    setSaving(false)

    window.setTimeout(() => setSuccess(''), 2500)
  }


  async function saveInventoryEntry() {
    if (userRole !== 'admin') return

    setEntryError('')

    if (!branchId) {
      setEntryError('Selecciona una sucursal.')
      return
    }

    if (!entryVariantId) {
      setEntryError('Selecciona el producto y variante.')
      return
    }

    const quantity = Number(entryQuantity)
    const cost = entryCost.trim() === '' ? null : Number(entryCost)

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setEntryError('La cantidad debe ser un número entero mayor a cero.')
      return
    }

    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      setEntryError('El costo debe ser un número válido.')
      return
    }

    setSavingEntry(true)

    const { error: saveEntryError } = await supabase.rpc('add_inventory_entry', {
      p_branch_id: branchId,
      p_variant_id: entryVariantId,
      p_quantity: quantity,
      p_unit_cost: cost,
      p_notes: entryNotes.trim() || null,
    })

    if (saveEntryError) {
      setEntryError(saveEntryError.message || 'No fue posible registrar la entrada.')
      setSavingEntry(false)
      return
    }

    setEntryVariantId('')
    setEntryQuantity('1')
    setEntryCost('')
    setEntryNotes('')
    setShowEntryForm(false)
    setSavingEntry(false)
    setSuccess('Entrada de mercancía registrada correctamente.')
    await loadInventory()
    window.setTimeout(() => setSuccess(''), 2500)
  }

  const rows = useMemo(() => {
    return products
      .map((product) => {
        const productVariants = variants.filter(
          (variant) => variant.product_id === product.id,
        )

        const branchStock = productVariants.reduce(
          (total, variant) => {
            const item = stock.find(
              (entry) =>
                entry.variant_id === variant.id &&
                entry.branch_id === branchId,
            )

            return total + (item?.quantity || 0)
          },
          0,
        )

        return {
          product,
          variants: productVariants,
          totalStock: branchStock,
        }
      })
      .filter(({ product }) => {
        const matchesSearch =
          !search.trim() ||
          product.name
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (product.sku || '')
            .toLowerCase()
            .includes(search.toLowerCase())

        const matchesCategory =
          categoryFilter === 'Todas' ||
          product.category === categoryFilter

        return matchesSearch && matchesCategory
      })
  }, [
    products,
    variants,
    stock,
    branchId,
    search,
    categoryFilter,
  ])

const inventorySummary = useMemo(() => {
  let totalPieces = 0
  let lowStock = 0
  let outOfStock = 0

  products.forEach((product) => {
    const productVariants = variants.filter(
      (variant) => variant.product_id === product.id
    )

    let productHasLowStock = false
    let productHasStock = false

    productVariants.forEach((variant) => {
      const itemStock = stock.find(
        (entry) =>
          entry.variant_id === variant.id &&
          entry.branch_id === branchId
      )

      const quantity = Number(itemStock?.quantity ?? 0)
      const minStock = Number(itemStock?.min_stock ?? 0)

      totalPieces += quantity

      if (quantity > 0) {
        productHasStock = true

        if (minStock > 0 && quantity <= minStock) {
          productHasLowStock = true
        }
      }
    })

    if (!productHasStock) {
      outOfStock += 1
    } else if (productHasLowStock) {
      lowStock += 1
    }
  })

  return {
    totalProducts: products.length,
    totalPieces,
    lowStock,
    outOfStock,
  }
}, [products, variants, stock, branchId])

  return (
    <>
      {showEntriesHistory && (
        <div
          style={{
            minHeight: '100dvh',
            width: '100%',
            background: '#fff7fa',
            boxSizing: 'border-box',
            padding: '16px',
            color: '#292329',
          }}
        >
          <div
            style={{
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            <button
              type="button"
              onClick={() => setShowEntriesHistory(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 44,
                padding: '10px 16px',
                marginBottom: 18,
                background: '#ffffff',
                color: '#7f3157',
                border: '1px solid #d9a0b8',
                borderRadius: 12,
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(80,30,50,0.08)',
                cursor: 'pointer',
              }}
            >
              ← Volver a inventario
            </button>

            <div
              style={{
                background: 'linear-gradient(135deg, #8f3d63 0%, #a94f76 100%)',
                color: '#ffffff',
                borderRadius: 18,
                padding: '20px 18px',
                marginBottom: 18,
                boxShadow: '0 8px 22px rgba(90,35,60,0.16)',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  opacity: 0.9,
                  marginBottom: 6,
                }}
              >
                MODAS SOPHIE
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: 27,
                  lineHeight: 1.15,
                  fontWeight: 700,
                }}
              >
                Historial de entradas
              </h2>

              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 14,
                  lineHeight: 1.4,
                  opacity: 0.92,
                }}
              >
                Registro completo de entradas de mercancía
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <strong
                style={{
                  fontSize: 17,
                  color: '#552238',
                }}
              >
                {entries.length} {entries.length === 1 ? 'entrada registrada' : 'entradas registradas'}
              </strong>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 12,
              }}
            >
              {entries.map((entry) => {
                const variant = variants.find(
                  (item) => item.id === entry.variant_id
                )

                const product = variant
                  ? products.find((item) => item.id === variant.product_id)
                  : undefined

                const variantText =
                  variant && (variant.size || variant.color)
                    ? [
                        variant.size ? `Talla: ${variant.size}` : '',
                        variant.color ? `Color: ${variant.color}` : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : 'Producto sin variantes'

                const entryDate = entry.created_at
                  ? new Date(entry.created_at).toLocaleString('es-MX', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : ''

                return (
                  <article
                    key={entry.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #ead2dc',
                      borderRadius: 16,
                      padding: 16,
                      boxShadow: '0 3px 12px rgba(80,30,50,0.07)',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          lineHeight: 1.25,
                          color: '#4d2035',
                          marginBottom: 5,
                        }}
                      >
                        {product?.name || 'Producto'}
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          color: '#765665',
                          lineHeight: 1.35,
                        }}
                      >
                        {variantText}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          background: '#fff7fa',
                          borderRadius: 10,
                          padding: '10px 11px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: '#8a6876',
                            marginBottom: 3,
                          }}
                        >
                          Cantidad
                        </div>

                        <strong
                          style={{
                            fontSize: 16,
                            color: '#552238',
                          }}
                        >
                          +{entry.quantity} {entry.quantity === 1 ? 'pieza' : 'piezas'}
                        </strong>
                      </div>

                      <div
                        style={{
                          background: '#fff7fa',
                          borderRadius: 10,
                          padding: '10px 11px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: '#8a6876',
                            marginBottom: 3,
                          }}
                        >
                          Costo unitario
                        </div>

                        <strong
                          style={{
                            fontSize: 16,
                            color: '#552238',
                          }}
                        >
                          ${Number(entry.unit_cost || 0).toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 11,
                        paddingTop: 10,
                        borderTop: '1px solid #f0dfe6',
                        fontSize: 13,
                        color: '#765665',
                      }}
                    >
                      <strong style={{ color: '#552238' }}>
                        Fecha:
                      </strong>{' '}
                      {entryDate}
                    </div>

                    {entry.notes && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: '10px 12px',
                          background: '#faf2f6',
                          borderRadius: 10,
                          fontSize: 14,
                          lineHeight: 1.4,
                          color: '#5e4651',
                        }}
                      >
                        <strong style={{ color: '#552238' }}>
                          Nota:
                        </strong>{' '}
                        {entry.notes}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {!showEntriesHistory && (
        <main className={`inventory-page ${editingProductId ? "inventory-page-editing" : ""}`}>
      <header className="inventory-header">
        <button
          className="inventory-back"
          onClick={onBack}
        >
          ← Volver
        </button>

        <div>
          <p className="eyebrow">MODAS SOPHIE</p>
          <h2>Inventario</h2>
          <p>Productos y existencias</p>
        </div>

{userRole === 'admin' && (
          <button
            className="inventory-new-button"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
            + Nuevo producto
          </button>
        )}
      </header>

      {success && (
        <div className="inventory-success">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="inventory-error">
          {error}
        </div>
      )}

      {userRole === 'admin' && showForm && (
    <section
      className="inventory-form-card"
      style={{
        ...(editingProductId
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 9999,
            width: "100vw",
            height: "100dvh",
            maxHeight: "100dvh",
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
              background: "var(--ms-white, #ffffff)",
              padding: 16,
              boxSizing: "border-box"
            }
          : {})
      }}
    >
          <div className="inventory-section-title">
            <div>
              <span>📦</span>
              <div>
                <h3>{editingProductId ? 'Editar producto' : 'Nuevo producto'}</h3>
                <p>{editingProductId ? 'Modifica los datos y variantes del producto.' : 'Registra el producto y sus variantes.'}</p>
              </div>
            </div>
          </div>

          <form onSubmit={saveProduct}>
            <div className="inventory-fields">
              <label>
                Nombre del producto *
                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Ej. Pantalón de caballero"
                />
              </label>

              <label>
                Categoría *
                <input
                type="text"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                placeholder="Escribe la categoría"
              />
              </label>

              <label>
                SKU
                <input
                  value={sku}
                  onChange={(event) =>
                    setSku(event.target.value)
                  }
                  placeholder="Ej. PC-001"
                />
              </label>

              <label>
                Costo *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(event) =>
                    setCost(event.target.value)
                  }
                  placeholder="0.00"
                />
              </label>

              <label>
                Precio de venta *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) =>
                    setPrice(event.target.value)
                  }
                  placeholder="0.00"
                />
              </label>

              {userRole === 'admin' && (<label>
                Sucursal
                <select
                  value={branchId}
                  onChange={(event) =>
                    setBranchId(event.target.value)
                  }
                >
                  {branches.map((branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                    >
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>)}
            </div>


            {!showVariants ? (


              <div className="inventory-simple-stock">


                <div className="variant-heading">


                  <div>


                    <h3>Existencia del producto</h3>


                    <p>


                      Este producto no usa tallas ni colores.


                    </p>


                  </div>


                </div>


            


                <div className="variant-fields">


                  <label>


                    Existencia inicial *


                    <input


                      type="number"


                      min="0"


                      value={initialQuantity}


                      onChange={(event) =>


                        setInitialQuantity(event.target.value)


                      }


                    />


                  </label>


            


                  <label>


                    Stock mínimo


                    <input


                      type="number"


                      min="0"


                      value={initialMinStock}


                      onChange={(event) =>


                        setInitialMinStock(event.target.value)


                      }


                    />


                  </label>


                </div>


            


                <button


                  type="button"


                  className="variant-add"


                  onClick={enableVariants}


                >


                  + Agregar variantes


                </button>


              </div>


            ) : (


              <div className="inventory-variants-section">


                <div className="variant-heading">


                  <div>


                    <h3>Variantes</h3>


                    <p>


                      Agrega talla, color, código de barras y existencia.


                    </p>


                  </div>


                </div>


            


                <div className="variant-list">


                  {formVariants.map((variant, index) => (


                    <div


                      className="variant-card"


                      key={index}


                    >


                      <div className="variant-card-header">


                        <strong>Variante {index + 1}</strong>


            


                        {formVariants.length > 1 && (


                          <button


                            type="button"


                            className="variant-remove"


                            onClick={() => removeVariant(index)}


                          >


                            Eliminar


                          </button>


                        )}


                      </div>


            


                      <div className="variant-fields">


                        <label>


                          Talla *


                          <input


                            value={variant.size}


                            onChange={(event) =>


                              updateVariant(


                                index,


                                'size',


                                event.target.value,


                              )


                            }


                            placeholder="Ej. 32"


                          />


                        </label>


            


                        <label>


                          Color *


                          <input


                            value={variant.color}


                            onChange={(event) =>


                              updateVariant(


                                index,


                                'color',


                                event.target.value,


                              )


                            }


                            placeholder="Ej. Azul marino"


                          />


                        </label>


            


                        <label>


                          Código de barras


                          <input


                            value={variant.barcode}


                            onChange={(event) =>


                              updateVariant(


                                index,


                                'barcode',


                                event.target.value,


                              )


                            }


                            placeholder="7501234567890"


                          />


                        </label>


            


                        <label>


                          Existencia inicial *


                          <input


                            type="number"


                            min="0"


                            value={variant.quantity}


                            onChange={(event) =>


                              updateVariant(


                                index,


                                'quantity',


                                event.target.value,


                              )


                            }


                          />


                        </label>


            


                        <label>


                          Stock mínimo


                          <input


                            type="number"


                            min="0"


                            value={variant.minStock}


                            onChange={(event) =>


                              updateVariant(


                                index,


                                'minStock',


                                event.target.value,


                              )


                            }


                          />


                        </label>


                      </div>


                    </div>


                  ))}


                </div>


            


                <button


                  type="button"


                  className="variant-add"


                  onClick={addVariant}


                >


                  + Agregar otra variante


                </button>


              </div>


            )}

            <div className="inventory-form-actions">
              <button
                type="button"
                className="inventory-cancel"
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="inventory-save"
                disabled={saving}
              >
                {saving
                  ? 'Guardando...'
                  : 'Guardar producto'}
              </button>
            </div>
          </form>
        </section>
      )}

  
    {userRole === 'admin' && (
      <section
          className="inventory-list-card inventory-entry-card"
          style={{
            marginBottom: 16,
            display: editingProductId ? 'none' : undefined,
          }}
        >
        <div className="inventory-section-title">
          <div>
            <span>📦</span>
            <div>
              <h3>Entrada de mercancía</h3>
              <p>Agrega existencias sin registrar una venta ni un gasto.</p>
            </div>
          </div>
          <button
            type="button"
            className="inventory-save"
            onClick={() => {
              setShowEntryForm((value) => !value)
              setEntryError('')
            }}
          >
            {showEntryForm ? 'Cerrar' : '+ Nueva entrada'}
          </button>
        </div>

        {showEntryForm && (
          <div className="inventory-form" style={{ marginTop: 14 }}>
            <label>
              Producto y variante *
              <select
                value={entryVariantId}
                onChange={(event) => {
                  const value = event.target.value
                  setEntryVariantId(value)

                  const variant = variants.find((item) => item.id === value)
                  if (variant) {
                    const product = products.find((item) => item.id === variant.product_id)
                    setEntryCost(product ? String(product.cost ?? '') : '')
                  }
                }}
              >
                <option value="">Selecciona producto, talla y color</option>
            {variants
              .filter((variant) => {
                const sameProduct = variants.filter(
                  (item) => item.product_id === variant.product_id
                )

                const hasRealVariant = sameProduct.some(
                  (item) =>
                    !!item.size?.trim() ||
                    !!item.color?.trim()
                )

                // Si el producto tiene tallas o colores reales,
                // ocultar completamente la variante base.
                if (hasRealVariant) {
                  return (
                    !!variant.size?.trim() ||
                    !!variant.color?.trim()
                  )
                }

                // Producto sin tallas ni colores:
                // conservar solamente su primera variante base.
                const firstBaseVariant = sameProduct.find(
                  (item) =>
                    !item.size?.trim() &&
                    !item.color?.trim()
                )

                return (
                  !variant.size?.trim() &&
                  !variant.color?.trim() &&
                  variant.id === firstBaseVariant?.id
                )
              })
              .map((variant) => {
                const product = products.find(
                  (item) => item.id === variant.product_id
                )

                const stockItem = stock.find(
                  (item) =>
                    item.variant_id === variant.id &&
                    item.branch_id === branchId
                )

                return (
                  <option key={variant.id} value={variant.id}>
                    {(product?.name || 'Producto') +
                      ' · ' +
                      (variant.size || 'Sin talla') +
                      ' · ' +
                      (variant.color || 'Sin color') +
                      ' · Stock: ' +
                      (stockItem?.quantity || 0)}
                  </option>
                )
              })}
              </select>
            </label>

            <label>
              Cantidad recibida *
              <input
                type="number"
                min="1"
                step="1"
                value={entryQuantity}
                onChange={(event) => setEntryQuantity(event.target.value)}
              />
            </label>

            <label>
              Costo por pieza
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryCost}
                onChange={(event) => setEntryCost(event.target.value)}
                placeholder="Se usa el costo del producto"
              />
            </label>

            <label>
              Nota
              <input
                type="text"
                value={entryNotes}
                onChange={(event) => setEntryNotes(event.target.value)}
                placeholder="Ej. Compra proveedor"
              />
            </label>

            {entryError && (
              <p style={{ color: '#b00020', fontWeight: 700 }}>
                {entryError}
              </p>
            )}

            <button
              type="button"
              className="inventory-save"
              disabled={savingEntry}
              onClick={saveInventoryEntry}
            >
              {savingEntry ? 'Registrando...' : 'Registrar entrada'}
            </button>
          </div>
        )}
      </section>
    )}

    

    <section className="inventory-list-card">
        {userRole === 'admin' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 16,
              padding: 14,
              background: '#fff7fa',
              border: '1px solid #ead2dc',
              borderRadius: 14,
            }}
          >
            <div>
              <strong
                style={{
                  display: 'block',
                  color: '#552238',
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                Sucursal
              </strong>
              <span
                style={{
                  color: '#777',
                  fontSize: 13,
                }}
              >
                Consulta y administra el inventario de cada sucursal.
              </span>
            </div>

            <select
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value)
                setSelectedProductId(null)
                setError('')
                setSuccess('')
              }}
              style={{
                minWidth: 190,
                minHeight: 44,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #d9a0b8',
                background: '#ffffff',
                color: '#552238',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="inventory-section-title">
          <div>
            <span>📦</span>
            <div>
              <h3>Productos registrados</h3>
              <p>
                {products.length} producto
                {products.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>

        
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginBottom: 20,
  }}
>
  {[
    ['📦 Productos', inventorySummary.totalProducts, '#fce7f3'],
    ['🧮 Piezas', inventorySummary.totalPieces, '#e0f2fe'],
    ['🟡 Stock bajo', inventorySummary.lowStock, '#fef3c7'],
    ['🔴 Agotados', inventorySummary.outOfStock, '#fee2e2'],
  ].map(([label, value, color]) => (
    <div
      key={String(label)}
      style={{
        background: String(color),
        borderRadius: 14,
        padding: 16,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 27,
          fontWeight: 800,
          marginTop: 8,
          color: '#292524',
        }}
      >
        {value}
      </div>
    </div>
  ))}
</div>

<div className="inventory-filters">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar producto o SKU..."
          />

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
          >
            <option value="Todas">
              Todas las categorías
            </option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="inventory-empty">
            Cargando inventario...
          </div>
        ) : rows.length === 0 ? (
          <div className="inventory-empty">
            <span>📦</span>
            <strong>No hay productos registrados</strong>
            <small>
              {userRole === 'admin'
                ? 'Usa "Nuevo producto" para comenzar.'
                : 'El administrador todavía no ha registrado productos.'}
            </small>
          </div>
        ) : (
          <div className="product-list">
            {rows.map(
              ({ product, variants: productVariants, totalStock }) => (
                <article
              className="product-row"
              key={product.id}
              onClick={() =>
                setSelectedProductId((current) =>
                  current === product.id ? null : product.id
                )
              }
              style={{ cursor: 'pointer' }}
            >
                  <div className="product-main">
                    <div className="product-icon">👕</div>

                    <div>
                      <strong>{product.name}</strong>

                      <span>
                        {product.category || 'Sin categoría'}
                        {product.sku
                          ? ` · ${product.sku}`
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="product-price">
                    ${Number(product.price).toFixed(2)}
                  </div>

                  <div
                    className={`product-stock ${
                      totalStock === 0
                        ? 'empty'
                        : 'available'
                    }`}
                  >
                    {totalStock} piezas
                  </div>



                  
          {(() => {
            const hasLowStock = productVariants.some((variant) => {
              const itemStock = stock.find(
                (entry) =>
                  entry.variant_id === variant.id &&
                  entry.branch_id === branchId
              )

              const quantity = Number(itemStock?.quantity ?? 0)
              const minStock = Number(itemStock?.min_stock ?? 0)

              return quantity > 0 && minStock > 0 && quantity <= minStock
            })

            const stockLabel =
              totalStock === 0
                ? '🔴 Agotado'
                : hasLowStock
                  ? '🟡 Stock bajo'
                  : '🟢 Stock disponible'

            const stockBackground =
              totalStock === 0
                ? '#fde8e8'
                : hasLowStock
                  ? '#fff4cc'
                  : '#e8f7ee'

            return (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  marginTop: 8,
                  marginBottom: 8,
                  borderRadius: 999,
                  background: stockBackground,
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                {stockLabel}
              </div>
            )
          })()}

          {selectedProductId === product.id && (
  <div
    className="inventory-product-detail"
    onClick={(event) => event.stopPropagation()}
    style={{
      gridColumn: '1 / -1',
      width: '100%',
      boxSizing: 'border-box',
      marginTop: 12,
      padding: 14,
      borderRadius: 16,
      background: '#fff7fa',
      border: '1px solid #ead2dc',
    }}
  >
    {productVariants.some(
          (variant) =>
            variant.size?.trim() || variant.color?.trim()
        ) && (
          <div
      style={{
        fontSize: 18,
        fontWeight: 800,
        marginBottom: 12,
      }}
    >
      👕 Variantes disponibles
    </div>
        )}

    <div
      style={{
        display: 'grid',
        gap: 8,
      }}
    >
      {productVariants.map((variant) => {
        if (!variant.size?.trim() && !variant.color?.trim()) {
          return null
        }

        const itemStock = stock.find(
          (entry) =>
            entry.variant_id === variant.id &&
            entry.branch_id === branchId
        )

        const quantity = Number(itemStock?.quantity ?? 0)

        return (
          <div
            key={variant.id}
            style={{
              display: 'flex',
              color: '#4d2035',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: '#ffffff',
              border: '1px solid #ead2dc',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {variant.size || 'Sin talla'}
              {' · '}
              {variant.color || 'Sin color'}
            </span>

            <strong style={{ whiteSpace: 'nowrap' }}>
              {quantity} piezas
            </strong>
          </div>
        )
      })}
    </div>
  </div>
)}

{userRole === 'admin' && (
            <button
  type="button"
  className="product-edit-button product-edit-button-final"
  style={{
    width: 'fit-content',
    minWidth: 0,
    maxWidth: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    minHeight: 40,
    marginTop: 12,
    marginLeft: 'auto',
    background: '#8f3d63',
    color: '#ffffff',
    border: '1px solid #b85a82',
    borderRadius: 9,
    fontSize: 15,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
  }}
  onClick={(event) => {
              event.stopPropagation()
              editProduct(product.id)
            }}
            >
              ✏️ Editar
            </button>
          )}
                </article>
              ),
            )}
          </div>
        )}
      </section>
        

{userRole === 'admin' && entries.length > 0 && !showEntriesHistory && (
        <>
          <section className="inventory-history-preview">
            <div className="inventory-section-title">
              <div>
                <span>📋</span>
                <div>
                  <h3>Historial de entradas</h3>
                  <p>{entries.length} entradas registradas</p>
                </div>
              </div>

              <button
              type="button"
              className="inventory-history-button"
              onClick={() => setShowEntriesHistory(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
                minHeight: 42,
                padding: '10px 18px',
                marginTop: 8,
                background: '#8f3d63',
                color: '#ffffff',
                border: '1px solid #b85a82',
                borderRadius: 10,
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              Ver historial →
            </button>
            </div>
          </section>

    
        </>
      )}
</main>
      )}
    </>
  )
}
