import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type CorteCajaProps = {
  userRole: 'admin' | 'vendedor'
  onBack: () => void
}

type Sale = {
  id: string
  total: number
  payment_method: string
  created_at: string
}

type Expense = {
  id: string
  amount: number
  description: string
  created_at: string
}

type CashRegister = {
  id: string
  branch_id: string
  opening_cash: number
  status: string
  opened_at: string
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

export default function CorteCaja({ onBack }: CorteCajaProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [cashCounted, setCashCounted] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return now.toISOString().slice(0, 10)
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        setMessage('No se pudo identificar al usuario actual.')
        setSales([])
        setExpenses([])
        setCashRegister(null)
        return
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (userError) {
        setMessage(`Error al cargar sucursal: ${userError.message}`)
        return
      }

      if (!userData?.branch_id) {
        setMessage('El usuario no tiene una sucursal asignada.')
        setSales([])
        setExpenses([])
        setCashRegister(null)
        return
      }

      const { data: registerData, error: registerError } = await supabase
        .from('cash_registers')
        .select('id,branch_id,opening_cash,status,opened_at')
        .eq('branch_id', userData.branch_id)
        .eq('status', 'open')
        .maybeSingle()

      if (registerError) {
        setMessage(`Error al cargar caja: ${registerError.message}`)
        return
      }

      const currentRegister = (registerData ?? null) as CashRegister | null
      setCashRegister(currentRegister)

      if (!currentRegister) {
        setSales([])
        setExpenses([])
        return
      }

      const [salesResult, expensesResult] = await Promise.all([
        supabase
          .from('sales')
          .select('id,total,payment_method,created_at,cash_register_id')
          .eq('cash_register_id', currentRegister.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('expenses')
          .select('id,amount,description,created_at,cash_register_id')
          .eq('cash_register_id', currentRegister.id)
          .order('created_at', { ascending: true }),
      ])

      if (salesResult.error) {
        setMessage(`Error al cargar ventas: ${salesResult.error.message}`)
      } else {
        setSales((salesResult.data || []) as Sale[])
      }

      if (expensesResult.error) {
        setMessage(`Error al cargar gastos: ${expensesResult.error.message}`)
      } else {
        setExpenses((expensesResult.data || []) as Expense[])
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al cargar el corte.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const handleDataUpdated = () => {
      loadData()
    }

    window.addEventListener('modas-sophie-data-updated', handleDataUpdated)

    return () => {
      window.removeEventListener('modas-sophie-data-updated', handleDataUpdated)
    }
  }, [loadData])

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const date = new Date(sale.created_at).toISOString().slice(0, 10)
      return date === selectedDate
    })
  }, [sales, selectedDate])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = new Date(expense.created_at).toISOString().slice(0, 10)
      return date === selectedDate
    })
  }, [expenses, selectedDate])

  const efectivo = useMemo(
    () =>
      filteredSales
        .filter((sale) => sale.payment_method === 'efectivo')
        .reduce((sum, sale) => sum + Number(sale.total), 0),
    [filteredSales]
  )

  const tarjeta = useMemo(
    () =>
      filteredSales
        .filter((sale) => sale.payment_method === 'tarjeta')
        .reduce((sum, sale) => sum + Number(sale.total), 0),
    [filteredSales]
  )

  const transferencia = useMemo(
    () =>
      filteredSales
        .filter((sale) => sale.payment_method === 'transferencia')
        .reduce((sum, sale) => sum + Number(sale.total), 0),
    [filteredSales]
  )

  const otras = useMemo(
    () =>
      filteredSales
        .filter(
          (sale) =>
            !['efectivo', 'tarjeta', 'transferencia'].includes(
              sale.payment_method
            )
        )
        .reduce((sum, sale) => sum + Number(sale.total), 0),
    [filteredSales]
  )

  const totalVentas = efectivo + tarjeta + transferencia + otras

  const totalGastos = useMemo(
    () =>
      filteredExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
      ),
    [filteredExpenses]
  )

  // El efectivo esperado parte del fondo inicial,
  // suma las ventas en efectivo y resta los gastos de esta caja.
  const efectivoEsperado =
    Number(cashRegister?.opening_cash ?? 0) +
    efectivo -
    totalGastos

  const contado = Number(cashCounted || 0)
  const diferencia =
    cashCounted.trim() === '' ? null : contado - efectivoEsperado

  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="inventory-page">
      <div className="inventory-header">
        <div>
          <button type="button" className="back-button" onClick={onBack}>
            ← Volver
          </button>

          <span className="eyebrow">MODAS SOPHIE</span>
          <h1>💰 Corte de caja</h1>

        <section className="inventory-section">
          <label
            htmlFor="corte-date"
            style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '8px',
            }}
          >
            📅 Fecha del corte
          </label>

          <input
            id="corte-date"
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value)
              setCashCounted('')
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '14px',
              borderRadius: '14px',
              border: '1px solid #ddd',
              fontSize: '18px',
            }}
          />

          <div style={{ marginTop: '8px', color: '#777' }}>
            Mostrando únicamente las ventas y gastos de esta fecha.
          </div>
        </section>
          <p>Resumen de movimientos del día.</p>
        </div>
      </div>

      <section className="inventory-section">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong style={{ fontSize: '20px' }}>Corte del día</strong>
            <div style={{ marginTop: '4px', color: '#777' }}>
              {fecha}
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="back-button"
          >
            🔄 Actualizar
          </button>
        </div>
      </section>

      {loading ? (
        <section className="inventory-section">
          <div className="inventory-empty">Cargando corte...</div>
        </section>
      ) : (
        <>
          <section className="dashboard-stats">
            <article className="stat-card">
              <span>💰</span>
              <small>Ventas</small>
              <strong>{money(totalVentas)}</strong>
            </article>

            <article className="stat-card">
              <span>💵</span>
              <small>Efectivo</small>
              <strong>{money(efectivo)}</strong>
            </article>

            <article className="stat-card">
              <span>💳</span>
              <small>Tarjeta</small>
              <strong>{money(tarjeta)}</strong>
            </article>

            <article className="stat-card">
              <span>📱</span>
              <small>Transferencia</small>
              <strong>{money(transferencia)}</strong>
            </article>
          </section>

          <section className="inventory-section">
            <h2>Resumen del corte</h2>

            <div className="sale-detail-summary">
              <span>
                <strong>Ventas del día:</strong> {sales.length}
              </span>

              <span>
                <strong>Gastos:</strong> {money(totalGastos)}
              </span>

              <span>
                <strong>Otros pagos:</strong> {money(otras)}
              </span>
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '18px',
                borderRadius: '18px',
                background: '#fff7fb',
                border: '1px solid #ead5e0',
              }}
            >
              <div style={{ color: '#777', marginBottom: '6px' }}>
                Efectivo esperado en caja
              </div>

              <strong style={{ fontSize: '32px' }}>
                {money(efectivoEsperado)}
              </strong>

              <div style={{ color: '#777', marginTop: '6px' }}>
                Ventas en efectivo − gastos registrados
              </div>
            </div>
          </section>

          <section className="inventory-section">
            <h2>💵 Contar caja</h2>
            <p style={{ color: '#777' }}>
              Introduce cuánto efectivo tienes físicamente en la caja.
            </p>

            <label
              htmlFor="cash-counted"
              style={{
                display: 'block',
                marginTop: '16px',
                fontWeight: 600,
              }}
            >
              Efectivo contado
            </label>

            <input
              id="cash-counted"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={cashCounted}
              onChange={(event) => setCashCounted(event.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginTop: '8px',
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid #ddd',
                fontSize: '22px',
              }}
            />

            {diferencia !== null && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '18px',
                  borderRadius: '18px',
                  background:
                    diferencia === 0
                      ? '#e9f8ef'
                      : diferencia > 0
                        ? '#eef6ff'
                        : '#fff0f0',
                  border: '1px solid #ddd',
                }}
              >
                <div style={{ color: '#777' }}>Diferencia del corte</div>

                <strong style={{ fontSize: '30px' }}>
                  {diferencia >= 0 ? '+' : ''}
                  {money(diferencia)}
                </strong>

                <div style={{ marginTop: '6px' }}>
                  {diferencia === 0
  ? '✅ Caja cuadrada'
  : diferencia > 0
  ? `🟢 Sobrante de ${money(diferencia)}`
  : `🔴 Faltante de ${money(Math.abs(diferencia))}`}
                </div>
              </div>
            )}
          </section>

          <section className="inventory-section">
            <h2>🧾 Gastos del día</h2>

            {expenses.length === 0 ? (
              <div className="inventory-empty">
                No hay gastos registrados hoy.
              </div>
            ) : (
              <div>
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <strong>{expense.description || 'Gasto'}</strong>
                    <div>{money(Number(expense.amount))}</div>
                    <small style={{ color: '#777' }}>
                      {new Date(expense.created_at).toLocaleTimeString(
                        'es-MX',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {message && <p className="form-message">{message}</p>}
    </main>
  )
}
