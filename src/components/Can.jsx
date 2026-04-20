import { useAuth } from '../context/AuthContext'
import { canAccess } from '../lib/rbac'

export default function Can({ access, children, fallback = null }) {
  const { currentUser } = useAuth()
  return canAccess(currentUser, access) ? children : fallback
}
