import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type CajaProps = {
  userId: string
  userRole: string
  onBack: () => void
}

type Branch = {
  id: string
  name: string
}

type CashRegister = {
  id: string
  branch_id: string
  opened_by: string
  opened_at: string
  opening_cash: number
  status: 'open' | 'closed'
  closed_by: string | null
  closed_at: string | null
  counted_cash: number | null
  expected_cash: number | null
  difference: number | null
  notes: string | null
}

type Sale = {
  total: number
  payment_method: string
}

type Expense = {
  amount: number
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

export default function Caja({ userId, userRole, onBack }: CajaProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)

  const [openingCash, setOpeningCash] = useState(() => {
    return localStorage.getItem('modas-sophie-opening-cash') ?? ''
  })
  const [cashCounted, setCashCounted] = useState(() => {
    return localStorage.getItem('modas-sophie-cash-counted') ?? ''
  })

  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadCaja = useCallback(async () => {
    setLoading(true)
    setError('')
    setMessage('')

    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('id,name')
      .eq('active', true)
      .order('name')

    if (branchError) {
      setError(branchError.message)
      setLoading(false)
      return
    }

    const safeBranches = (branchData ?? []) as Branch[]
    setBranches(safeBranches)

    const currentBranchId = branchId || safeBranches[0]?.id || ''

    if (!currentBranchId) {
      setLoading(false)
      return
    }

    if (!branchId) {
      setBranchId(currentBranchId)
    }

    const { data: registerData, error: registerError } = await supabase
      .from('cash_registers')
      .select(
        'id,branch_id,opened_by,opened_at,opening_cash,status,closed_by,closed_at,counted_cash,expected_cash,difference,notes'
      )
      .eq('branch_id', currentBranchId)
      .eq('status', 'open')
      .maybeSingle()

    if (registerError) {
      setError(registerError.message)
      setLoading(false)
      return
    }

    const currentRegister = (registerData ?? null) as CashRegister | null
    setCashRegister(currentRegister)

    if (currentRegister) {
      const [salesResult, expensesResult] = await Promise.all([
        supabase
          .from('sales')
          .select('total,payment_method')
          .eq('cash_register_id', currentRegister.id),

        supabase
          .from('expenses')
          .select('amount')
          .eq('cash_register_id', currentRegister.id),
      ])

      if (salesResult.error) {
        setError(salesResult.error.message)
      } else {
        setSales((salesResult.data ?? []) as Sale[])
      }

      if (expensesResult.error) {
        setError(expensesResult.error.message)
      } else {
        setExpenses((expensesResult.data ?? []) as Expense[])
      }
    } else {
      setSales([])
      setExpenses([])
    }

    setLoading(false)
  }, [branchId])

  useEffect(() => {
    loadCaja()

    const handleDataUpdated = () => {
      loadCaja()
    }

    window.addEventListener('modas-sophie-data-updated', handleDataUpdated)

    return () => {
      window.removeEventListener('modas-sophie-data-updated', handleDataUpdated)
    }
  }, [loadCaja])

  const efectivoVentas = useMemo(
    () =>
      sales
        .filter((sale) => sale.payment_method === 'efectivo')
        .reduce((sum, sale) => sum + Number(sale.total), 0),
    [sales]
  )

  const totalGastos = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [expenses]
  )

  useEffect(() => {
    localStorage.setItem('modas-sophie-opening-cash', openingCash)
  }, [openingCash])

  useEffect(() => {
    localStorage.setItem('modas-sophie-cash-counted', cashCounted)
  }, [cashCounted])

  const efectivoEsperado = useMemo(
    () =>
      Number(cashRegister?.opening_cash ?? 0) +
      efectivoVentas -
      totalGastos,
    [cashRegister, efectivoVentas, totalGastos]
  )

  const diferencia =
    cashCounted.trim() === ''
      ? null
      : Number(cashCounted) - efectivoEsperado

  async function abrirCaja() {
    setError('')
    setMessage('')

    if (!branchId) {
      setError('Selecciona una sucursal.')
      return
    }

    
  if (openingCash.trim() === '') {
    setError('Ingresa el efectivo inicial para abrir la caja.')
    return
  }

  const amount = Number(openingCash)

  if (!Number.isFinite(amount) || amount < 0) {
    setError('Ingresa un efectivo inicial válido.')
    return
  }

setSaving(true)

    const { error: insertError } = await supabase
      .from('cash_registers')
      .insert({
        branch_id: branchId,
        opened_by: userId,
        opening_cash: amount,
        status: 'open',
      })

    if (insertError) {
      setError(
        insertError.code === '23505'
          ? 'Esta sucursal ya tiene una caja abierta.'
          : insertError.message
      )
      setSaving(false)
      return
    }

    setOpeningCash('')
    localStorage.removeItem('modas-sophie-opening-cash')
    setMessage('Caja abierta correctamente.')
    setSaving(false)

    window.dispatchEvent(new Event('modas-sophie-data-updated'))
    await loadCaja()
  }

  async function cerrarCaja() {
    setError('')
    setMessage('')

    if (!cashRegister) {
      setError('No hay una caja abierta.')
      return
    }

    if (cashCounted.trim() === '') {
      setError('Ingresa el efectivo contado físicamente.')
      return
    }

    const counted = Number(cashCounted)

    if (!Number.isFinite(counted) || counted < 0) {
      setError('Ingresa un efectivo contado válido.')
      return
    }

    setSaving(true)

    const { data: closedRegister, error: updateError } = await supabase
      .from('cash_registers')
      .update({
        status: 'closed',
        closed_by: userId,
        closed_at: new Date().toISOString(),
        counted_cash: counted,
        expected_cash: efectivoEsperado,
        difference: counted - efectivoEsperado,
      })
      .eq('id', cashRegister.id)
      .eq('status', 'open')
      .select('id,status,closed_at')
      .maybeSingle()

    if (updateError) {
      setError(`No se pudo cerrar la caja: ${updateError.message}`)
      setSaving(false)
      return
    }

    if (!closedRegister || closedRegister.status !== 'closed') {
      setError(
        'La caja no pudo cerrarse realmente en la base de datos. Verifica los permisos de la caja e inténtalo nuevamente.'
      )
      setSaving(false)
      return
    }

    setCashCounted('')
    localStorage.removeItem('modas-sophie-cash-counted')
    setMessage('Caja cerrada correctamente.')
    setSaving(false)

    window.dispatchEvent(new Event('modas-sophie-data-updated'))
    await loadCaja()
  }

  const branchName =
    branches.find((branch) => branch.id === branchId)?.name ?? 'Sucursal'

  if (loading) {
    return (
      <main className="inventory-page caja-page">
        <section className="inventory-empty">
          <div>Cargando caja...</div>
        </section>
      </main>
    )
  }

  return (
    <main className="inventory-page caja-page">
      <div className="inventory-header">
        <div>
          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ← Volver
          </button>

          <span className="eyebrow">MODAS SOPHIE</span>
          <h1>Caja</h1>
        </div>
      </div>

      <section className="inventory-section">
        <label htmlFor="caja-branch">
          Sucursal
        </label>

        <select
          id="caja-branch"
          value={branchId}
          onChange={(event) => {
            setBranchId(event.target.value)
            setCashRegister(null)
            setCashCounted('')
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '14px',
            borderRadius: '14px',
            border: '1px solid #ddd',
            fontSize: '17px',
          }}
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <div
          style={{
            marginTop: '18px',
            padding: '18px',
            borderRadius: '18px',
            background: '#f7f7fb',
            border: '1px solid #ead5e0',
          }}
        >
          <strong>Sucursal actual</strong>
          <div style={{ fontSize: '20px', marginTop: '6px' }}>
            {branchName}
          </div>
        </div>
      </section>

      {error && (
        <section className="inventory-section">
          <div
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: '#fff1f1',
              border: '1px solid #e5a5a5',
              color: '#a40000',
            }}
          >
            {error}
          </div>
        </section>
      )}

      {message && (
        <section className="inventory-section">
          <div
            style={{
              padding: '14px',
              borderRadius: '14px',
              background: '#effaf1',
              border: '1px solid #a8d5ae',
              color: '#176b25',
            }}
          >
            {message}
          </div>
        </section>
      )}

      {!cashRegister ? (
        <section className="inventory-section">
          <h2>🟢 Abrir caja</h2>

          <p style={{ color: '#777' }}>
            Introduce el efectivo con el que comienzas a trabajar.
          </p>

          <label htmlFor="opening-cash">
            Efectivo inicial
          </label>

          <input
            id="opening-cash"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={openingCash}
            onChange={(event) => setOpeningCash(event.target.value)}
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

          <button
            type="button"
            onClick={abrirCaja}
            disabled={saving}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {saving ? 'Abriendo caja...' : '🟢 Abrir caja'}
          </button>
        </section>
      ) : (
        <>
          <section className="inventory-section">
            <h2>🟢 Caja abierta</h2>

            <div className="sale-detail-summary">
              <span>
                <strong>Efectivo inicial:</strong>{' '}
                {money(Number(cashRegister.opening_cash))}
              </span>

              <span>
                <strong>Ventas en efectivo:</strong>{' '}
                {money(efectivoVentas)}
              </span>

              <span>
                <strong>Gastos:</strong>{' '}
                {money(totalGastos)}
              </span>
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '20px',
                borderRadius: '18px',
                background: '#f7f7fb',
                border: '1px solid #ead5e0',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#777' }}>
                Efectivo esperado en caja
              </div>

              <strong style={{ fontSize: '32px' }}>
                {money(efectivoEsperado)}
              </strong>
            </div>
          </section>

          <section className="inventory-section">
            <h2>🔴 Cerrar caja</h2>

            <p style={{ color: '#777' }}>
              Cuenta físicamente el efectivo e introdúcelo aquí.
            </p>

            <label htmlFor="cash-counted">
              Efectivo contado
            </label>

            <input
              id="cash-counted"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={cashCounted}
              onChange={(event) =>
                setCashCounted(event.target.value)
              }
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
                  borderRadius: '16px',
                  background:
                    diferencia === 0
                      ? '#effaf1'
                      : diferencia > 0
                        ? '#eef5ff'
                        : '#fff1f1',
                  border: '1px solid #ddd',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#777' }}>
                  Diferencia
                </div>

                <strong style={{ fontSize: '26px' }}>
                  {diferencia === 0
                    ? '✅ Caja cuadrada'
                    : diferencia > 0
                      ? `🟢 Sobrante de ${money(diferencia)}`
                      : `🔴 Faltante de ${money(
                          Math.abs(diferencia)
                        )}`}
                </strong>
              </div>
            )}

            <button
              type="button"
              onClick={cerrarCaja}
              disabled={saving}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '16px',
                borderRadius: '14px',
                border: 'none',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Cerrando caja...' : '🔴 Cerrar caja'}
            </button>
          </section>
        </>
      )}

      {userRole === 'admin' && (
        <section className="inventory-section">
          <p style={{ color: '#777', margin: 0 }}>
            Administrador: puedes abrir y cerrar la caja.
          </p>
        </section>
      )}
    </main>
  )
}
