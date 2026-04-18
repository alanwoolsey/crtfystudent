import { useMemo, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Cable,
  ChevronRight,
  Compass,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCircle2,
} from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import StudentProfilePage from './pages/StudentProfilePage'
import QueuePage from './pages/QueuePage'
import TrustCenterPage from './pages/TrustCenterPage'
import ConnectorsPage from './pages/ConnectorsPage'
import ProspectPortalPage from './pages/ProspectPortalPage'
import DecisionStudioPage from './pages/DecisionStudioPage'
import { currentUser, quickSignals } from './data/mockData'
import { useStudentRecords } from './context/StudentRecordsContext'

const navItems = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard },
  { to: '/prospects', label: 'Prospect Portal', icon: Sparkles },
  { to: '/students', label: 'Student 360', icon: GraduationCap },
  { to: '/decisions', label: 'Decision Studio', icon: FileCheck2 },
  { to: '/queue', label: 'Workflows', icon: Compass },
  { to: '/trust', label: 'Trust Center', icon: ShieldCheck },
  { to: '/connectors', label: 'Crtfy Integrations', icon: Cable },
]

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const { uploadTranscript } = useStudentRecords()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')

  const routeLabel = useMemo(() => {
    const match = navItems.find((item) => item.to === location.pathname)
    if (match) return match.label
    if (location.pathname.startsWith('/students/')) return 'Student 360'
    return 'Command Center'
  }, [location.pathname])

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError('')
    setUploadStatus(`Uploading ${file.name}`)

    const phaseTwo = window.setTimeout(() => setUploadStatus(`Extracting records from ${file.name}`), 500)
    const phaseThree = window.setTimeout(() => setUploadStatus(`Building certified outcome for ${file.name}`), 1200)

    try {
      const result = await uploadTranscript(file)
      setUploadStatus(`Opening Student 360 for ${result.studentId}`)
      navigate(`/students/${result.studentId}`)
    } catch (error) {
      setUploadError(error.message || 'Upload failed')
      setUploadStatus('Upload failed')
    } finally {
      window.clearTimeout(phaseTwo)
      window.clearTimeout(phaseThree)
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">
          <img className="brand-logo" src="/logos/crtfy-student.svg" alt="crtfy student" />
        </div>

        <div className="topbar-main">
          <div>
            <div className="breadcrumbs">
              <span>Enrollment OS</span>
              <ChevronRight size={14} />
              <span>{routeLabel}</span>
            </div>
            <div className="search-wrap">
              <Search size={18} />
              <input placeholder="Search student, transcript, institution, program, connector, or alert" />
            </div>
          </div>

          <div className="topbar-actions">
            <div className="signal-strip">
              {quickSignals.map((signal) => (
                <span key={signal.label} className={`signal-pill ${signal.tone}`}>
                  {signal.label}: <strong>{signal.value}</strong>
                </span>
              ))}
            </div>
            <div className="upload-action">
              <input ref={fileInputRef} type="file" className="file-input-hidden" onChange={handleFileChange} />
              <button
                type="button"
                className="primary-button topbar-upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload size={16} />
                <span>{isUploading ? 'Uploading…' : 'Upload transcript'}</span>
              </button>
              {uploadError ? <p className="upload-error">{uploadError}</p> : null}
            </div>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
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
        <div className="sidebar-section">
          <p className="eyebrow">Platform</p>
          <nav className="nav-list">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <main className="main-panel">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/prospects" element={<ProspectPortalPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:studentId" element={<StudentProfilePage />} />
          <Route path="/decisions" element={<DecisionStudioPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/trust" element={<TrustCenterPage />} />
          <Route path="/connectors" element={<ConnectorsPage />} />
        </Routes>
      </main>

      {isUploading ? (
        <div className="modal-scrim" role="presentation">
          <div className="upload-status-panel" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <h3>Creating certified intake record</h3>
            <p>{uploadStatus}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
