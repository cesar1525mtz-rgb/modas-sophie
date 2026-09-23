import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Role = 'admin' | 'vendedor'

type Vendedor = {
  id: string
  username: string
  full_name: string
  role: Role
  active: boolean
}

type VendedoresProps = {
  userRole: Role
  onBack: () => void
}

export default function Vendedores({ userRole, onBack }: VendedoresProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function loadVendedores() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, role, active')
      .eq('role', 'vendedor')
      .order('username')

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setVendedores((data ?? []) as Vendedor[])
    setLoading(false)
  }

  useEffect(() => {
    if (userRole === 'admin') {
      loadVendedores()
    } else {
      setLoading(false)
      setMessage('Solo un administrador puede administrar vendedores.')
    }
  }, [userRole])

  function startEdit(vendedor: Vendedor) {
    setEditingId(vendedor.id)
    setEditName(vendedor.full_name)
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  async function saveVendedor(vendedor: Vendedor) {
    const cleanName = editName.trim()

    if (!cleanName) {
      setMessage('El nombre del vendedor es obligatorio.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: cleanName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendedor.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Vendedor actualizado correctamente.')
    cancelEdit()
    await loadVendedores()
  }

  async function toggleActive(vendedor: Vendedor) {
    const action = vendedor.active ? 'desactivar' : 'activar'

    if (!window.confirm(`¿Deseas ${action} al vendedor "${vendedor.full_name}"?`)) {
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        active: !vendedor.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendedor.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(
      vendedor.active
        ? 'Vendedor desactivado correctamente.'
        : 'Vendedor activado correctamente.'
    )

    await loadVendedores()
  }

  if (userRole !== 'admin') {
    return (
      <main className="app-shell">
        <button className="back-button" onClick={onBack}>
          ← Volver
        </button>

        <header className="page-header">
          <span className="brand-mini">MODAS SOPHIE</span>
          <h1>Vendedores</h1>
          <p>Administración de vendedores.</p>
        </header>

        <section className="inventory-card">
          <p className="form-message">
            Solo un administrador puede administrar vendedores.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        ← Volver
      </button>

      <header className="page-header">
        <span className="brand-mini">MODAS SOPHIE</span>
        <h1>Vendedores</h1>
        <p>Administra los vendedores que pueden realizar ventas.</p>
      </header>

      <section className="inventory-card">
        <div className="section-heading">
          <div>
            <span className="section-icon">👥</span>
            <h2>Vendedores registrados</h2>
            <p>{vendedores.length} vendedor(es)</p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">Cargando vendedores...</div>
        ) : vendedores.length === 0 ? (
          <div className="inventory-empty">
            No hay vendedores registrados.
          </div>
        ) : (
          <div className="inventory-list">
            {vendedores.map((vendedor) => (
              <article className="product-row" key={vendedor.id}>
                <div className="product-main">
                  <div className="product-icon">👤</div>

                  <div className="product-info">
                    {editingId === vendedor.id ? (
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder="Nombre completo"
                      />
                    ) : (
                      <>
                        <strong>{vendedor.full_name}</strong>
                        <small>Usuario: {vendedor.username}</small>
                      </>
                    )}

                    <span
                      className={
                        vendedor.active
                          ? 'stock-ok'
                          : 'stock-low'
                      }
                    >
                      {vendedor.active ? '● Activo' : '● Inactivo'}
                    </span>
                  </div>
                </div>

                <div className="product-actions">
                  {editingId === vendedor.id ? (
                    <>
                      <button
                        className="primary-button"
                        onClick={() => saveVendedor(vendedor)}
                      >
                        Guardar
                      </button>

                      <button
                        className="secondary-button"
                        onClick={cancelEdit}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="secondary-button"
                        onClick={() => startEdit(vendedor)}
                      >
                        ✏️ Editar
                      </button>

                      <button
                        className={
                          vendedor.active
                            ? 'danger-button'
                            : 'primary-button'
                        }
                        onClick={() => toggleActive(vendedor)}
                      >
                        {vendedor.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  )
}
