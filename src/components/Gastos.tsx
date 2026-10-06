import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Role = 'admin' | 'vendedor'

type Branch = {
  id: string
  name: string
  active: boolean
}

type Expense = {
  id: string
  branch_id: string
  created_by: string
  description: string
  amount: number
  created_at: string
}

type Props = {
  userRole: Role
  onBack: () => void
}

function Gastos({ userRole, onBack }: Props) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [branchId, setBranchId] = useState('')

  const [message, setMessage] = useState('')

  useEffect(() => {
    if (userRole !== 'admin') return

    loadData()
  }, [userRole])

  async function loadData() {
    setLoading(true)
    setMessage('')

    const [branchesResult, expensesResult] = await Promise.all([
      supabase
        .from('branches')
        .select('id, name, active')
        .order('name'),
      supabase
        .from('expenses')
        .select('id, branch_id, created_by, description, amount, created_at')
        .order('created_at', { ascending: false }),
    ])

    if (branchesResult.error) {
      setMessage(`Error al cargar sucursales: ${branchesResult.error.message}`)
      setLoading(false)
      return
    }

    if (expensesResult.error) {
      setMessage(`Error al cargar gastos: ${expensesResult.error.message}`)
      setLoading(false)
      return
    }

    const activeBranches = (branchesResult.data ?? []).filter(
      (branch) => branch.active
    )

    setBranches(activeBranches)
    setExpenses(expensesResult.data ?? [])

    if (!branchId && activeBranches.length > 0) {
      setBranchId(activeBranches[0].id)
    }

    setLoading(false)
  }

  function resetForm() {
    setDescription('')
    setAmount('')
    setEditingId(null)

    if (branches.length > 0) {
      setBranchId(branches[0].id)
    }

    setShowForm(false)
  }

  function openNewExpense() {
    setMessage('')
    setEditingId(null)
    setDescription('')
    setAmount('')

    if (branches.length > 0) {
      setBranchId(branches[0].id)
    }

    setShowForm(true)
  }

  function openEdit(expense: Expense) {
    setMessage('')
    setEditingId(expense.id)
    setDescription(expense.description)
    setAmount(String(expense.amount))
    setBranchId(expense.branch_id)
    setShowForm(true)
  }

  async function saveExpense() {
    setMessage('')

    const cleanDescription = description.trim()
    const numericAmount = Number(amount)

    if (!cleanDescription) {
      setMessage('Escribe el concepto del gasto.')
      return
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage('El monto debe ser mayor a $0.00.')
      return
    }

    if (!branchId) {
      setMessage('Selecciona una sucursal.')
      return
    }

    setSaving(true)

    if (editingId) {
      const { error } = await supabase
        .from('expenses')
        .update({
          description: cleanDescription,
          amount: numericAmount,
          branch_id: branchId,
        })
        .eq('id', editingId)

      if (error) {
        setMessage(`No se pudo actualizar el gasto: ${error.message}`)
        setSaving(false)
        return
      }

      setMessage('Gasto actualizado correctamente.')
    } else {
      const { data: authData } = await supabase.auth.getUser()

      if (!authData.user) {
        setMessage('Tu sesión ya no está activa. Inicia sesión nuevamente.')
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('expenses')
        .insert({
          branch_id: branchId,
          created_by: authData.user.id,
          description: cleanDescription,
          amount: numericAmount,
        })

      if (error) {
        setMessage(`No se pudo registrar el gasto: ${error.message}`)
        setSaving(false)
        return
      }

      setMessage('Gasto registrado correctamente.')
    }

    setSaving(false)
    resetForm()
    await loadData()
  }

  function getBranchName(id: string) {
    return branches.find((branch) => branch.id === id)?.name ?? 'Sucursal'
  }

  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount),
    0
  )

  if (userRole !== 'admin') {
    return (
      <main className="app-page">
        <button className="back-button" onClick={onBack}>
          ← Volver
        </button>

        <p className="eyebrow">MODAS SOPHIE</p>
        <h1>Gastos</h1>

        <section className="panel">
          <p>No tienes permisos para consultar los gastos.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-page">
      <button className="back-button" onClick={onBack}>
        ← Volver
      </button>

      <p className="eyebrow">MODAS SOPHIE</p>

      <div className="page-heading">
        <div>
          <h1>Gastos</h1>
          <p>Control y registro de gastos</p>
        </div>

        <button className="primary-button" onClick={openNewExpense}>
          + Nuevo gasto
        </button>
      </div>

      {message && <p className="form-message">{message}</p>}

      <section className="stats-grid">
        <article className="stat-card">
          <span>💰</span>
          <div>
            <small>Total de gastos</small>
            <strong>${totalExpenses.toFixed(2)}</strong>
          </div>
        </article>

        <article className="stat-card">
          <span>🧾</span>
          <div>
            <small>Gastos registrados</small>
            <strong>{expenses.length}</strong>
          </div>
        </article>
      </section>

      {showForm && (
        <section className="panel">
          <div className="section-heading">
            <span className="section-icon">💰</span>
            <div>
              <h2>{editingId ? 'Editar gasto' : 'Nuevo gasto'}</h2>
              <p>
                {editingId
                  ? 'Modifica la información del gasto.'
                  : 'Registra un nuevo gasto de la tienda.'}
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Concepto del gasto
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ej. Luz, renta, transporte..."
              />
            </label>

            <label>
              Monto
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>

            <label>
              Sucursal
              <select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
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

          <div className="product-actions expense-actions">
            <button
              className="primary-button"
              onClick={saveExpense}
              disabled={saving}
            >
              {saving
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Registrar gasto'}
            </button>

            <button
              className="secondary-button"
              onClick={resetForm}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <span className="section-icon">🧾</span>

          <div>
            <h2>Gastos registrados</h2>
            <p>{expenses.length} gasto(s)</p>
          </div>
        </div>

        {loading ? (
          <p>Cargando gastos...</p>
        ) : expenses.length === 0 ? (
          <p className="empty-state">
            Todavía no hay gastos registrados.
          </p>
        ) : (
          <div className="product-list">
            {expenses.map((expense) => (
              <article className="product-card" key={expense.id}>
                <div className="product-icon">💰</div>

                <div className="product-info">
                  <strong>{expense.description}</strong>

                  <small>
                    {getBranchName(expense.branch_id)}
                  </small>

                  <small>
                    {new Date(expense.created_at).toLocaleString('es-MX', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </small>
                </div>

                <strong className="product-price">
                  ${Number(expense.amount).toFixed(2)}
                </strong>

                <div className="product-actions">
                  <button
                    className="secondary-button"
                    onClick={() => openEdit(expense)}
                  >
                    ✏️ Editar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default Gastos
