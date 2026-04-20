import { useAuth } from '../context/AuthContext'
import { hasScopeValues } from '../lib/rbac'

export default function ScopeGuard({ scopeType, children, fallback = null }) {
  const { currentUser } = useAuth()
  return hasScopeValues(currentUser, scopeType) ? children : fallback
}
