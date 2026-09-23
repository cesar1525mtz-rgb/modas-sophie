import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type InventoryPageProps = {
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

  async function loadInventory() {
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
        .select('id, name')
        .eq('active', true)
        .order('name'),

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
    loadInventory()
  }, [])

  function resetForm() {
    setName('')
    setSku('')
    setCategory('')
    setCost('')
    setPrice('')
    setFormVariants([emptyVariant()])
    setError('')
  }

  function addVariant() {
    setFormVariants((current) => [
      ...current,
      emptyVariant(),
    ])
  }

  function removeVariant(index: number) {
    setFormVariants((current) => {
      if (current.length === 1) return current
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

    setSaving(true)
    setError('')
    setSuccess('')

    const { error: saveError } = await supabase.rpc(
      'create_product_with_variants',
      {
        p_branch_id: branchId,
        p_sku: sku.trim() || null,
        p_name: name.trim(),
        p_category: category,
        p_cost: numericCost,
        p_price: numericPrice,
        p_variants: formVariants.map((variant) => ({
          size: variant.size.trim(),
          color: variant.color.trim(),
          barcode: variant.barcode.trim() || null,
          quantity: Number(variant.quantity),
          min_stock: Number(variant.minStock),
        })),
      },
    )

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

  return (
    <main className="inventory-page">
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
        <section className="inventory-form-card">
          <div className="inventory-section-title">
            <div>
              <span>📦</span>
              <div>
                <h3>Nuevo producto</h3>
                <p>Registra el producto y sus variantes.</p>
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
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                >
                  <option value="">
                    Selecciona una categoría
                  </option>

                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
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

              <label>
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
              </label>
            </div>

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
                    <strong>
                      Variante {index + 1}
                    </strong>

                    {formVariants.length > 1 && (
                      <button
                        type="button"
                        className="variant-remove"
                        onClick={() =>
                          removeVariant(index)
                        }
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

      <section className="inventory-list-card">
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

                  <div className="product-variants">
                    {productVariants.map((variant) => {
                      const item = stock.find(
                        (entry) =>
                          entry.variant_id === variant.id &&
                          entry.branch_id === branchId,
                      )

                      return (
                        <span key={variant.id}>
                          {variant.size || 'Sin talla'} ·{' '}
                          {variant.color || 'Sin color'} ·{' '}
                          {item?.quantity || 0}
                        </span>
                      )
                    })}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  )
}
