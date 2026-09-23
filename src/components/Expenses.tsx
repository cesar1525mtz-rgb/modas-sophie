import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Role = 'admin' | 'vendedor'

type Expense = {
  id: string
  description: string
  amount: number
  created_at: string
  created_by: string
}

type Props = {
  userId: string
  userRole: Role
  onBack: () => void
}

export default function Expenses({ userId, userRole, onBack }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [branchId, setBranchId] = useState('')

  async function loadExpenses() {
    setLoading(true)

    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id')
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (branchError || !branch) {
      setMessage(branchError?.message || 'No se encontró una sucursal activa.')
      setLoading(false)
      return
    }

    setBranchId(branch.id)

    const { data, error } = await supabase
      .from('expenses')
      .select('id, description, amount, created_at, created_by')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setExpenses((data ?? []) as Expense[])
    setLoading(false)
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  async function saveExpense() {
    setMessage('')

    const cleanDescription = description.trim()
    const numericAmount = Number(amount)

    if (!cleanDescription) {
      setMessage('Escribe una descripción del gasto.')
      return
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage('Ingresa un importe válido mayor que cero.')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('expenses')
      .insert({
        branch_id: branchId,
        created_by: userId,
        description: cleanDescription,
        amount: numericAmount,
      })

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setDescription('')
    setAmount('')
    setMessage('Gasto registrado correctamente.')
    setSaving(false)

    await loadExpenses()
  }

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  )

  return (
    <main className="inventory-page">
      <div className="inventory-header">
        <button type="button" className="back-button" onClick={onBack}>
          ← Volver
        </button>

        <div>
          <small>MODAS SOPHIE</small>
          <h1>Gastos</h1>
          <p>Control de gastos del negocio.</p>
        </div>
      </div>

      {userRole === 'admin' && (
        <section className="inventory-list-card">
          <div className="section-title">
            <span>💰</span>
            <div>
              <h2>Registrar gasto</h2>
              <p>Captura los gastos realizados por el negocio.</p>
            </div>
          </div>

          <div className="inventory-form-grid">
            <label>
              Descripción
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ej. Pago de luz"
              />
            </label>

            <label>
              Importe
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={saveExpense}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Registrar gasto'}
          </button>

          {message && <p className="form-message">{message}</p>}
        </section>
      )}

      <section className="inventory-list-card">
        <div className="section-title">
          <span>📋</span>
          <div>
            <h2>Historial de gastos</h2>
            <p>
              {expenses.length} gasto(s) · Total: ${total.toFixed(2)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="inventory-empty">Cargando gastos...</div>
        ) : expenses.length === 0 ? (
          <div className="inventory-empty">
            No hay gastos registrados.
          </div>
        ) : (
          <div className="sales-list">
            {expenses.map((expense) => (
              <article className="sale-history-card" key={expense.id}>
                <div>
                  <strong>{expense.description}</strong>
                  <small>
                    {new Date(expense.created_at).toLocaleString('es-MX')}
                  </small>
                </div>

                <strong>${Number(expense.amount).toFixed(2)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
