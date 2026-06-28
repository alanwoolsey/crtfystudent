export function isTenantAdminUser(currentUser) {
  const roles = new Set(Array.isArray(currentUser?.roles) ? currentUser.roles : [])
  if (currentUser?.baseRole) roles.add(currentUser.baseRole)
  return roles.has('tenant_admin') || roles.has('master_tenant_admin')
}
