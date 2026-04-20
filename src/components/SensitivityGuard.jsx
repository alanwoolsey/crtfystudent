import { useAuth } from '../context/AuthContext'
import { hasSensitivityTier } from '../lib/rbac'

export default function SensitivityGuard({ tier, children, fallback = null }) {
  const { currentUser } = useAuth()
  return hasSensitivityTier(currentUser, tier) ? children : fallback
}
