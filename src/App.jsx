import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  BadgeCheck,
  Bell,
  Cable,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileClock,
  GraduationCap,
  LayoutDashboard,
  Landmark,
  LoaderCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  UserCircle2,
  Wrench,
  X,
} from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import ProtectedRoute from './components/ProtectedRoute'
import WorkspaceAssistant from './components/WorkspaceAssistant'
import { useAuth } from './context/AuthContext'
import TodaysWorkPage from './pages/TodaysWorkPage'
import StudentsPage from './pages/StudentsPage'
import StudentProfilePage from './pages/StudentProfilePage'
import DocumentsQueuePage from './pages/DocumentsQueuePage'
import TrustCenterPage from './pages/TrustCenterPage'
import ConnectorsPage from './pages/ConnectorsPage'
import ProspectPortalPage from './pages/ProspectPortalPage'
import DecisionStudioPage from './pages/DecisionStudioPage'
import DecisionStudioDetailPage from './pages/DecisionStudioDetailPage'
import UserProfilePage from './pages/UserProfilePage'
import ExceptionsPage from './pages/ExceptionsPage'
import IncompletePage from './pages/IncompletePage'
import ReadyForReviewPage from './pages/ReadyForReviewPage'
import AdmittedYieldPage from './pages/AdmittedYieldPage'
import DepositMeltPage from './pages/DepositMeltPage'
import ReportingPage from './pages/ReportingPage'
import AdminPage from './pages/AdminPage'
import PlatformTenantsPage from './pages/PlatformTenantsPage'
import UtilitiesPage from './pages/UtilitiesPage'
import { useStudentRecords } from './context/StudentRecordsContext'
import { classifyDocumentWithGovernedAi } from './lib/governedDocumentClassification'
import { STUDENT_DOCUMENT_TYPES, classifyStudentDocument, isTranscriptDocumentType } from './lib/studentDocumentTypes'

const idleUploadState = {
  state: 'idle',
  mode: null,
  transcriptId: null,
  documentUploadId: null,
  batchId: null,
  batchItems: [],
  batchProgress: null,
  message: '',
  error: '',
}

const navItems = [
  {
    to: '/',
    label: "Today's Work",
    icon: LayoutDashboard,
    anyAccess: [{ permissions: ['view_dashboards'] }, { permissions: ['view_student_360'] }],
  },
  {
    to: '/students',
    label: 'Student 360',
    icon: GraduationCap,
    access: { permissions: ['view_student_360'] },
  },
  {
    to: '/incomplete',
    label: 'Incomplete Applications',
    icon: ClipboardList,
    access: { permissions: ['view_student_360'] },
  },
  {
    to: '/documents',
    label: 'Documents Queue',
    icon: AlertCircle,
    anyAccess: [{ permissions: ['view_sensitive_docs'] }, { permissions: ['manage_trust_cases'] }, { permissions: ['view_student_360'] }],
  },
  {
    to: '/ready-for-review',
    label: 'Ready for Review',
    icon: FileClock,
    anyAccess: [{ permissions: ['view_decision_packet'] }, { permissions: ['view_student_360'], sensitivities: ['academic_record'] }],
  },
  {
    to: '/decisions',
    label: 'Decision Studio',
    icon: FileCheck2,
    anyAccess: [{ permissions: ['view_decision_packet'] }, { permissions: ['release_decision'] }],
  },
  {
    to: '/trust',
    label: 'Trust Center',
    icon: ShieldCheck,
    anyAccess: [{ permissions: ['manage_trust_cases'] }, { permissions: ['view_trust_flags'] }],
  },
  {
    to: '/yield',
    label: 'Admitted / Yield',
    icon: TrendingUp,
    anyAccess: [{ permissions: ['view_student_360'] }, { permissions: ['view_dashboards'] }],
  },
  {
    to: '/melt',
    label: 'Deposit / Melt',
    icon: BadgeCheck,
    anyAccess: [{ permissions: ['view_student_360'] }, { permissions: ['view_dashboards'] }],
  },
  {
    to: '/connectors',
    label: 'Integrations',
    icon: Cable,
    access: { permissions: ['manage_integrations'] },
  },
  {
    to: '/prospects',
    label: 'Portals',
    icon: Sparkles,
    anyAccess: [{ permissions: ['view_dashboards'] }, { permissions: ['view_student_360'] }],
  },
  {
    to: '/reporting',
    label: 'Reporting',
    icon: BarChart3,
    access: { permissions: ['view_dashboards'] },
  },
  {
    to: '/utilities',
    label: 'Utilities',
    icon: Wrench,
    anyAccess: [{ roles: ['tenant_admin'] }, { roles: ['master_tenant_admin'] }],
  },
  {
    to: '/admin',
    label: 'Admin',
    icon: Settings,
    anyAccess: [{ permissions: ['admin_users_view'] }, { permissions: ['manage_integrations'] }, { permissions: ['release_decision'] }, { permissions: ['platform_tenants_view'] }, { permissions: ['platform_users_view'] }, { permissions: ['platform_users_manage'] }],
  },
  {
    to: '/platform/tenants',
    label: 'Tenants',
    icon: Landmark,
    access: { permissions: ['platform_tenants_view'] },
  },
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

function canTreatAsTranscriptCandidate(file) {
  const name = String(file?.name || '').toLowerCase()
  const type = String(file?.type || '').toLowerCase()
  return type === 'application/pdf'
    || name.endsWith('.pdf')
    || type.startsWith('image/')
    || /\.(png|jpe?g|tiff?|webp)$/i.test(name)
}

async function resolveTranscriptUploadType(file, session, onStatus) {
  const lowerName = file.name.toLowerCase()
  const isZipUpload = lowerName.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
  const localType = classifyStudentDocument(file)
  if (isZipUpload || isTranscriptDocumentType(localType)) return isZipUpload ? 'High school transcript' : localType

  try {
    onStatus?.(`Checking whether ${file.name} is a transcript...`)
    const governedClassification = await classifyDocumentWithGovernedAi({
      file,
      classificationOptions: STUDENT_DOCUMENT_TYPES,
      session,
    })
    const governedType = governedClassification.documentType
    const confidence = Number(governedClassification.confidence ?? governedClassification.score ?? 0)
    if (isTranscriptDocumentType(governedType)) return governedType
    if (governedType && confidence >= 0.86) {
      const error = new Error(`${file.name} looks like ${governedType}, not a transcript. Upload it from the student Documents tab.`)
      error.isClassificationDecision = true
      throw error
    }
  } catch (error) {
    if (error.isClassificationDecision) throw error
    if (!canTreatAsTranscriptCandidate(file)) throw error
  }

  if (canTreatAsTranscriptCandidate(file)) return 'High school transcript'
  throw new Error(`${file.name} could not be identified as a transcript.`)
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const userMenuRef = useRef(null)
  const { students, uploadTranscript } = useStudentRecords()
  const { session, currentUser, isAuthenticated, isBootstrappingAuth, changePassword, logout, canAccess } = useAuth()
  const [uploadState, setUploadState] = useState(idleUploadState)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [topbarQuery, setTopbarQuery] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [previousPassword, setPreviousPassword] = useState('')
  const [proposedPassword, setProposedPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const userDisplayName = currentUser?.displayName
    || session?.displayName
    || [session?.first_name || session?.given_name, session?.last_name || session?.family_name].filter(Boolean).join(' ').trim()
    || session?.email
    || session?.username
  const tenantDisplayName = currentUser?.tenantName
    || session?.tenant_name
    || session?.tenantName
    || session?.tenant_code
    || session?.tenantCode
    || 'Workspace'

  const routeLabel = useMemo(() => {
    const match = navItems.find((item) => item.to === location.pathname)
    if (match) return match.label
    if (location.pathname.startsWith('/students/')) return 'Student 360'
    if (location.pathname.startsWith('/documents')) return 'Documents Queue'
    if (location.pathname.startsWith('/decision-studio/')) return 'Decision Studio'
    if (location.pathname.startsWith('/incomplete')) return 'Incomplete'
    if (location.pathname.startsWith('/ready-for-review')) return 'Ready for Review'
    if (location.pathname.startsWith('/exceptions')) return 'Exceptions'
    if (location.pathname.startsWith('/yield')) return 'Admitted / Yield'
    if (location.pathname.startsWith('/melt')) return 'Deposit / Melt'
    if (location.pathname.startsWith('/reporting')) return 'Reporting'
    if (location.pathname.startsWith('/admin')) return 'Admin'
    if (location.pathname.startsWith('/platform')) return 'Platform'
    if (location.pathname.startsWith('/profile')) return 'User Profile'
    if (location.pathname.startsWith('/prospects')) return 'Portals'
    return "Today's Work"
  }, [location.pathname])

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => item.anyAccess ? item.anyAccess.some((access) => canAccess(access)) : canAccess(item.access)),
    [canAccess],
  )

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setTopbarQuery(params.get('q') || '')
  }, [location.search])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isUserMenuOpen])

  if (!isAuthenticated) return <AuthScreen />
  if (isBootstrappingAuth) {
    return (
      <div className="app-shell">
        <main className="main-panel">
          <div className="page-wrap">
            <section className="panel">
              <p className="muted-copy">Loading access...</p>
            </section>
          </div>
        </main>
      </div>
    )
  }

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
      documentUploadId: null,
      batchId: null,
      batchItems: [],
      batchProgress: null,
      message: `Uploading ${file.name}`,
      error: '',
    })
    setIsUploadModalOpen(true)

    try {
      const documentType = await resolveTranscriptUploadType(file, session, (message) => {
        setUploadState((current) => ({
          ...current,
          message,
        }))
      })
      const result = await uploadTranscript(file, {
        documentType,
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
          documentUploadId: result.documentUploadId || null,
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
          documentUploadId: result.documentUploadId || null,
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
    setIsUserMenuOpen(false)
  }

  function closeChangePasswordModal() {
    setIsChangePasswordOpen(false)
    setPasswordError('')
    setPasswordSuccess('')
    setPreviousPassword('')
    setProposedPassword('')
    setConfirmPassword('')
  }

  function openUserProfile() {
    setIsUserMenuOpen(false)
    navigate('/profile')
  }

  function handleSignOut() {
    setIsUserMenuOpen(false)
    logout()
  }

  function handleTopbarSearchChange(event) {
    const nextQuery = event.target.value
    setTopbarQuery(nextQuery)

    const params = new URLSearchParams(location.search)
    if (nextQuery.trim()) {
      params.set('q', nextQuery)
    } else {
      params.delete('q')
    }

    const searchableRoutes = ['/', '/prospects', '/students', '/documents', '/queue', '/exceptions']
    const targetPath = searchableRoutes.includes(location.pathname) ? location.pathname : '/students'
    const nextSearch = params.toString()
    navigate(`${targetPath}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-main">
          <div>
            <div className="breadcrumbs">
              <span>crtfy Student</span>
              <ChevronRight size={14} />
              <span>{routeLabel}</span>
            </div>
            <div className="search-wrap">
              <Search size={18} />
              <input
                placeholder="Search student, transcript, institution, program, connector, or alert"
                value={topbarQuery}
                onChange={handleTopbarSearchChange}
              />
            </div>
          </div>

          <div className="topbar-actions">
            <div className="tenant-pill" title={tenantDisplayName}>
              <span>Tenant</span>
              <strong>{tenantDisplayName}</strong>
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
            <div className="user-menu-wrap" ref={userMenuRef}>
              <button
                type="button"
                className={`user-pill user-menu-trigger ${isUserMenuOpen ? 'active' : ''}`}
                onClick={() => setIsUserMenuOpen((current) => !current)}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
              >
                <UserCircle2 size={18} />
                <div>
                  <strong>{userDisplayName}</strong>
                </div>
                <ChevronDown size={16} />
              </button>

              {isUserMenuOpen ? (
                <div className="user-menu-dropdown" role="menu">
                  <button type="button" className="user-menu-item" onClick={openUserProfile} role="menuitem">
                    User Profile
                  </button>
                  <button type="button" className="user-menu-item" onClick={openChangePasswordModal} role="menuitem">
                    Change password
                  </button>
                  <button type="button" className="user-menu-item danger" onClick={handleSignOut} role="menuitem">
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="brand-logo" src="/logos/crtfy-student.png" alt="crtfy student" />
        </div>
        <div className="sidebar-section">
          <nav className="nav-list">
            {visibleNavItems.map(({ to, label, icon: Icon }) => (
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
          <Route path="/" element={<ProtectedRoute anyAccess={[{ permissions: ['view_dashboards'] }, { permissions: ['view_student_360'] }]}><TodaysWorkPage /></ProtectedRoute>} />
          <Route path="/prospects" element={<ProtectedRoute anyAccess={[{ permissions: ['view_dashboards'] }, { permissions: ['view_student_360'] }]}><ProspectPortalPage /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute access={{ permissions: ['view_student_360'] }}><StudentsPage /></ProtectedRoute>} />
          <Route path="/students/:studentId" element={<ProtectedRoute access={{ permissions: ['view_student_360'] }}><StudentProfilePage /></ProtectedRoute>} />
          <Route path="/incomplete" element={<ProtectedRoute access={{ permissions: ['view_student_360'] }}><IncompletePage /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute anyAccess={[{ permissions: ['view_sensitive_docs'] }, { permissions: ['manage_trust_cases'] }, { permissions: ['view_student_360'] }]}><DocumentsQueuePage /></ProtectedRoute>} />
          <Route path="/ready-for-review" element={<ProtectedRoute anyAccess={[{ permissions: ['view_decision_packet'] }, { permissions: ['view_student_360'], sensitivities: ['academic_record'] }]}><ReadyForReviewPage /></ProtectedRoute>} />
          <Route path="/decisions" element={<ProtectedRoute anyAccess={[{ permissions: ['view_decision_packet'] }, { permissions: ['release_decision'] }]}><DecisionStudioPage /></ProtectedRoute>} />
          <Route path="/decision-studio/:decisionId" element={<ProtectedRoute anyAccess={[{ permissions: ['view_decision_packet'] }, { permissions: ['release_decision'] }]}><DecisionStudioDetailPage /></ProtectedRoute>} />
          <Route path="/queue" element={<ProtectedRoute anyAccess={[{ permissions: ['view_sensitive_docs'] }, { permissions: ['manage_trust_cases'] }, { permissions: ['view_student_360'] }]}><DocumentsQueuePage /></ProtectedRoute>} />
          <Route path="/exceptions" element={<ProtectedRoute anyAccess={[{ permissions: ['manage_trust_cases'] }, { permissions: ['view_trust_flags'] }]}><ExceptionsPage /></ProtectedRoute>} />
          <Route path="/trust" element={<ProtectedRoute anyAccess={[{ permissions: ['manage_trust_cases'] }, { permissions: ['view_trust_flags'] }]}><TrustCenterPage /></ProtectedRoute>} />
          <Route path="/yield" element={<ProtectedRoute anyAccess={[{ permissions: ['view_student_360'] }, { permissions: ['view_dashboards'] }]}><AdmittedYieldPage /></ProtectedRoute>} />
          <Route path="/melt" element={<ProtectedRoute anyAccess={[{ permissions: ['view_student_360'] }, { permissions: ['view_dashboards'] }]}><DepositMeltPage /></ProtectedRoute>} />
          <Route path="/connectors" element={<ProtectedRoute access={{ permissions: ['manage_integrations'] }}><ConnectorsPage /></ProtectedRoute>} />
          <Route path="/reporting" element={<ProtectedRoute access={{ permissions: ['view_dashboards'] }}><ReportingPage /></ProtectedRoute>} />
          <Route path="/utilities" element={<ProtectedRoute anyAccess={[{ roles: ['tenant_admin'] }, { roles: ['master_tenant_admin'] }]}><UtilitiesPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute anyAccess={[{ permissions: ['admin_users_view'] }, { permissions: ['manage_integrations'] }, { permissions: ['release_decision'] }, { permissions: ['platform_tenants_view'] }, { permissions: ['platform_users_view'] }, { permissions: ['platform_users_manage'] }]}><AdminPage /></ProtectedRoute>} />
          <Route path="/platform/tenants" element={<ProtectedRoute access={{ permissions: ['platform_tenants_view'] }}><PlatformTenantsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
        </Routes>
      </main>

      <WorkspaceAssistant currentUser={currentUser} />

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
            {uploadState.documentUploadId ? <p className="upload-job-id">ECM document ID: {uploadState.documentUploadId}</p> : null}
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
                <p>{userDisplayName}</p>
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
