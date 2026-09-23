import { useState } from 'react'
import './App.css'

type Role = 'admin' | 'vendedor'

type User = {
  username: string
  password: string
  name: string
  role: Role
}

const testUsers: User[] = [
  {
    username: 'admin',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin',
  },
  {
    username: 'vendedor1',
    password: 'vendedor123',
    name: 'Vendedor 1',
    role: 'vendedor',
  },
]

const modules = [
  { icon: '🛒', title: 'Nueva venta', text: 'Punto de venta', key: 'venta' },
  { icon: '📦', title: 'Inventario', text: 'Productos y existencias', key: 'inventario' },
  { icon: '💰', title: 'Ventas', text: 'Historial y cortes', key: 'ventas' },
  { icon: '💸', title: 'Gastos', text: 'Control de gastos', key: 'gastos' },
  { icon: '📊', title: 'Reportes', text: 'Resultados del negocio', key: 'reportes' },
  { icon: '👥', title: 'Vendedores', text: 'Usuarios y permisos', key: 'vendedores' },
  { icon: '🏪', title: 'Sucursales', text: 'Tiendas y existencias', key: 'sucursales' },
]

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    const user = testUsers.find(
      (item) =>
        item.username === username.trim() &&
        item.password === password
    )

    if (!user) {
      setError('Usuario o contraseña incorrectos.')
      return
    }

    setError('')
    onLogin(user)
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">MS</div>

        <h1>MODAS SOPHIE</h1>
        <p className="login-subtitle">Punto de venta y administración</p>

        <div className="login-form">
          <label>Usuario</label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Escribe tu usuario"
            autoComplete="username"
          />

          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Escribe tu contraseña"
            autoComplete="current-password"
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleLogin()
            }}
          />

          {error && <div className="login-error">{error}</div>}

          <button className="login-button" onClick={handleLogin}>
            INICIAR SESIÓN
          </button>
        </div>

        <div className="login-info">
          <strong>Acceso de prueba</strong>
          <span>Administrador: admin / admin123</span>
          <span>Vendedor: vendedor1 / vendedor123</span>
        </div>
      </section>
    </main>
  )
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [selected, setSelected] = useState('inicio')

  const availableModules =
    user.role === 'admin'
      ? modules
      : modules.filter((module) =>
          ['venta', 'inventario', 'ventas'].includes(module.key)
        )

  const openModule = (key: string) => {
    setSelected(key)

    setTimeout(() => {
      setSelected('inicio')
    }, 800)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">MS</div>

          <div>
            <h1>MODAS SOPHIE</h1>
            <span>
              {user.role === 'admin'
                ? 'Administrador'
                : 'Punto de venta'}
            </span>
          </div>
        </div>

        <button className="user-button" onClick={onLogout}>
          👤
        </button>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">
            {user.role === 'admin'
              ? 'PANEL DE ADMINISTRACIÓN'
              : 'PANEL DE VENDEDOR'}
          </p>

          <h2>¡Hola, {user.name}! 👋</h2>

          <p>
            {user.role === 'admin'
              ? 'Tienes acceso completo al negocio.'
              : 'Aquí puedes realizar y consultar tus operaciones.'}
          </p>
        </div>

        <div className="date-card">
          <span>HOY</span>
          <strong>22 SEP 2026</strong>
        </div>
      </section>

      <section className="stats">
        <article>
          <span>💰</span>
          <div>
            <small>VENTAS HOY</small>
            <strong>$0.00</strong>
          </div>
        </article>

        <article>
          <span>🛍️</span>
          <div>
            <small>PRODUCTOS VENDIDOS</small>
            <strong>0</strong>
          </div>
        </article>

        {user.role === 'admin' && (
          <>
            <article>
              <span>💸</span>
              <div>
                <small>GASTOS HOY</small>
                <strong>$0.00</strong>
              </div>
            </article>

            <article>
              <span>📈</span>
              <div>
                <small>GANANCIA ESTIMADA</small>
                <strong>$0.00</strong>
              </div>
            </article>
          </>
        )}
      </section>

      <section className="section-heading">
        <p className="eyebrow">ACCESOS RÁPIDOS</p>
        <h3>¿Qué quieres hacer?</h3>
      </section>

      <section className="module-grid">
        {availableModules.map((module) => (
          <button
            className={`module-card ${
              module.key === 'venta' ? 'primary-card' : ''
            }`}
            key={module.key}
            onClick={() => openModule(module.key)}
          >
            <span className="module-icon">{module.icon}</span>
            <span className="module-title">{module.title}</span>
            <span className="module-text">{module.text}</span>
          </button>
        ))}
      </section>

      {selected !== 'inicio' && (
        <div className="toast">
          <strong>
            {modules.find((module) => module.key === selected)?.title}
          </strong>
          <span>Preparando este módulo…</span>
        </div>
      )}

      <nav className="bottom-nav">
        <button className="active">🏠<span>Inicio</span></button>
        <button onClick={() => openModule('venta')}>🛒<span>Venta</span></button>
        <button onClick={() => openModule('inventario')}>📦<span>Inventario</span></button>
        <button onClick={() => openModule('ventas')}>💰<span>Ventas</span></button>
        <button onClick={() => openModule('reportes')}>📊<span>Reportes</span></button>
      </nav>
    </main>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(null)

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />
}

export default App
