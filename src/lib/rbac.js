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

const ROLE_DEFAULT_PERMISSIONS = {
  admissions_counselor: [
    'view_student_360',
    'edit_checklist',
    'view_dashboards',
  ],
  admissions_processor: [
    'view_student_360',
    'edit_checklist',
    'view_sensitive_docs',
  ],
  reviewer_evaluator: [
    'view_student_360',
    'view_decision_packet',
  ],
  decision_releaser_director: [
    'view_student_360',
    'view_decision_packet',
    'release_decision',
    'view_dashboards',
  ],
  trust_analyst: [
    'view_student_360',
    'view_trust_flags',
    'manage_trust_cases',
    'view_sensitive_docs',
  ],
  registrar_transfer_specialist: [
    'view_student_360',
    'view_sensitive_docs',
  ],
  financial_aid: [
    'view_student_360',
    'view_dashboards',
  ],
  read_only_leadership: [
    'view_student_360',
    'view_dashboards',
  ],
  integration_service: [
    'manage_integrations',
    'view_dashboards',
  ],
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

export function userRoles(currentUser) {
  return toArray(currentUser?.roles)
}

export function userPermissions(currentUser) {
  const permissions = new Set(toArray(currentUser?.permissions))
  userRoles(currentUser).forEach((role) => {
    toArray(ROLE_DEFAULT_PERMISSIONS[role]).forEach((permission) => permissions.add(permission))
  })
  return permissions
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
