import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Role = 'admin' | 'vendedor'

type Branch = {
  id: string
  name: string
  active: boolean
}

type Vendedor = {
  id: string
  username: string
  full_name: string
  role: Role
  active: boolean
  branch_id: string
  branch_name: string
}

type VendedoresProps = {
  userRole: Role
  onBack: () => void
}

export default function Vendedores({ userRole, onBack }: VendedoresProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newBranchId, setNewBranchId] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBranchId, setEditBranchId] = useState('')

  async function loadData() {
    setLoading(true)
    setMessage('')

    const [{ data: profiles, error: profilesError }, { data: branchData, error: branchError }, { data: assignments, error: assignmentError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, full_name, role, active')
          .eq('role', 'vendedor')
          .order('username'),
        supabase
          .from('branches')
          .select('id, name, active')
          .eq('active', true)
          .order('name'),
        supabase
          .from('employee_branches')
          .select('user_id, branch_id, active')
          .eq('active', true),
      ])

    if (profilesError || branchError || assignmentError) {
      setMessage(
        profilesError?.message ||
          branchError?.message ||
          assignmentError?.message ||
          'No se pudieron cargar los vendedores.'
      )
      setLoading(false)
      return
    }

    const branchList = (branchData ?? []) as Branch[]
    const assignmentList = assignments ?? []

    const result: Vendedor[] = ((profiles ?? []) as Omit<Vendedor, 'branch_id' | 'branch_name'>[]).map(
      (profile) => {
        const assignment = assignmentList.find(
          (item) => item.user_id === profile.id
        )
        const branch = branchList.find(
          (item) => item.id === assignment?.branch_id
        )

        return {
          ...profile,
          branch_id: assignment?.branch_id ?? '',
          branch_name: branch?.name ?? 'Sin sucursal',
        }
      }
    )

    setBranches(branchList)
    setVendedores(result)

    if (!newBranchId && branchList.length > 0) {
      setNewBranchId(branchList[0].id)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (userRole === 'admin') {
      loadData()
    } else {
      setLoading(false)
      setMessage('Solo un administrador puede administrar vendedores.')
    }
  }, [userRole])

  function resetCreateForm() {
    setNewName('')
    setNewUsername('')
    setNewPassword('')
    setNewBranchId(branches[0]?.id ?? '')
  }

  async function createEmployee() {
    const cleanName = newName.trim()
    const cleanUsername = newUsername.trim().toLowerCase()

    if (!cleanName || !cleanUsername || !newPassword || !newBranchId) {
      setMessage('Completa todos los campos para crear el empleado.')
      return
    }

    if (newPassword.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setSaving(true)
    setMessage('Creando empleado...')

    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: {
        username: cleanUsername,
        full_name: cleanName,
        password: newPassword,
        branch_id: newBranchId,
      },
    })

    if (error) {
      setMessage(error.message || 'No se pudo crear el empleado.')
      setSaving(false)
      return
    }

    if (data?.error) {
      setMessage(data.error)
      setSaving(false)
      return
    }

    setMessage('Empleado creado correctamente.')
    resetCreateForm()
    setShowCreate(false)
    setSaving(false)
    await loadData()
  }

  function startEdit(vendedor: Vendedor) {
    setEditingId(vendedor.id)
    setEditName(vendedor.full_name)
    setEditBranchId(vendedor.branch_id)
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditBranchId('')
  }

  async function saveVendedor(vendedor: Vendedor) {
    const cleanName = editName.trim()

    if (!cleanName) {
      setMessage('El nombre del vendedor es obligatorio.')
      return
    }

    if (!editBranchId) {
      setMessage('Selecciona una sucursal.')
      return
    }

    setSaving(true)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: cleanName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendedor.id)

    if (profileError) {
      setMessage(profileError.message)
      setSaving(false)
      return
    }

    if (editBranchId !== vendedor.branch_id) {
      if (vendedor.branch_id) {
        await supabase
          .from('employee_branches')
          .delete()
          .eq('user_id', vendedor.id)
          .eq('branch_id', vendedor.branch_id)
      }

      const { error: branchError } = await supabase
        .from('employee_branches')
        .upsert({
          user_id: vendedor.id,
          branch_id: editBranchId,
          active: true,
        })

      if (branchError) {
        setMessage(branchError.message)
        setSaving(false)
        return
      }
    }

    setMessage('Vendedor actualizado correctamente.')
    cancelEdit()
    setSaving(false)
    await loadData()
  }

  async function toggleActive(vendedor: Vendedor) {
    const action = vendedor.active ? 'desactivar' : 'activar'

    if (!window.confirm(`¿Deseas ${action} al vendedor "${vendedor.full_name}"?`)) {
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        active: !vendedor.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendedor.id)

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    await supabase
      .from('employee_branches')
      .update({
        active: !vendedor.active,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', vendedor.id)

    setMessage(
      vendedor.active
        ? 'Vendedor desactivado correctamente.'
        : 'Vendedor activado correctamente.'
    )

    setSaving(false)
    await loadData()
  }

  if (userRole !== 'admin') {
    return (
      <main className="app-shell vendedores-page">
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
        <p>Administra empleados, accesos y sucursales.</p>
      </header>

      <section className="inventory-card">
        <div className="section-heading">
          <div>
            <span className="section-icon">👥</span>
            <h2>Vendedores registrados</h2>
            <p>{vendedores.length} vendedor(es)</p>
          </div>

          <button
            className="primary-button"
            onClick={() => {
              setShowCreate(!showCreate)
              setMessage('')
              if (!showCreate) resetCreateForm()
            }}
          >
            {showCreate ? 'Cancelar' : '+ Agregar empleado'}
          </button>
        </div>

        {showCreate && (
          <div className="inventory-card">
            <h3>Nuevo empleado</h3>

            <div className="form-grid">
              <label>
                Nombre completo
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Ej. María López"
                />
              </label>

              <label>
                Usuario
                <input
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  placeholder="Ej. maria"
                  autoCapitalize="none"
                />
              </label>

              <label>
                Contraseña
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>

              <label>
                Sucursal
                <select
                  value={newBranchId}
                  onChange={(event) => setNewBranchId(event.target.value)}
                >
                  <option value="">Selecciona una sucursal</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              className="primary-button"
              onClick={createEmployee}
              disabled={saving}
            >
              {saving ? 'Creando...' : 'Crear empleado'}
            </button>
          </div>
        )}

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
                      <>
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          placeholder="Nombre completo"
                        />

                        <select
                          value={editBranchId}
                          onChange={(event) =>
                            setEditBranchId(event.target.value)
                          }
                        >
                          <option value="">Selecciona una sucursal</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <strong>{vendedor.full_name}</strong>
                        <small>Usuario: {vendedor.username}</small>
                        <small>
                          Sucursal: {vendedor.branch_name}
                        </small>
                      </>
                    )}

                    <span
                      className={
                        vendedor.active ? 'stock-ok' : 'stock-low'
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
                        disabled={saving}
                      >
                        Guardar
                      </button>

                      <button
                        className="secondary-button"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="secondary-button"
                        onClick={() => startEdit(vendedor)}
                        disabled={saving}
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
                        disabled={saving}
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
