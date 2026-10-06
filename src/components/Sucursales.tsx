import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Role = 'admin' | 'vendedor'

type Branch = {
  id: string
  name: string
  address: string | null
  active: boolean
}

type Props = {
  userRole: Role
  onBack: () => void
}

export default function Sucursales({ userRole, onBack }: Props) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  const isAdmin = userRole === 'admin'

  async function loadBranches() {
    setLoading(true)

    const { data, error } = await supabase
      .from('branches')
      .select('id, name, address, active')
      .order('created_at', { ascending: true })

    if (error) {
      setMessage(`Error al cargar sucursales: ${error.message}`)
      setLoading(false)
      return
    }

    setBranches(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadBranches()
  }, [])

  function openNew() {
    setEditingId(null)
    setName('')
    setAddress('')
    setMessage('')
    setShowForm(true)
  }

  function openEdit(branch: Branch) {
    setEditingId(branch.id)
    setName(branch.name)
    setAddress(branch.address ?? '')
    setMessage('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setAddress('')
  }

  async function saveBranch() {
    if (!isAdmin) return

    const cleanName = name.trim()
    const cleanAddress = address.trim()

    if (!cleanName) {
      setMessage('El nombre de la sucursal es obligatorio.')
      return
    }

    setMessage('')

    if (editingId) {
      const { error } = await supabase
        .from('branches')
        .update({
          name: cleanName,
          address: cleanAddress || null,
        })
        .eq('id', editingId)

      if (error) {
        setMessage(`No se pudo actualizar: ${error.message}`)
        return
      }

      setMessage('Sucursal actualizada correctamente.')
    } else {
      const { error } = await supabase
        .from('branches')
        .insert({
          name: cleanName,
          address: cleanAddress || null,
          active: true,
        })

      if (error) {
        setMessage(`No se pudo registrar: ${error.message}`)
        return
      }

      setMessage('Sucursal registrada correctamente.')
    }

    closeForm()
    await loadBranches()
  }

  async function toggleActive(branch: Branch) {
    if (!isAdmin) return

    const action = branch.active ? 'desactivar' : 'activar'

    if (!window.confirm(`¿Deseas ${action} la sucursal "${branch.name}"?`)) {
      return
    }

    const { error } = await supabase
      .from('branches')
      .update({ active: !branch.active })
      .eq('id', branch.id)

    if (error) {
      setMessage(`No se pudo modificar la sucursal: ${error.message}`)
      return
    }

    setMessage(
      branch.active
        ? 'Sucursal desactivada correctamente.'
        : 'Sucursal activada correctamente.'
    )

    await loadBranches()
  }

  return (
    <main className="page sucursales-page">
      <div className="page-header">
        <div>
          <button className="back-button" onClick={onBack}>
            ← Volver
          </button>

          <div className="brand-small">MODAS SOPHIE</div>

          <h1>Sucursales</h1>
          <p>Tiendas y sucursales</p>
        </div>

        {isAdmin && (
          <button className="primary-button" onClick={openNew}>
            + Nueva sucursal
          </button>
        )}
      </div>

      {message && <p className="form-message">{message}</p>}

      {showForm && isAdmin && (
        <section className="panel">
          <div className="section-heading">
            <span className="section-icon">🏬</span>
            <div>
              <h2>{editingId ? 'Editar sucursal' : 'Nueva sucursal'}</h2>
              <p>Información de la tienda</p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Nombre de la sucursal
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. MODAS SOPHIE"
              />
            </label>

            <label>
              Dirección
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Dirección de la sucursal"
                rows={3}
              />
            </label>
          </div>

          <div className="product-actions">
            <button className="primary-button" onClick={saveBranch}>
              Guardar
            </button>

            <button className="secondary-button" onClick={closeForm}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <span className="section-icon">🏬</span>
          <div>
            <h2>Sucursales registradas</h2>
            <p>{branches.length} sucursal(es)</p>
          </div>
        </div>

        {loading ? (
          <p>Cargando sucursales...</p>
        ) : branches.length === 0 ? (
          <p className="empty-state">No hay sucursales registradas.</p>
        ) : (
          <div className="product-list">
            {branches.map((branch) => (
              <article className="product-card" key={branch.id}>
                <div className="product-icon">🏬</div>

                <div className="product-info">
                  <strong>{branch.name}</strong>

                  <small>
                    {branch.address || 'Sin dirección registrada'}
                  </small>

                  <span
                    className={
                      branch.active ? 'stock-ok' : 'stock-low'
                    }
                  >
                    {branch.active ? '● Activa' : '● Inactiva'}
                  </span>
                </div>

                {isAdmin && (
                  <div className="product-actions">
                    <button
                      className="secondary-button"
                      onClick={() => openEdit(branch)}
                    >
                      ✏️ Editar
                    </button>

                    <button
                      className={
                        branch.active
                          ? 'danger-button'
                          : 'primary-button'
                      }
                      onClick={() => toggleActive(branch)}
                    >
                      {branch.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
