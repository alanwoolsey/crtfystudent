import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'
import { userPermissions } from '../lib/rbac'

export default function AccessDeniedPage() {
  const { currentUser, loadCurrentUser, logout } = useAuth()
  const roles = currentUser?.roles || []
  const permissions = Array.from(userPermissions(currentUser))

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="403"
        title="Access Denied"
        subtitle="Your account does not have permission to view this screen."
      />
      <section className="panel">
        <p className="muted-copy">If you believe this is incorrect, refresh access. If it still fails, confirm `/api/v1/me` returns the permissions required by this route.</p>
        <div className="pill-row compact">
          <button type="button" className="secondary-button" onClick={loadCurrentUser}>Refresh access</button>
          <button type="button" className="secondary-button" onClick={logout}>Sign out</button>
        </div>
        <div className="stack-list">
          <div className="stack-row"><strong>User</strong><span>{currentUser?.email || currentUser?.displayName || 'No current user loaded'}</span></div>
          <div className="stack-row"><strong>Roles</strong><span>{roles.length ? roles.join(', ') : 'None returned'}</span></div>
          <div className="stack-row"><strong>Permissions</strong><span>{permissions.length ? permissions.join(', ') : 'None returned'}</span></div>
        </div>
      </section>
    </div>
  )
}
