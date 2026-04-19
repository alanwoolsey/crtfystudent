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
  X,
} from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import { useAuth } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import StudentProfilePage from './pages/StudentProfilePage'
import QueuePage from './pages/QueuePage'
import TrustCenterPage from './pages/TrustCenterPage'
import ConnectorsPage from './pages/ConnectorsPage'
import ProspectPortalPage from './pages/ProspectPortalPage'
import DecisionStudioPage from './pages/DecisionStudioPage'
import { quickSignals } from './data/mockData'
import { useStudentRecords } from './context/StudentRecordsContext'

const idleUploadState = {
  state: 'idle',
  transcriptId: null,
  message: '',
  error: '',
}

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
  const { session, isAuthenticated, changePassword, logout } = useAuth()
  const [uploadState, setUploadState] = useState(idleUploadState)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [previousPassword, setPreviousPassword] = useState('')
  const [proposedPassword, setProposedPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const routeLabel = useMemo(() => {
    const match = navItems.find((item) => item.to === location.pathname)
    if (match) return match.label
    if (location.pathname.startsWith('/students/')) return 'Student 360'
    return 'Command Center'
  }, [location.pathname])

  if (!isAuthenticated) return <AuthScreen />

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadState({
      state: 'uploading',
      transcriptId: null,
      message: `Uploading ${file.name}`,
      error: '',
    })

    try {
      const result = await uploadTranscript(file, {
        onStateChange: (nextState) => {
          setUploadState((current) => ({
            ...current,
            ...nextState,
          }))
        },
      })
      setUploadState({
        state: 'completed',
        transcriptId: result.transcriptId || null,
        message: `Opening Student 360 for ${result.studentId}`,
        error: '',
      })
      navigate(`/students/${result.studentId}`)
      window.setTimeout(() => setUploadState(idleUploadState), 0)
    } catch (error) {
      setUploadState((current) => ({
        ...current,
        state: 'failed',
        message: error.message || current.message || 'Upload failed',
        error: error.message || 'Upload failed',
      }))
    } finally {
      event.target.value = ''
    }
  }

  function dismissUploadState() {
    setUploadState(idleUploadState)
  }

  async function handleChangePasswordSubmit(event) {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!previousPassword || !proposedPassword) {
      setPasswordError('Enter your current and new password.')
      return
    }

    if (proposedPassword !== confirmPassword) {
      setPasswordError('New password and confirmation must match.')
      return
    }

    setIsChangingPassword(true)

    try {
      await changePassword({ previousPassword, proposedPassword })
      setPasswordSuccess('Password updated.')
      setPreviousPassword('')
      setProposedPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordError(error.message || 'Unable to change password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  function openChangePasswordModal() {
    setPasswordError('')
    setPasswordSuccess('')
    setIsChangePasswordOpen(true)
  }

  function closeChangePasswordModal() {
    setIsChangePasswordOpen(false)
    setPasswordError('')
    setPasswordSuccess('')
    setPreviousPassword('')
    setProposedPassword('')
    setConfirmPassword('')
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
                disabled={uploadState.state === 'uploading' || uploadState.state === 'processing'}
              >
                <Upload size={16} />
                <span>{uploadState.state === 'uploading' || uploadState.state === 'processing' ? 'Uploading...' : 'Upload transcript'}</span>
              </button>
              {uploadState.state === 'failed' && uploadState.error ? <p className="upload-error">{uploadState.error}</p> : null}
            </div>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <button type="button" className="secondary-button" onClick={openChangePasswordModal}>
              Change password
            </button>
            <div className="user-pill">
              <UserCircle2 size={18} />
              <div>
                <strong>{session.username}</strong>
                <span>{session.tenant_name}</span>
              </div>
            </div>
            <button type="button" className="secondary-button" onClick={logout}>Sign out</button>
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

      {uploadState.state !== 'idle' ? (
        <div className="modal-scrim" role="presentation">
          <div className="upload-status-panel" role="status" aria-live="polite">
            {uploadState.state === 'uploading' || uploadState.state === 'processing' ? <div className="spinner" aria-hidden="true" /> : null}
            <h3>Transcript upload: {uploadState.state}</h3>
            <p>{uploadState.message}</p>
            {uploadState.transcriptId ? <p className="upload-job-id">Transcript ID: {uploadState.transcriptId}</p> : null}
            {uploadState.state === 'failed' ? (
              <button type="button" className="secondary-button" onClick={dismissUploadState}>Close</button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isChangePasswordOpen ? (
        <div className="modal-scrim" onClick={closeChangePasswordModal} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="panel-header">
              <div>
                <h3>Change password</h3>
                <p>{session.username}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeChangePasswordModal} aria-label="Close change password">
                <X size={18} />
              </button>
            </div>

            <form className="auth-form password-form" onSubmit={handleChangePasswordSubmit}>
              <label className="auth-field">
                <span>Current password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={previousPassword}
                  onChange={(event) => setPreviousPassword(event.target.value)}
                  required
                />
              </label>
              <label className="auth-field">
                <span>New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={proposedPassword}
                  onChange={(event) => setProposedPassword(event.target.value)}
                  required
                />
              </label>
              <label className="auth-field">
                <span>Confirm new password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
              {passwordError ? <p className="auth-error">{passwordError}</p> : null}
              {passwordSuccess ? <p className="auth-success">{passwordSuccess}</p> : null}
              <div className="password-actions">
                <button type="button" className="secondary-button" onClick={closeChangePasswordModal}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isChangingPassword}>
                  {isChangingPassword ? 'Saving...' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
