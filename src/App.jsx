import { NavLink, Route, Routes } from 'react-router-dom'
import { Bell, Compass, Gauge, GraduationCap, Search, ShieldCheck, UserCircle2 } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import StudentProfilePage from './pages/StudentProfilePage'
import QueuePage from './pages/QueuePage'
import { currentUser } from './data/mockData'

const navItems = [
  { to: '/', label: 'Command Center', icon: Gauge },
  { to: '/students', label: 'Students', icon: GraduationCap },
  { to: '/queue', label: 'Workflow', icon: Compass },
  { to: '/trust', label: 'Trust', icon: ShieldCheck },
]

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">
          <img className="brand-logo" src="/crtfystudent.png" alt="crtfy student" />
        </div>
        <div className="topbar-main">
          <div className="search-wrap">
            <Search size={18} />
            <input placeholder="Search student, transcript, institution, program, or workflow step" />
          </div>
          <div className="topbar-actions">
            <button className="icon-button"><Bell size={18} /></button>
            <div className="user-pill">
              <UserCircle2 size={18} />
              <div>
                <strong>{currentUser.name}</strong>
                <span>{currentUser.role}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <aside className="sidebar">
        <nav className="nav-list">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:studentId" element={<StudentProfilePage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/trust" element={<QueuePage trustView />} />
        </Routes>
      </main>
    </div>
  )
}
