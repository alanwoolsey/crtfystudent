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
  LoaderCircle,
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
import DecisionStudioDetailPage from './pages/DecisionStudioDetailPage'
import { quickSignals } from './data/mockData'
import { useStudentRecords } from './context/StudentRecordsContext'

const idleUploadState = {
  state: 'idle',
  mode: null,
  transcriptId: null,
  batchId: null,
  batchItems: [],
  batchProgress: null,
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

function formatUploadTimestamp(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const { uploadTranscript } = useStudentRecords()
  const { session, isAuthenticated, changePassword, logout } = useAuth()
  const [uploadState, setUploadState] = useState(idleUploadState)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
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
    if (location.pathname.startsWith('/decision-studio/')) return 'Decision Studio'
    return 'Command Center'
  }, [location.pathname])

  if (!isAuthenticated) return <AuthScreen />

  const isUploadInFlight = uploadState.state === 'uploading' || uploadState.state === 'processing'
  const showBatchBackgroundStatus = !isUploadModalOpen && uploadState.mode === 'batch' && isUploadInFlight
  const batchStatusLabel = uploadState.batchProgress
    ? `${uploadState.batchProgress.activeFiles || 0} active, ${uploadState.batchProgress.completedFiles || 0} completed, ${uploadState.batchProgress.failedFiles || 0} failed`
    : uploadState.message

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const lowerName = file.name.toLowerCase()
    const isZipUpload = lowerName.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'

    setUploadState({
      state: 'uploading',
      mode: isZipUpload ? 'batch' : 'single',
      transcriptId: null,
      batchId: null,
      batchItems: [],
      batchProgress: null,
      message: `Uploading ${file.name}`,
      error: '',
    })
    setIsUploadModalOpen(true)

    try {
      const result = await uploadTranscript(file, {
        onStateChange: (nextState) => {
          setUploadState((current) => ({
            ...current,
            ...nextState,
          }))
        },
      })

      if (result?.destination === 'students-list' || isZipUpload) {
        setUploadState({
          state: 'completed',
          mode: 'batch',
          transcriptId: result.transcriptId || null,
          batchId: result.batchId || null,
          batchItems: result.batchItems || [],
          batchProgress: result.batchProgress || null,
          message: 'Opening Student 360 list',
          error: '',
        })
        navigate('/students')
      } else {
        setUploadState({
          state: 'completed',
          mode: 'single',
          transcriptId: result.transcriptId || null,
          batchId: null,
          batchItems: [],
          batchProgress: null,
          message: `Opening Student 360 for ${result.studentId}`,
          error: '',
        })
        navigate(`/students/${result.studentId}`)
      }

      window.setTimeout(() => {
        setUploadState(idleUploadState)
        setIsUploadModalOpen(false)
      }, 0)
    } catch (error) {
      setUploadState((current) => ({
        ...current,
        state: 'failed',
        message: error.message || current.message || 'Upload failed',
        error: error.message || 'Upload failed',
      }))
      setIsUploadModalOpen(true)
    } finally {
      event.target.value = ''
    }
  }

  function hideUploadModal() {
    setIsUploadModalOpen(false)
  }

  function dismissUploadState() {
    setUploadState(idleUploadState)
    setIsUploadModalOpen(false)
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
            {showBatchBackgroundStatus ? (
              <button type="button" className="upload-status-chip" onClick={() => setIsUploadModalOpen(true)}>
                <LoaderCircle size={16} className="spin-inline" />
                <span>Batch running</span>
                <strong>{batchStatusLabel}</strong>
              </button>
            ) : null}
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
          <Route path="/decision-studio/:decisionId" element={<DecisionStudioDetailPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/trust" element={<TrustCenterPage />} />
          <Route path="/connectors" element={<ConnectorsPage />} />
        </Routes>
      </main>

      {uploadState.state !== 'idle' && isUploadModalOpen ? (
        <div className="modal-scrim" role="presentation">
          <div className="upload-status-panel" role="status" aria-live="polite">
            {uploadState.state === 'uploading' || uploadState.state === 'processing' ? <div className="spinner" aria-hidden="true" /> : null}
            <div className="panel-header">
              <div>
                <h3>Transcript upload: {uploadState.state}</h3>
                <p>{uploadState.message}</p>
              </div>
              <button type="button" className="icon-button" onClick={hideUploadModal} aria-label="Hide upload status">
                <X size={18} />
              </button>
            </div>
            {uploadState.transcriptId ? <p className="upload-job-id">Transcript ID: {uploadState.transcriptId}</p> : null}
            {uploadState.batchId ? <p className="upload-job-id">Batch ID: {uploadState.batchId}</p> : null}
            {uploadState.batchProgress ? (
              <>
                <p className="upload-batch-progress-line">
                  {uploadState.batchProgress.activeFiles || 0} active, {uploadState.batchProgress.completedFiles || 0} completed, {uploadState.batchProgress.failedFiles || 0} failed
                </p>
                <div className="upload-batch-summary">
                  <div><span>Batch status</span><strong>{uploadState.batchProgress.status || 'processing'}</strong></div>
                  <div><span>Active</span><strong>{uploadState.batchProgress.activeFiles || 0}</strong></div>
                  <div><span>Completed</span><strong>{uploadState.batchProgress.completedFiles || 0}</strong></div>
                  <div><span>Failed</span><strong>{uploadState.batchProgress.failedFiles || 0}</strong></div>
                </div>
              </>
            ) : null}
            {uploadState.batchItems?.length ? (
              <div className="upload-batch-list">
                {uploadState.batchItems.map((item) => (
                  <div key={item.id || `${item.filename}-${item.transcriptId || 'pending'}`} className="upload-batch-item">
                    <div className="upload-batch-item-top">
                      <strong>{item.filename}</strong>
                      <span className={`badge ${item.status === 'failed' ? 'risk-high' : item.status === 'completed' ? 'risk-low' : 'neutral-badge'}`}>
                        {item.status}
                      </span>
                    </div>
                    {item.transcriptId ? <div className="upload-batch-item-meta">Transcript ID: {item.transcriptId}</div> : null}
                    {item.documentUploadId ? <div className="upload-batch-item-meta">Upload ID: {item.documentUploadId}</div> : null}
                    {item.parseRunId ? <div className="upload-batch-item-meta">Parse Run ID: {item.parseRunId}</div> : null}
                    {(item.startedAt || item.completedAt) ? (
                      <div className="upload-batch-item-meta">
                        {item.startedAt ? `Started ${formatUploadTimestamp(item.startedAt)}` : ''}
                        {item.startedAt && item.completedAt ? ' • ' : ''}
                        {item.completedAt ? `Completed ${formatUploadTimestamp(item.completedAt)}` : ''}
                      </div>
                    ) : null}
                    {item.error ? <div className="upload-batch-item-error">{item.error}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="password-actions">
              {isUploadInFlight ? (
                <button type="button" className="secondary-button" onClick={hideUploadModal}>Keep running in background</button>
              ) : null}
              {uploadState.state === 'failed' ? (
                <button type="button" className="secondary-button" onClick={dismissUploadState}>Close</button>
              ) : null}
            </div>
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
