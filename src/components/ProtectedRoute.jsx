import AccessDeniedPage from '../pages/AccessDeniedPage'
import { useAuth } from '../context/AuthContext'
import { canAccess, canAccessAny } from '../lib/rbac'

export default function ProtectedRoute({
  children,
  access,
  anyAccess = [],
}) {
  const { isBootstrappingAuth, currentUser } = useAuth()

  if (isBootstrappingAuth) {
    return (
      <div className="page-wrap">
        <section className="panel">
          <p className="muted-copy">Loading access...</p>
        </section>
      </div>
    )
  }

  const allowed = anyAccess.length ? canAccessAny(currentUser, anyAccess) : canAccess(currentUser, access)

  if (!allowed) {
    return <AccessDeniedPage />
  }

  return children
}
