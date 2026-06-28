import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, RotateCcw, UserPlus, X } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const platformTenantsUrl = `${apiBaseUrl}/api/v1/platform/tenants`
const pageSize = 25
const scopeKeys = ['campuses', 'territories', 'programs', 'studentPopulations', 'stages']

function titleizeMachineValue(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

function getPlatformErrorMessage(response, payload, fallback) {
  if (response.status === 401) return 'Your session is no longer valid. Please sign in again.'
  if (response.status === 403) return 'Your account is not allowed to manage platform tenants.'
  if (response.status === 404) return 'Tenant not found.'
  if (response.status === 422) return payload?.detail || payload?.message || 'Validation failed. Check for duplicate slug or invalid status.'
  return payload?.detail || payload?.message || fallback
}

function normalizeTenant(item) {
  return {
    tenantId: item?.tenantId || item?.tenant_id || item?.id || '',
    name: item?.name || 'Unnamed tenant',
    slug: item?.slug || '',
    status: item?.status === 'inactive' ? 'inactive' : 'active',
    primaryRegion: item?.primaryRegion ?? item?.primary_region ?? null,
    dataRetentionDays: item?.dataRetentionDays ?? item?.data_retention_days ?? null,
    adminUserCount: Number(item?.adminUserCount ?? item?.admin_user_count ?? 0),
    createdAt: item?.createdAt || item?.created_at || null,
    updatedAt: item?.updatedAt || item?.updated_at || null,
  }
}

function normalizeTenantResponse(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.tenants)
        ? payload.tenants
        : []

  return {
    items: items.map(normalizeTenant).filter((item) => item.tenantId),
    page: Number(payload?.page) || 1,
    pageSize: Number(payload?.pageSize ?? payload?.page_size ?? pageSize) || pageSize,
    total: Number(payload?.total ?? items.length) || 0,
  }
}

function createTenantForm(tenant = null) {
  return {
    tenantId: tenant?.tenantId || '',
    name: tenant?.name || '',
    slug: tenant?.slug || '',
    status: tenant?.status || 'active',
    primaryRegion: tenant?.primaryRegion || '',
    dataRetentionDays: tenant?.dataRetentionDays ?? '',
  }
}

function createAdminForm() {
  return {
    tenantId: '',
    tenantName: '',
    email: '',
    displayName: '',
    baseRole: 'tenant_admin',
    roles: ['tenant_admin'],
    sensitivityTiers: ['basic_profile', 'academic_record', 'transcript_images', 'notes', 'released_decisions', 'trust_fraud_flags'],
    scopes: scopeKeys.reduce((accumulator, key) => ({ ...accumulator, [key]: ['*'] }), {}),
    sendInvite: true,
  }
}

export default function PlatformTenantsPage() {
  const { currentUser, session, fetchWithTenantAuth, hasAnyPermission } = useAuth()
  const [tenants, setTenants] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [tenantModalMode, setTenantModalMode] = useState('')
  const [tenantForm, setTenantForm] = useState(() => createTenantForm())
  const [tenantFormError, setTenantFormError] = useState('')
  const [tenantFormSuccess, setTenantFormSuccess] = useState('')
  const [isSavingTenant, setIsSavingTenant] = useState(false)
  const [adminForm, setAdminForm] = useState(() => createAdminForm())
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [adminFormError, setAdminFormError] = useState('')
  const [adminFormSuccess, setAdminFormSuccess] = useState('')
  const [isSavingAdmin, setIsSavingAdmin] = useState(false)
  const [activeTenantId, setActiveTenantId] = useState('')

  const canViewTenants = hasAnyPermission(['platform_tenants_view'])
  const canCreateTenants = hasAnyPermission(['platform_tenants_create', 'platform_tenants_manage'])
  const canUpdateTenants = hasAnyPermission(['platform_tenants_update', 'platform_tenants_manage'])
  const canProvisionAdmins = hasAnyPermission(['platform_tenants_admins_create', 'platform_tenants_manage'])
  const currentRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : []
  const isMasterTenantAdmin = currentUser?.baseRole === 'master_tenant_admin' || currentRoles.includes('master_tenant_admin')

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const loadTenants = useCallback(async () => {
    if (!session?.access_token || !canViewTenants) return

    setIsLoading(true)
    setError('')

    const search = new URLSearchParams()
    if (query.trim()) search.set('q', query.trim())
    if (statusFilter !== 'all') search.set('status', statusFilter)
    search.set('page', String(page))
    search.set('pageSize', String(pageSize))

    try {
      const response = await fetchWithTenantAuth(`${platformTenantsUrl}?${search.toString()}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getPlatformErrorMessage(response, payload, 'Unable to load platform tenants.'))
      }

      const normalized = normalizeTenantResponse(payload)
      setTenants(normalized.items)
      setTotal(normalized.total)
    } catch (nextError) {
      setTenants([])
      setTotal(0)
      setError(nextError.message || 'Unable to load platform tenants.')
    } finally {
      setIsLoading(false)
    }
  }, [canViewTenants, fetchWithTenantAuth, page, query, session, statusFilter])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter])

  function openCreateTenantModal() {
    setTenantModalMode('create')
    setTenantForm(createTenantForm())
    setTenantFormError('')
    setTenantFormSuccess('')
  }

  function openEditTenantModal(tenant) {
    setTenantModalMode('edit')
    setTenantForm(createTenantForm(tenant))
    setTenantFormError('')
    setTenantFormSuccess('')
  }

  function closeTenantModal() {
    setTenantModalMode('')
    setTenantFormError('')
    setTenantFormSuccess('')
  }

  function openAdminModal(tenant = null) {
    setAdminForm({
      ...createAdminForm(),
      tenantId: tenant?.tenantId || '',
      tenantName: tenant?.name || '',
    })
    setAdminFormError('')
    setAdminFormSuccess('')
    setIsAdminModalOpen(true)
  }

  function closeAdminModal() {
    setAdminForm(createAdminForm())
    setAdminFormError('')
    setAdminFormSuccess('')
    setIsAdminModalOpen(false)
  }

  function handleTenantFieldChange(event) {
    const { name, value } = event.target
    setTenantForm((current) => ({ ...current, [name]: value }))
  }

  function handleAdminFieldChange(event) {
    const { name, value, type, checked } = event.target
    setAdminForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'tenantId' ? { tenantName: tenants.find((tenant) => tenant.tenantId === value)?.name || '' } : {}),
    }))
  }

  function handleCommaListChange(field, value) {
    setAdminForm((current) => ({
      ...current,
      [field]: value.split(',').map((item) => item.trim()).filter(Boolean),
    }))
  }

  function handleScopeChange(scopeKey, value) {
    const values = value.split(',').map((item) => item.trim()).filter(Boolean)
    setAdminForm((current) => ({
      ...current,
      scopes: {
        ...current.scopes,
        [scopeKey]: values.length ? values : ['*'],
      },
    }))
  }

  async function handleTenantSubmit(event) {
    event.preventDefault()
    setTenantFormError('')
    setTenantFormSuccess('')

    if (!tenantForm.name.trim()) {
      setTenantFormError('Tenant name is required.')
      return
    }

    setIsSavingTenant(true)

    const payload = {
      name: tenantForm.name.trim(),
      slug: tenantForm.slug.trim() || null,
      status: tenantForm.status,
      primaryRegion: tenantForm.primaryRegion.trim() || null,
      dataRetentionDays: tenantForm.dataRetentionDays === '' ? null : Number(tenantForm.dataRetentionDays),
    }

    try {
      const isEdit = tenantModalMode === 'edit'
      const response = await fetchWithTenantAuth(isEdit ? `${platformTenantsUrl}/${tenantForm.tenantId}` : platformTenantsUrl, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const responsePayload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getPlatformErrorMessage(response, responsePayload, isEdit ? 'Unable to update tenant.' : 'Unable to create tenant.'))
      }

      setTenantFormSuccess(isEdit ? 'Tenant updated.' : 'Tenant created.')
      await loadTenants()
      window.setTimeout(() => closeTenantModal(), 250)
    } catch (nextError) {
      setTenantFormError(nextError.message || 'Unable to save tenant.')
    } finally {
      setIsSavingTenant(false)
    }
  }

  async function handleTenantStatus(tenant, active) {
    setActiveTenantId(tenant.tenantId)
    setError('')

    try {
      const action = active ? 'activate' : 'deactivate'
      const response = await fetchWithTenantAuth(`${platformTenantsUrl}/${tenant.tenantId}/${action}`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getPlatformErrorMessage(response, payload, `Unable to ${action} tenant.`))
      }

      await loadTenants()
    } catch (nextError) {
      setError(nextError.message || 'Unable to update tenant status.')
    } finally {
      setActiveTenantId('')
    }
  }

  async function handleAdminSubmit(event) {
    event.preventDefault()
    setAdminFormError('')
    setAdminFormSuccess('')

    if (!adminForm.tenantId) {
      setAdminFormError('Select a tenant before adding an admin.')
      return
    }
    if (!adminForm.email.trim() || !adminForm.displayName.trim()) {
      setAdminFormError('Admin email and display name are required.')
      return
    }
    const requestedRoles = new Set([adminForm.baseRole.trim(), ...adminForm.roles].filter(Boolean))
    if (requestedRoles.has('master_tenant_admin') && !isMasterTenantAdmin) {
      setAdminFormError('Only a master tenant admin can assign the master tenant admin role.')
      return
    }

    setIsSavingAdmin(true)

    const payload = {
      email: adminForm.email.trim(),
      displayName: adminForm.displayName.trim(),
      baseRole: adminForm.baseRole.trim() || undefined,
      roles: adminForm.roles,
      sensitivityTiers: adminForm.sensitivityTiers,
      scopes: adminForm.scopes,
      sendInvite: adminForm.sendInvite,
    }

    try {
      const response = await fetchWithTenantAuth(`${platformTenantsUrl}/${adminForm.tenantId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const responsePayload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(getPlatformErrorMessage(response, responsePayload, 'Unable to provision tenant admin.'))
      }

      setAdminFormSuccess('Tenant admin provisioned.')
      await loadTenants()
      window.setTimeout(() => closeAdminModal(), 250)
    } catch (nextError) {
      setAdminFormError(nextError.message || 'Unable to provision tenant admin.')
    } finally {
      setIsSavingAdmin(false)
    }
  }

  const summary = useMemo(() => ({
    shown: tenants.length,
    active: tenants.filter((tenant) => tenant.status === 'active').length,
    inactive: tenants.filter((tenant) => tenant.status === 'inactive').length,
    totalAdmins: tenants.reduce((sum, tenant) => sum + tenant.adminUserCount, 0),
  }), [tenants])

  if (!canViewTenants) {
    return (
      <div className="page-wrap">
        <SectionHeader
          eyebrow="Platform"
          title="Tenants"
          subtitle="Platform tenant management requires platform_tenants_view."
        />
        <section className="panel">
          <p className="muted-copy">Your account does not have platform tenant permissions.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Platform administration"
        title="Tenants"
        subtitle="Create client tenants, manage tenant status, and provision the first tenant admin."
        actions={(
          <>
            {canProvisionAdmins ? (
              <button type="button" className="secondary-button" onClick={() => openAdminModal()}>
                <UserPlus size={16} />
                Add tenant admin
              </button>
            ) : null}
            {canCreateTenants ? (
              <button type="button" className="primary-button" onClick={openCreateTenantModal}>
                <Plus size={16} />
                Create tenant
              </button>
            ) : null}
          </>
        )}
      />

      <section className="stats-grid">
        <article className="stat-card tone-indigo"><span>Showing</span><strong>{summary.shown}</strong><p>{total} total tenants</p></article>
        <article className="stat-card tone-teal"><span>Active</span><strong>{summary.active}</strong><p>Active on this page</p></article>
        <article className="stat-card tone-rose"><span>Inactive</span><strong>{summary.inactive}</strong><p>Inactive on this page</p></article>
        <article className="stat-card tone-violet"><span>Admin users</span><strong>{summary.totalAdmins}</strong><p>Admin users on this page</p></article>
      </section>

      <section className="panel">
        <div className="toolbar-row today-filter-bar">
          <input
            className="filter-input"
            placeholder="Search tenant name or slug"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="today-filter-selects">
            <label className="auth-field compact-field">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={loadTenants} disabled={isLoading}>
              <RotateCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {error ? <p className="auth-error">{error}</p> : null}

        <div className="list-pagination-bar admin-toolbar">
          <p className="muted-copy">Page {page} of {totalPages}</p>
          <div className="pagination-controls">
            <button type="button" className="secondary-button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <button type="button" className="secondary-button" disabled={page >= totalPages || isLoading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="muted-copy">Loading tenants...</p>
        ) : tenants.length ? (
          <div className="table-wrap platform-tenant-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Region</th>
                  <th>Retention Days</th>
                  <th>Admin Users</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.tenantId}>
                    <td><strong>{tenant.name}</strong></td>
                    <td>{tenant.slug || '-'}</td>
                    <td><span className={`badge ${tenant.status === 'active' ? 'risk-low' : 'risk-high'}`}>{titleizeMachineValue(tenant.status)}</span></td>
                    <td>{tenant.primaryRegion || '-'}</td>
                    <td>{tenant.dataRetentionDays ?? '-'}</td>
                    <td>{tenant.adminUserCount}</td>
                    <td>{formatDate(tenant.createdAt)}</td>
                    <td>
                      <div className="pill-row compact">
                        {canUpdateTenants ? (
                          <button type="button" className="secondary-button compact-button" onClick={() => openEditTenantModal(tenant)}>
                            <Pencil size={14} />
                            Edit
                          </button>
                        ) : null}
                        {canUpdateTenants ? (
                          <button
                            type="button"
                            className="secondary-button compact-button"
                            disabled={activeTenantId === tenant.tenantId}
                            onClick={() => handleTenantStatus(tenant, tenant.status !== 'active')}
                          >
                            {activeTenantId === tenant.tenantId
                              ? 'Working...'
                              : tenant.status === 'active'
                                ? 'Deactivate'
                                : 'Activate'}
                          </button>
                        ) : null}
                        {canProvisionAdmins ? (
                          <button type="button" className="secondary-button compact-button" onClick={() => openAdminModal(tenant)}>
                            <UserPlus size={14} />
                            Add Admin
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted-copy">No tenants match the current filters.</p>
        )}
      </section>

      {tenantModalMode ? (
        <div className="modal-scrim" onClick={closeTenantModal} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="panel-header">
              <div>
                <h3>{tenantModalMode === 'create' ? 'Create tenant' : 'Edit tenant'}</h3>
                <p>{tenantModalMode === 'create' ? 'Create a new client tenant.' : tenantForm.tenantId}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeTenantModal} aria-label="Close tenant editor">
                <X size={18} />
              </button>
            </div>

            <form className="auth-form password-form" onSubmit={handleTenantSubmit}>
              <label className="auth-field">
                <span>Name</span>
                <input name="name" value={tenantForm.name} onChange={handleTenantFieldChange} required />
              </label>
              <label className="auth-field">
                <span>Slug</span>
                <input name="slug" value={tenantForm.slug} onChange={handleTenantFieldChange} placeholder="Optional" />
              </label>
              <div className="admin-form-grid">
                <label className="auth-field">
                  <span>Status</span>
                  <select name="status" value={tenantForm.status} onChange={handleTenantFieldChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="auth-field">
                  <span>Primary region</span>
                  <input name="primaryRegion" value={tenantForm.primaryRegion} onChange={handleTenantFieldChange} placeholder="Optional" />
                </label>
              </div>
              <label className="auth-field">
                <span>Data retention days</span>
                <input name="dataRetentionDays" type="number" min="0" value={tenantForm.dataRetentionDays} onChange={handleTenantFieldChange} placeholder="Optional" />
              </label>

              {tenantFormError ? <p className="auth-error">{tenantFormError}</p> : null}
              {tenantFormSuccess ? <p className="auth-success">{tenantFormSuccess}</p> : null}

              <div className="password-actions">
                <button type="button" className="secondary-button" onClick={closeTenantModal}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSavingTenant}>
                  {isSavingTenant ? 'Saving...' : tenantModalMode === 'create' ? 'Create tenant' : 'Save tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAdminModalOpen ? (
        <div className="modal-scrim" onClick={closeAdminModal} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="panel-header">
              <div>
                <h3>Add tenant admin</h3>
                <p>{adminForm.tenantName || 'Select the tenant this admin should manage.'}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeAdminModal} aria-label="Close admin provisioning">
                <X size={18} />
              </button>
            </div>

            <form className="auth-form course-modal-body admin-user-form" onSubmit={handleAdminSubmit}>
              <label className="auth-field">
                <span>Tenant</span>
                <select name="tenantId" value={adminForm.tenantId} onChange={handleAdminFieldChange} required>
                  <option value="">Select tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.tenantId} value={tenant.tenantId}>
                      {tenant.name} {tenant.slug ? `(${tenant.slug})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div className="admin-form-grid">
                <label className="auth-field">
                  <span>Email</span>
                  <input type="email" name="email" value={adminForm.email} onChange={handleAdminFieldChange} required />
                </label>
                <label className="auth-field">
                  <span>Display name</span>
                  <input name="displayName" value={adminForm.displayName} onChange={handleAdminFieldChange} required />
                </label>
              </div>
              <label className="auth-field">
                <span>Base role</span>
                <input name="baseRole" value={adminForm.baseRole} onChange={handleAdminFieldChange} placeholder="tenant_admin" />
              </label>
              <label className="auth-field">
                <span>Roles</span>
                <input value={adminForm.roles.join(', ')} onChange={(event) => handleCommaListChange('roles', event.target.value)} />
              </label>
              <label className="auth-field">
                <span>Sensitivity tiers</span>
                <input value={adminForm.sensitivityTiers.join(', ')} onChange={(event) => handleCommaListChange('sensitivityTiers', event.target.value)} />
              </label>

              <div className="panel admin-form-panel">
                <div className="panel-header">
                  <div>
                    <h3>Scopes</h3>
                    <p>Use `*` for full-tenant admin scope.</p>
                  </div>
                </div>
                <div className="admin-form-grid">
                  {scopeKeys.map((scopeKey) => (
                    <label key={scopeKey} className="auth-field">
                      <span>{titleizeMachineValue(scopeKey)}</span>
                      <input
                        value={(adminForm.scopes[scopeKey] || ['*']).join(', ')}
                        onChange={(event) => handleScopeChange(scopeKey, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="admin-inline-check">
                <input type="checkbox" name="sendInvite" checked={adminForm.sendInvite} onChange={handleAdminFieldChange} />
                <span>Send invite after provisioning</span>
              </label>

              {adminFormError ? <p className="auth-error">{adminFormError}</p> : null}
              {adminFormSuccess ? <p className="auth-success">{adminFormSuccess}</p> : null}

              <div className="password-actions">
                <button type="button" className="secondary-button" onClick={closeAdminModal}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSavingAdmin}>
                  {isSavingAdmin ? 'Provisioning...' : 'Create tenant admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
