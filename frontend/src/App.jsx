import { NavLink, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage.jsx'
import AnalystPage from './pages/AnalystPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import './App.css'

const linkClass = ({ isActive }) =>
  [
    'nav-pill px-3 py-2 text-decoration-none rounded-pill',
    isActive ? 'bg-light text-dark fw-semibold' : 'text-white-50',
  ].join(' ')

function App() {
  return (
    <div className="app-shell bg-light min-vh-100 d-flex flex-column">
      <header className="app-header shadow-sm">
        <div className="container py-3 d-flex flex-column flex-md-row gap-3 justify-content-between align-items-md-center">
          <div>
            <p className="text-white-50 mb-0 small">ECE 553</p>
            <h1 className="h4 text-white mb-0">
              Global Climate Intelligence Dashboard
            </h1>
            
          </div>
          <nav className="d-flex gap-2 flex-wrap">
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/analyst" className={linkClass}>
              AI Analyst
            </NavLink>
            <NavLink to="/settings" className={linkClass}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-grow-1 py-4">
        <div className="container">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/analyst" element={<AnalystPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>

      <footer className="app-footer py-3 text-center small text-muted">
        Climate Intelligence • Kowsyap · Arya
      </footer>
    </div>
  )
}

export default App
