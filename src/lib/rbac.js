export const ROLE_KEYS = {
  counselor: ['admissions_counselor'],
  processor: ['admissions_processor'],
  reviewer: ['reviewer_evaluator'],
  director: ['decision_releaser_director'],
  trustAnalyst: ['trust_analyst'],
  registrarTransfer: ['registrar_transfer_specialist'],
  financialAid: ['financial_aid'],
  readOnly: ['read_only_leadership'],
  integrationService: ['integration_service'],
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

export function userRoles(currentUser) {
  return toArray(currentUser?.roles)
}

export function userPermissions(currentUser) {
  return new Set(toArray(currentUser?.permissions))
}

export function userSensitivityTiers(currentUser) {
  return new Set(toArray(currentUser?.sensitivityTiers))
}

export function hasAnyRole(currentUser, allowedRoles = []) {
  const roles = userRoles(currentUser)
  return allowedRoles.some((role) => roles.includes(role))
}

export function hasAnyPermission(currentUser, allowedPermissions = []) {
  const permissions = userPermissions(currentUser)
  return allowedPermissions.some((permission) => permissions.has(permission))
}

export function hasSensitivityTier(currentUser, tier) {
  return userSensitivityTiers(currentUser).has(tier)
}

export function hasScopeValues(currentUser, scopeType) {
  const values = currentUser?.scopes?.[scopeType]
  return Array.isArray(values) && values.length > 0
}

export function canAccess(currentUser, access = {}) {
  const { roles = [], permissions = [], sensitivities = [] } = access

  const roleAllowed = roles.length ? hasAnyRole(currentUser, roles) : true
  const permissionAllowed = permissions.length ? hasAnyPermission(currentUser, permissions) : true
  const sensitivityAllowed = sensitivities.length ? sensitivities.every((tier) => hasSensitivityTier(currentUser, tier)) : true

  return roleAllowed && permissionAllowed && sensitivityAllowed
}

export function canAccessAny(currentUser, accessOptions = []) {
  if (!accessOptions.length) return true
  return accessOptions.some((access) => canAccess(currentUser, access))
}

export function isReadOnlyUser(currentUser) {
  return hasAnyRole(currentUser, ROLE_KEYS.readOnly)
}
