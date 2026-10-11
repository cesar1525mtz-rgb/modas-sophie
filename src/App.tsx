import { useEffect, useState } from 'react'
import './App.css'
import './theme.css'
import { supabase } from './lib/supabase'
import Inventory from './components/Inventory'
import Sales from './components/Sales';
import NewSale from './components/NewSale'
import Expenses from './components/Expenses'
import Reports from './components/Reports'
import Sucursales from './components/Sucursales'
import Vendedores from './components/Vendedores'
import CorteCaja from './components/CorteCaja'
import Caja from './components/Caja'

type Role = 'admin' | 'vendedor'

type AppUser = {
  id: string
  username: string
  name: string
  role: Role
}

type Module = {
  key: string
  title: string
  description: string
  icon: string
}

const modules: Module[] = [
  {
    key: 'caja',
    title: 'Caja',
    description: 'Abrir y cerrar caja',
    icon: '💰',
  },

  {
    key: 'venta',
    title: 'Nueva venta',
    description: 'Punto de venta',
    icon: '🛍️',
  },
  {
    key: 'inventario',
    title: 'Inventario',
    description: 'Productos y existencias',
    icon: '📦',
  },
  {
    key: 'ventas',
    title: 'Ventas',
    description: 'Historial y cortes',
    icon: '🧾',
  },
  {
    key: 'corte',
    title: 'Corte de caja',
    description: 'Cierre y efectivo del día',
    icon: '💰',
  },
  {
    key: 'gastos',
    title: 'Gastos',
    description: 'Control de gastos',
    icon: '💳',
  },
  {
    key: 'reportes',
    title: 'Reportes',
    description: 'Resultados del negocio',
    icon: '📊',
  },
  {
    key: 'vendedores',
    title: 'Vendedores',
    description: 'Usuarios y permisos',
    icon: '👥',
  },
  {
    key: 'sucursales',
    title: 'Sucursales',
    description: 'Tiendas y existencias',
    icon: '🏪',
  },
]

async function loadProfile(userId: string): Promise<AppUser> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, full_name, role, active')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw new Error('Tu usuario no tiene un perfil configurado.')
  }

  if (data.active === false) {
    throw new Error('Tu usuario está inactivo.')
  }

  if (data.role !== 'admin' && data.role !== 'vendedor') {
    throw new Error('El rol de tu usuario no es válido.')
  }

  return {
    id: userId,
    username: data.username,
    name: data.full_name || data.username,
    role: data.role as Role,
  }
}

function Login({ onLogin }: { onLogin: (user: AppUser) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError('Escribe tu usuario y contraseña.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: emailData, error: lookupError } = await supabase.rpc(
        'get_login_email',
        {
          p_username: username.trim(),
        },
      )

      const email =
        typeof emailData === 'string' ? emailData : null

      if (lookupError || !email) {
        throw new Error('Usuario o contraseña incorrectos.')
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (authError || !authData.user) {
        throw new Error('Usuario o contraseña incorrectos.')
      }

      try {
        const profile = await loadProfile(authData.user.id)
        onLogin(profile)
      } catch (profileError) {
        await supabase.auth.signOut()
        throw profileError
      }
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : 'No fue posible iniciar sesión.'

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <img className="login-logo-image" src="/images/logo-modas-sophie.png" alt="Modas Sophie" />
          <div>
              <p>Administración y punto de venta</p>
          </div>
        </div>

        <div className="login-welcome">
          <span>Bienvenido</span>
          <h2>Inicia sesión</h2>
          <p>Accede de forma segura a tu cuenta.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Usuario</label>
          <div className="login-input-wrap">

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Escribe tu usuario"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <label htmlFor="password">Contraseña</label>
          <div className="password-field login-input-wrap">
            <span className="login-input-icon">◆</span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Escribe tu contraseña"
              autoComplete="current-password"
              disabled={loading}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              disabled={loading}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
) : (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
)}
            </button>
          </div>

          <div className="login-options">
            <label className="remember-option">
              <input type="checkbox" />
              <span>Recordar sesión</span>
            </label>

            <button type="button" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="login-bottom-space" aria-hidden="true" />
      </section>
    </main>
  )

}

function Dashboard({
  user,
  onLogout,
}: {
  user: AppUser
  onLogout: () => void
}) {
  const [selected, setSelected] = useState('inicio')
  const [message, setMessage] = useState('')
  const [salesToday, setSalesToday] = useState(0)
  const [productsSoldToday, setProductsSoldToday] = useState(0)
  const [expensesToday, setExpensesToday] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)

  const availableModules =
    user.role === 'admin'
      ? modules
      : modules.filter((module) =>
          ['venta', 'inventario', 'ventas', 'caja'].includes(module.key),
        )

  useEffect(() => {
    async function loadDashboard() {
      setLoadingStats(true)

      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(startOfDay)
      endOfDay.setDate(endOfDay.getDate() + 1)

      const [salesResult, expensesResult] = await Promise.all([
        supabase
          .from('sales')
          .select('id,total')
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString()),

        supabase
          .from('expenses')
          .select('amount')
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString()),
      ])

      if (salesResult.error) {
        setMessage(`No se pudieron cargar las ventas: ${salesResult.error.message}`)
        setLoadingStats(false)
        return
      }

      if (expensesResult.error) {
        setMessage(`No se pudieron cargar los gastos: ${expensesResult.error.message}`)
        setLoadingStats(false)
        return
      }

      const sales = salesResult.data ?? []
      const expenses = expensesResult.data ?? []

      const totalSales = sales.reduce(
        (sum, sale) => sum + Number(sale.total ?? 0),
        0,
      )

      const totalExpenses = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount ?? 0),
        0,
      )

      let totalProducts = 0

      if (sales.length > 0) {
        const saleIds = sales.map((sale) => sale.id)

        const { data: items, error: itemsError } = await supabase
          .from('sale_items')
          .select('quantity')
          .in('sale_id', saleIds)

        if (!itemsError) {
          totalProducts = (items ?? []).reduce(
            (sum, item) => sum + Number(item.quantity ?? 0),
            0,
          )
        }
      }

      setSalesToday(totalSales)
      setProductsSoldToday(totalProducts)
      setExpensesToday(totalExpenses)
      setLoadingStats(false)
    }

    loadDashboard()

    const handleDataUpdated = () => {
      loadDashboard()
    }

    window.addEventListener('modas-sophie-data-updated', handleDataUpdated)

    return () => {
      window.removeEventListener('modas-sophie-data-updated', handleDataUpdated)
    }
  }, [user.id])

  function openModule(module: Module) {
    setSelected(module.key)
    setMessage('')
  }

  if (selected === 'venta') {
    return (
      <NewSale
        userId={user.id}
        userRole={user.role}
        onBack={() => setSelected('inicio')}
      />
    )
  }

  if (selected === 'ventas') {
    return (
      <Sales
        userRole={user.role}
        onBack={() => setSelected('inicio')}
      />
    )
  }

  if (selected === 'corte') {
    return (
      <CorteCaja
        userRole={user.role}
        onBack={() => setSelected('inicio')}
      />
    )
  }

  if (selected === 'caja') {
    return (
      <Caja
        userId={user.id}
        userRole={user.role}
        onBack={() => setSelected('inicio')}
      />
    )
  }

  if (selected === 'gastos') {
    return (
      <Expenses
        userId={user.id}
        userRole={user.role}
        onBack={() => setSelected('inicio')}
      />
    )
  }

  if (selected === 'inventario') {
    return (
      <Inventory
        userId={user.id}
        userRole={user.role}
        onBack={() => setSelected('inicio')}
      />
    )
  }

  if (selected === 'vendedores') {
    return (
      <Vendedores
        userRole={user.role}
        onBack={() => setSelected('inicio')}
      />
    )
  }

  if (selected === 'sucursales') {
    return (
      <Sucursales
        userRole={user.role}
        onBack={() => setSelected('inicio')}
      />
    )
  }

  if (selected === 'reportes') {
    return (
      <Reports
        userRole={user.role}
        onBack={() => setSelected('inicio')}
      />
    )
  }

  const resultToday = salesToday - expensesToday

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <img
            className="login-logo-image"
            src="/images/logo-modas-sophie.png"
            alt="Modas Sophie"
          />

          <div>
            <h1>MODAS SOPHIE</h1>
            <span>
              {user.role === 'admin' ? 'Administrador' : 'Punto de venta'}
            </span>
          </div>
        </div>

        <button className="user-button" onClick={onLogout}>
          Salir
        </button>
      </header>

      <section className="dashboard-content">
        <div className="welcome">
          <div>
            <p className="eyebrow">PANEL PRINCIPAL</p>
            <h2>Hola, {user.name}! 👋</h2>
            <p>Resumen de la actividad de hoy.</p>
          </div>

          <div className="date-card">
            <span>📅</span>
            <div>
              <strong>
                {new Intl.DateTimeFormat('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date())}
              </strong>
              <small>Resumen de hoy</small>
            </div>
          </div>
        </div>

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon">💰</span>
            <div>
              <small>VENTAS HOY</small>
              <strong>
                {loadingStats ? 'Cargando...' : `$${salesToday.toFixed(2)}`}
              </strong>
            </div>
          </article>

          <article className="stat-card">
            <span className="stat-icon">🛍️</span>
            <div>
              <small>PRODUCTOS VENDIDOS</small>
              <strong>
                {loadingStats ? 'Cargando...' : productsSoldToday}
              </strong>
            </div>
          </article>

          {user.role === 'admin' && (
            <>
              <article className="stat-card">
                <span className="stat-icon">💸</span>
                <div>
                  <small>GASTOS HOY</small>
                  <strong>
                    {loadingStats
                      ? 'Cargando...'
                      : `$${expensesToday.toFixed(2)}`}
                  </strong>
                </div>
              </article>

              <article className="stat-card">
                <span className="stat-icon">📊</span>
                <div>
                  <small>RESULTADO DEL DÍA</small>
                  <strong>
                    {loadingStats ? 'Cargando...' : `$${resultToday.toFixed(2)}`}
                  </strong>
                </div>
              </article>
            </>
          )}
        </section>

        <section className="quick-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ACCESOS RÁPIDOS</p>
              <h3>¿Qué deseas hacer?</h3>
            </div>
          </div>

          <div className="module-grid">
            {availableModules.map((module) => (
              <button
                key={module.key}
                className={`module-card ${
                  selected === module.key ? 'active' : ''
                }`}
                onClick={() => openModule(module)}
              >
                <span className="module-icon">{module.icon}</span>

                <span className="module-info">
                  <strong>{module.title}</strong>
                  <small>{module.description}</small>
                </span>

                <span className="module-arrow">›</span>
              </button>
            ))}
          </div>
        </section>

        {message && <div className="toast">{message}</div>}
      </section>

      <nav className="mobile-bottom-nav" aria-label="Navegación principal">
        {[
          { key: 'inicio', label: 'Inicio', icon: '⌂' },
          { key: 'caja', label: 'Caja', icon: '▣' },
          { key: 'venta', label: 'Ventas', icon: '🛍' },
          { key: 'inventario', label: 'Inventario', icon: '▦' },
          ...(user.role === 'admin'
            ? [{ key: 'reportes', label: 'Reportes', icon: '▥' }]
            : []),
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={`mobile-nav-item ${selected === item.key || (item.key === 'inicio' && selected === 'inicio') ? 'is-active' : ''}`}
            onClick={() => {
              setSelected(item.key === 'inicio' ? 'inicio' : item.key)
              setMessage('')
            }}
            aria-current={selected === item.key ? 'page' : undefined}
          >
            <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

function LoadingScreen() {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <img className="login-logo-image" src="/images/logo-modas-sophie.png" alt="Modas Sophie" />
        </div>

        <h1>MODAS SOPHIE</h1>
        <p className="login-subtitle">
          Cargando...
        </p>
      </section>
    </main>
  )
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function restoreSession() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          if (mounted) {
            setUser(null)
          }
          return
        }

        const profile = await loadProfile(authUser.id)

        if (mounted) {
          setUser(profile)
        }
      } catch {
        await supabase.auth.signOut()

        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    restoreSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && mounted) {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
    />
  )
}
