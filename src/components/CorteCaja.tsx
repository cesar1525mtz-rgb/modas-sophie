import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from "./PageHeader"

type CorteCajaProps = {
  userRole: 'admin' | 'vendedor'
  onBack: () => void
}

type Branch = {
  id: string
  name: string
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

function localDateKey(date: Date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}


export default function CorteCaja({ onBack }: CorteCajaProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [cashCounted, setCashCounted] = useState('')
  const [openingCash, setOpeningCash] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => localDateKey())
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        setError('No se pudo identificar al usuario actual.')
        setLoading(false)
        return
      }

      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id,name')
        .eq('active', true)
        .order('name')

      if (branchError) {
        setError(`Error al cargar sucursales: ${branchError.message}`)
        setLoading(false)
        return
      }

      const safeBranches = (branchData ?? []) as Branch[]
      setBranches(safeBranches)

      const currentBranchId = branchId || safeBranches[0]?.id || ''

      if (!currentBranchId) {
        setCashRegister(null)
        setSales([])
        setExpenses([])
        setLoading(false)
        return
      }

      if (!branchId) {
        setBranchId(currentBranchId)
      }

      /*
       * Primero buscamos una caja abierta.
       * Si no existe, buscamos la última caja cerrada
       * correspondiente a la fecha seleccionada.
       */
      const { data: openRegisterData, error: openRegisterError } =
        await supabase
          .from('cash_registers')
          .select(
            'id,branch_id,opened_by,opened_at,opening_cash,status,closed_by,closed_at,counted_cash,expected_cash,difference'
          )
          .eq('branch_id', currentBranchId)
          .eq('status', 'open')
          .maybeSingle()

      if (openRegisterError) {
        setError(`Error al cargar caja: ${openRegisterError.message}`)
        setLoading(false)
        return
      }

      let currentRegister = openRegisterData as CashRegister | null
    // IMPORTANTE:
    // Solo una caja con status = 'open' puede ser la caja actual.
    // Una caja cerrada se conserva en la base de datos como historial,
    // pero nunca vuelve a aparecer como caja abierta.

    setCashRegister(currentRegister)

    if (!currentRegister) {
      setSales([])
      setExpenses([])
      setLoading(false)
      return
    }

      if (!currentRegister) {
        setSales([])
        setExpenses([])
        setLoading(false)
        return
      }

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id,total,payment_method,created_at,cash_register_id')
        .eq('cash_register_id', currentRegister.id)
        .order('created_at', { ascending: true })

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('id,amount,description,created_at,cash_register_id')
        .eq('cash_register_id', currentRegister.id)
        .order('created_at', { ascending: true })

      if (salesError) {
        setMessage(`Error al cargar ventas: ${salesError.message}`)
      } else {
        setSales((salesData ?? []) as Sale[])
      }

      if (expensesError) {
        setMessage(`Error al cargar gastos: ${expensesError.message}`)
      } else {
        setExpenses((expensesData ?? []) as Expense[])
      }
    } finally {
      setLoading(false)
    }
  }, [branchId, selectedDate])

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
      const date = localDateKey(new Date(sale.created_at))
      return date === selectedDate
    })
  }, [sales, selectedDate])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = localDateKey(new Date(expense.created_at))
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

  

  const handleOpenCash = async () => {
    setMessage('')

    const amount = Number(openingCash)

    if (!Number.isFinite(amount) || amount < 0) {
      setMessage('Ingresa un fondo inicial válido.')
      return
    }

    try {
      setLoading(true)

      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData.user) {
        setMessage('No se pudo identificar al usuario actual.')
        return
      }

      if (!branchId) {
        setMessage('No hay una sucursal activa seleccionada.')
        return
      }

      const { error: insertError } = await supabase
        .from('cash_registers')
        .insert({
          branch_id: branchId,
          opened_by: authData.user.id,
          opening_cash: amount,
          status: 'open',
        })

      if (insertError) {
        if (
          insertError.message.toLowerCase().includes('one_open_cash_register') ||
          insertError.message.toLowerCase().includes('duplicate')
        ) {
          setMessage('Ya existe una caja abierta para esta sucursal.')
        } else {
          setMessage(`No se pudo abrir la caja: ${insertError.message}`)
        }
        return
      }

      setOpeningCash('')
      setMessage('✅ Caja abierta correctamente.')
      await loadData()
      window.dispatchEvent(new Event('modas-sophie-data-updated'))
    } finally {
      setLoading(false)
    }
  }

  const handleCloseCash = async () => {
    setMessage('')

    if (!cashRegister) {
      setMessage('No hay una caja abierta.')
      return
    }

    if (cashCounted.trim() === '') {
      setMessage('Ingresa el efectivo contado antes de cerrar la caja.')
      return
    }

    const counted = Number(cashCounted)

    if (!Number.isFinite(counted) || counted < 0) {
      setMessage('Ingresa un efectivo contado válido.')
      return
    }

    try {
      setLoading(true)

      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData.user) {
        setMessage('No se pudo identificar al usuario actual.')
        return
      }

      const { error: closeError } = await supabase
        .from('cash_registers')
        .update({
          status: 'closed',
          closed_by: authData.user.id,
          closed_at: new Date().toISOString(),
          counted_cash: counted,
          expected_cash: efectivoEsperado,
          difference: counted - efectivoEsperado,
        })
        .eq('id', cashRegister.id)

      if (closeError) {
        setMessage(`No se pudo cerrar la caja: ${closeError.message}`)
        return
      }

      setCashCounted('')
      setMessage('✅ Caja cerrada correctamente.')
      setCashRegister(null)
      setSales([])
      setExpenses([])
      window.dispatchEvent(new Event('modas-sophie-data-updated'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="inventory-page cash-cut-page">
      <PageHeader
        title="Corte de caja"
        subtitle="Consulta y realiza el corte de caja."
        onBack={onBack}
      />

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
            <strong style={{ fontSize: '20px' }}>Fecha del corte</strong>
            <div style={{ color: '#777', marginTop: '4px' }}>
              Selecciona el día que deseas consultar.
            </div>
          </div>

          <input
            id="corte-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            style={{
              minHeight: '44px',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '10px',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />

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

      {!cashRegister ? (
        <section className="inventory-section">
          <h2>Abrir caja</h2>
          <p>Registra el fondo inicial antes de comenzar a trabajar.</p>

          <div style={{ display: 'grid', gap: '12px', maxWidth: '420px' }}>
            <label htmlFor="opening-cash">
              <strong>Fondo inicial</strong>
            </label>

            <input
              id="opening-cash"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={openingCash}
              onChange={(event) => setOpeningCash(event.target.value)}
              placeholder="Ej. 500"
              style={{
                minHeight: '48px',
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: '10px',
                fontSize: '17px',
                boxSizing: 'border-box',
              }}
            />

            <button
              type="button"
              onClick={handleOpenCash}
              disabled={loading}
              style={{
                minHeight: '48px',
                padding: '10px 18px',
                border: '0',
                borderRadius: '12px',
                background: '#8f3d63',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Abrir caja
            </button>
          </div>
        </section>
      ) : (
        <section className="inventory-section">
          <h2>Caja abierta</h2>

          <div
            style={{
              display: 'grid',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <div>
              <strong>Fondo inicial:</strong>{' '}
              {money(Number(cashRegister.opening_cash ?? 0))}
            </div>

            <div>
              <strong>Efectivo esperado:</strong>{' '}
              {money(efectivoEsperado)}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px', maxWidth: '420px' }}>
            <label htmlFor="cash-counted">
              <strong>Efectivo contado</strong>
            </label>

            <input
              id="cash-counted"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={cashCounted}
              onChange={(event) => setCashCounted(event.target.value)}
              placeholder="Ingresa el efectivo contado"
              style={{
                minHeight: '48px',
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: '10px',
                fontSize: '17px',
                boxSizing: 'border-box',
              }}
            />

            {diferencia !== null && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: diferencia === 0 ? '#e8f7ee' : '#fff4e5',
                  border: '1px solid #ead5e0',
                }}
              >
                <strong>Diferencia:</strong> {money(diferencia)}
              </div>
            )}

            <button
              type="button"
              onClick={handleCloseCash}
              disabled={loading}
              style={{
                minHeight: '48px',
                padding: '10px 18px',
                border: '0',
                borderRadius: '12px',
                background: '#8f3d63',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cerrar caja
            </button>
          </div>
        </section>
      )}

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
              <strong>{money(Number(totalVentas))}</strong>
            </article>

            <article className="stat-card">
              <span>💵</span>
              <small>Efectivo</small>
              <strong>{money(Number(efectivo))}</strong>
            </article>

            <article className="stat-card">
              <span>💳</span>
              <small>Tarjeta</small>
              <strong>{money(Number(tarjeta))}</strong>
            </article>

            <article className="stat-card">
              <span>🏦</span>
              <small>Transferencia</small>
              <strong>{money(Number(transferencia))}</strong>
            </article>
          </section>

          <section className="inventory-section">
            <h2>Resumen del corte</h2>

            <div className="sale-detail-summary">
              <span>
                <strong>Ventas del día:</strong> {sales.length}
              </span>

              <span>
                <strong>Gastos:</strong> {money(Number(totalGastos))}
              </span>

              <span>
                <strong>Otros pagos:</strong> {money(Number(otras))}
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
            <h2>Gastos del día</h2>

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

                    <div>
                      {money(Number(expense.amount))}
                    </div>

                    <small style={{ color: '#777' }}>
                      {new Date(
                        expense.created_at
                      ).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {message && (
        <p className="form-message">
          {message}
        </p>
      )}
    </main>
  )
}

