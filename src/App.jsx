import { useRef, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { Bell, Compass, Gauge, GraduationCap, Search, ShieldCheck, Upload, UserCircle2 } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import StudentProfilePage from './pages/StudentProfilePage'
import QueuePage from './pages/QueuePage'
import { currentUser } from './data/mockData'
import { useStudentRecords } from './context/StudentRecordsContext'

const navItems = [
  { to: '/', label: 'Command Center', icon: Gauge },
  { to: '/students', label: 'Students', icon: GraduationCap },
  { to: '/queue', label: 'Workflow', icon: Compass },
  { to: '/trust', label: 'Trust', icon: ShieldCheck },
]

export default function App() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const { uploadTranscript } = useStudentRecords()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadStatus(`Selected ${file.name}`)

    const parsingTimer = window.setTimeout(() => {
      setUploadStatus(`Uploading ${file.name}`)
    }, 250)

    const redirectingTimer = window.setTimeout(() => {
      setUploadStatus(`Parsing ${file.name}`)
    }, 1100)

    try {
      const result = await uploadTranscript(file)
      setUploadStatus(`Opening Student 360 for ${result.studentId}`)
      navigate(`/students/${result.studentId}`)
    } catch (error) {
      setUploadError(error.message || 'Upload failed')
      setUploadStatus('Upload failed')
    } finally {
      window.clearTimeout(parsingTimer)
      window.clearTimeout(redirectingTimer)
      setIsUploading(false)
      event.target.value = ''
    }
  }

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
            <div className="upload-action">
              <input
                ref={fileInputRef}
                type="file"
                className="file-input-hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="primary-button topbar-upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload size={16} />
                <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
              </button>
              {uploadError ? <p className="upload-error">{uploadError}</p> : null}
            </div>
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

      {isUploading ? (
        <div className="modal-scrim" role="presentation">
          <div className="upload-status-panel" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <h3>Uploading transcript</h3>
            <p>{uploadStatus}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
