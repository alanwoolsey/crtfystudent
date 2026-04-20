import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, RotateCcw, Trash2, UserPlus, X } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const adminUsersUrl = `${apiBaseUrl}/api/v1/admin/users`
const adminRolesUrl = `${apiBaseUrl}/api/v1/admin/roles`
const adminSensitivityTiersUrl = `${apiBaseUrl}/api/v1/admin/sensitivity-tiers`
const adminScopeOptionsUrl = `${apiBaseUrl}/api/v1/admin/scope-options`

const scopeKeys = ['campuses', 'territories', 'programs', 'studentPopulations', 'stages']

function titleizeMachineValue(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function normalizeCollection(payload, fallbackKeys = []) {
  if (Array.isArray(payload)) return payload
  for (const key of fallbackKeys) {
    if (Array.isArray(payload?.[key])) return payload[key]
  }
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function normalizeRoleOptions(payload) {
  const items = normalizeCollection(payload, ['roles'])
  if (!items.length) {
    return [
      'admissions_counselor',
      'admissions_processor',
      'reviewer_evaluator',
      'decision_releaser_director',
      'trust_analyst',
      'registrar_transfer_specialist',
      'financial_aid',
      'read_only_leadership',
      'integration_service',
    ].map((key) => ({ key, label: titleizeMachineValue(key) }))
  }

  return items.map((item) => ({
    key: item.key || item.id || item.role || item.code,
    label: item.label || titleizeMachineValue(item.key || item.id || item.role || item.code),
    description: item.description || '',
  })).filter((item) => item.key)
}

function normalizeTierOptions(payload) {
  const items = normalizeCollection(payload, ['tiers', 'sensitivityTiers'])
  if (!items.length) {
    return [
      'basic_profile',
      'academic_record',
      'transcript_images',
      'trust_fraud_flags',
      'notes',
      'released_decisions',
    ].map((key) => ({ key, label: titleizeMachineValue(key) }))
  }

  return items.map((item) => ({
    key: item.key || item.id || item.code || item.tier,
    label: item.label || titleizeMachineValue(item.key || item.id || item.code || item.tier),
  })).filter((item) => item.key)
}

function normalizeScopeOptions(payload) {
  const options = payload && typeof payload === 'object' ? payload : {}
  return scopeKeys.reduce((accumulator, key) => {
    accumulator[key] = Array.isArray(options[key]) ? options[key] : []
    return accumulator
  }, {})
}

function normalizeUserRecord(user) {
  return {
    userId: user.userId || user.id || user.sub || user.email,
    email: user.email || '',
    displayName: user.displayName || user.name || user.email || 'Unknown user',
    status: user.status || 'active',
    baseRole: user.baseRole || '',
    roles: Array.isArray(user.roles) ? user.roles : [],
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    sensitivityTiers: Array.isArray(user.sensitivityTiers) ? user.sensitivityTiers : [],
    scopes: user.scopes && typeof user.scopes === 'object'
      ? user.scopes
      : scopeKeys.reduce((accumulator, key) => ({ ...accumulator, [key]: [] }), {}),
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  }
}

function buildFallbackUser(currentUser) {
  if (!currentUser) return []

  return [normalizeUserRecord({
    userId: currentUser.userId,
    email: currentUser.email,
    displayName: currentUser.displayName,
    status: 'active',
    baseRole: currentUser.baseRole,
    roles: currentUser.roles,
    permissions: currentUser.permissions,
    sensitivityTiers: currentUser.sensitivityTiers,
    scopes: currentUser.scopes,
  })]
}

function formatDateTime(value) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function createEmptyForm(roleOptions = [], tierOptions = []) {
  return {
    userId: '',
    email: '',
    displayName: '',
    status: 'active',
    baseRole: roleOptions[0]?.key || '',
    roles: [],
    sensitivityTiers: tierOptions.filter((tier) => tier.key === 'basic_profile').map((tier) => tier.key),
    scopes: scopeKeys.reduce((accumulator, key) => ({ ...accumulator, [key]: [] }), {}),
    sendInvite: true,
  }
}

function getAdminErrorMessage(response, payload, fallback) {
  if (response.status === 401) return 'Your session is no longer valid. Please sign in again.'
  if (response.status === 403) return 'Your account is not allowed to manage admin users.'
  if (response.status === 404) return 'Admin user endpoints are not available yet. Showing local session fallback.'
  return payload?.detail || payload?.message || fallback
}

export default function AdminPage() {
  const { session, currentUser, fetchWithTenantAuth, hasAnyPermission } = useAuth()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('live')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [roleOptions, setRoleOptions] = useState([])
  const [tierOptions, setTierOptions] = useState([])
  const [scopeOptions, setScopeOptions] = useState(() => scopeKeys.reduce((accumulator, key) => ({ ...accumulator, [key]: [] }), {}))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [form, setForm] = useState(() => createEmptyForm())
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [activeUserId, setActiveUserId] = useState('')

  const canViewUsers = hasAnyPermission(['admin_users_view', 'manage_integrations', 'release_decision'])
  const canCreateUsers = hasAnyPermission(['admin_users_create', 'manage_integrations', 'release_decision'])
  const canUpdateUsers = hasAnyPermission(['admin_users_update', 'manage_integrations', 'release_decision'])
  const canDeactivateUsers = hasAnyPermission(['admin_users_deactivate', 'manage_integrations', 'release_decision'])
  const canDeleteUsers = hasAnyPermission(['admin_users_delete', 'manage_integrations', 'release_decision'])

  const loadAdminData = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id || !canViewUsers) return

    setIsLoading(true)
    setError('')

    try {
      const [usersResponse, rolesResponse, tiersResponse, scopesResponse] = await Promise.all([
        fetchWithTenantAuth(adminUsersUrl),
        fetchWithTenantAuth(adminRolesUrl),
        fetchWithTenantAuth(adminSensitivityTiersUrl),
        fetchWithTenantAuth(adminScopeOptionsUrl),
      ])

      const [usersPayload, rolesPayload, tiersPayload, scopesPayload] = await Promise.all([
        usersResponse.json().catch(() => ({})),
        rolesResponse.json().catch(() => ({})),
        tiersResponse.json().catch(() => ({})),
        scopesResponse.json().catch(() => ({})),
      ])

      if (!usersResponse.ok) {
        throw new Error(getAdminErrorMessage(usersResponse, usersPayload, 'Unable to load admin users.'))
      }

      setUsers(normalizeCollection(usersPayload, ['users']).map(normalizeUserRecord))
      setRoleOptions(normalizeRoleOptions(rolesResponse.ok ? rolesPayload : {}))
      setTierOptions(normalizeTierOptions(tiersResponse.ok ? tiersPayload : {}))
      setScopeOptions(normalizeScopeOptions(scopesResponse.ok ? scopesPayload : {}))
      setMode('live')
    } catch (nextError) {
      setUsers(buildFallbackUser(currentUser))
      setRoleOptions(normalizeRoleOptions({}))
      setTierOptions(normalizeTierOptions({}))
      setScopeOptions(normalizeScopeOptions({}))
      setMode('fallback')
      setError(nextError.message || 'Unable to load admin users.')
    } finally {
      setIsLoading(false)
    }
  }, [canViewUsers, currentUser, fetchWithTenantAuth, session])

  useEffect(() => {
    loadAdminData()
  }, [loadAdminData])

  useEffect(() => {
    if (!isModalOpen) {
      setForm(createEmptyForm(roleOptions, tierOptions))
    }
  }, [isModalOpen, roleOptions, tierOptions])

  const summary = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.status === 'active').length,
    invited: users.filter((user) => user.status === 'invited').length,
    inactive: users.filter((user) => user.status === 'inactive').length,
  }), [users])

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase()
    return users.filter((user) => {
      if (statusFilter !== 'all' && user.status !== statusFilter) return false
      if (roleFilter !== 'all' && !user.roles.includes(roleFilter) && user.baseRole !== roleFilter) return false

      const haystack = [
        user.displayName,
        user.email,
        user.baseRole,
        user.roles.join(' '),
        user.sensitivityTiers.join(' '),
      ].join(' ').toLowerCase()

      return search ? haystack.includes(search) : true
    })
  }, [query, roleFilter, statusFilter, users])

  function openCreateModal() {
    setModalMode('create')
    setForm(createEmptyForm(roleOptions, tierOptions))
    setFormError('')
    setFormSuccess('')
    setIsModalOpen(true)
  }

  function openEditModal(user) {
    setModalMode('edit')
    setForm({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      baseRole: user.baseRole || user.roles[0] || roleOptions[0]?.key || '',
      roles: user.roles,
      sensitivityTiers: user.sensitivityTiers,
      scopes: scopeKeys.reduce((accumulator, key) => ({
        ...accumulator,
        [key]: Array.isArray(user.scopes?.[key]) ? user.scopes[key] : [],
      }), {}),
      sendInvite: false,
    })
    setFormError('')
    setFormSuccess('')
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setFormError('')
    setFormSuccess('')
  }

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function toggleArrayValue(field, value) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }))
  }

  function toggleScopeValue(scopeKey, value) {
    setForm((current) => ({
      ...current,
      scopes: {
        ...current.scopes,
        [scopeKey]: current.scopes[scopeKey].includes(value)
          ? current.scopes[scopeKey].filter((item) => item !== value)
          : [...current.scopes[scopeKey], value],
      },
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!form.displayName.trim() || !form.email.trim()) {
      setFormError('Enter a display name and email.')
      return
    }

    setIsSaving(true)

    const payload = {
      email: form.email.trim(),
      displayName: form.displayName.trim(),
      baseRole: form.baseRole || null,
      status: form.status,
      roles: form.roles,
      sensitivityTiers: form.sensitivityTiers,
      scopes: form.scopes,
      ...(modalMode === 'create' ? { sendInvite: form.sendInvite } : {}),
    }

    try {
      if (mode === 'live') {
        const url = modalMode === 'create' ? adminUsersUrl : `${adminUsersUrl}/${form.userId}`
        const response = await fetchWithTenantAuth(url, {
          method: modalMode === 'create' ? 'POST' : 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        const responsePayload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(getAdminErrorMessage(response, responsePayload, `Unable to ${modalMode} user.`))
        }

        if (responsePayload?.userId || responsePayload?.id) {
          const updatedUser = normalizeUserRecord(responsePayload)
          setUsers((current) => modalMode === 'create'
            ? [updatedUser, ...current]
            : current.map((user) => user.userId === updatedUser.userId ? updatedUser : user))
        } else {
          await loadAdminData()
        }
      } else {
        const now = new Date().toISOString()
        const updatedUser = normalizeUserRecord({
          ...payload,
          userId: modalMode === 'create' ? `local-${Date.now()}` : form.userId,
          createdAt: modalMode === 'create' ? now : users.find((user) => user.userId === form.userId)?.createdAt || now,
          updatedAt: now,
          lastLoginAt: modalMode === 'create' ? null : users.find((user) => user.userId === form.userId)?.lastLoginAt || null,
        })
        setUsers((current) => modalMode === 'create'
          ? [updatedUser, ...current]
          : current.map((user) => user.userId === updatedUser.userId ? updatedUser : user))
      }

      setFormSuccess(modalMode === 'create' ? 'User created.' : 'User updated.')
      window.setTimeout(() => closeModal(), 250)
    } catch (nextError) {
      setFormError(nextError.message || `Unable to ${modalMode} user.`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusAction(user, action) {
    const isDelete = action === 'delete'
    const isDeactivate = action === 'deactivate'
    const targetUrl = isDelete
      ? `${adminUsersUrl}/${user.userId}`
      : `${adminUsersUrl}/${user.userId}/${action}`

    setActiveUserId(user.userId)
    setError('')

    try {
      if (mode === 'live') {
        const response = await fetchWithTenantAuth(targetUrl, {
          method: isDelete ? 'DELETE' : 'POST',
        })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(getAdminErrorMessage(response, payload, `Unable to ${action} user.`))
        }

        await loadAdminData()
        return
      }

      setUsers((current) => {
        if (isDelete) return current.filter((item) => item.userId !== user.userId)
        return current.map((item) => item.userId !== user.userId
          ? item
          : {
              ...item,
              status: isDeactivate ? 'inactive' : 'active',
              updatedAt: new Date().toISOString(),
            })
      })
    } catch (nextError) {
      setError(nextError.message || `Unable to ${action} user.`)
    } finally {
      setActiveUserId('')
    }
  }

  async function handleSendInvite(user) {
    setActiveUserId(user.userId)
    setError('')

    try {
      if (mode === 'live') {
        const response = await fetchWithTenantAuth(`${adminUsersUrl}/${user.userId}/send-invite`, {
          method: 'POST',
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(getAdminErrorMessage(response, payload, 'Unable to send invite.'))
        }

        await loadAdminData()
        return
      }

      setUsers((current) => current.map((item) => item.userId !== user.userId ? item : {
        ...item,
        status: item.status === 'active' ? 'active' : 'invited',
        updatedAt: new Date().toISOString(),
      }))
    } catch (nextError) {
      setError(nextError.message || 'Unable to send invite.')
    } finally {
      setActiveUserId('')
    }
  }

  if (!canViewUsers) {
    return (
      <div className="page-wrap">
        <SectionHeader
          eyebrow="Administration"
          title="Admin"
          subtitle="User management is limited to admin-enabled accounts."
        />
        <section className="panel">
          <p className="muted-copy">Your account can open the Admin route, but it does not have user management permissions.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Administration"
        title="Admin"
        subtitle="Manage tenant users, roles, access tiers, and scope boundaries from one place."
        actions={canCreateUsers ? (
          <button type="button" className="primary-button" onClick={openCreateModal}>
            <Plus size={16} />
            Add user
          </button>
        ) : null}
      />

      <section className="stats-grid">
        <article className="panel value-card">
          <span className="table-sub">Total users</span>
          <strong>{summary.total}</strong>
          <p>All tenant users currently loaded into the admin surface.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Active</span>
          <strong>{summary.active}</strong>
          <p>Users who can actively work admissions queues and records.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Invited</span>
          <strong>{summary.invited}</strong>
          <p>Accounts awaiting invite acceptance or first login.</p>
        </article>
        <article className="panel value-card">
          <span className="table-sub">Inactive</span>
          <strong>{summary.inactive}</strong>
          <p>Users retained for audit history but removed from day-to-day access.</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Users</h3>
            <p>Search, filter, and manage admissions access at the tenant level.</p>
          </div>
          <div className="pill-row compact">
            <span className="tag">{mode === 'live' ? 'Live admin API' : 'Local fallback mode'}</span>
          </div>
        </div>

        <div className="table-toolbar admin-toolbar">
          <input
            className="filter-input"
            placeholder="Search name, email, role, or sensitivity tier"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="today-filter-selects">
            <label className="auth-field compact-field">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="auth-field compact-field">
              <span>Role</span>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="all">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role.key} value={role.key}>{role.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="pill-row compact">
            <button type="button" className="secondary-button" onClick={loadAdminData}>
              <RotateCcw size={16} />
              Refresh
            </button>
          </div>
          {error ? <p className="muted-copy">{error}</p> : null}
        </div>

        {isLoading ? (
          <p className="muted-copy">Loading admin users...</p>
        ) : filteredUsers.length ? (
          <div className="admin-user-list">
            {filteredUsers.map((user) => (
              <article key={user.userId} className="admin-user-card">
                <div className="admin-user-header">
                  <div>
                    <h4>{user.displayName}</h4>
                    <p>{user.email}</p>
                  </div>
                  <div className="pill-row compact">
                    <span className={`badge ${user.status === 'active' ? 'risk-low' : user.status === 'inactive' ? 'risk-high' : 'neutral-badge'}`}>
                      {titleizeMachineValue(user.status)}
                    </span>
                    {user.baseRole ? <span className="tag">{titleizeMachineValue(user.baseRole)}</span> : null}
                  </div>
                </div>

                <div className="admin-user-meta">
                  <div><span>Roles</span><strong>{user.roles.length ? user.roles.map(titleizeMachineValue).join(', ') : 'None'}</strong></div>
                  <div><span>Sensitivity</span><strong>{user.sensitivityTiers.length ? user.sensitivityTiers.map(titleizeMachineValue).join(', ') : 'None'}</strong></div>
                  <div><span>Last login</span><strong>{formatDateTime(user.lastLoginAt)}</strong></div>
                  <div><span>Updated</span><strong>{formatDateTime(user.updatedAt)}</strong></div>
                </div>

                <div className="admin-scope-grid">
                  {scopeKeys.map((scopeKey) => (
                    <div key={scopeKey} className="admin-scope-card">
                      <span>{titleizeMachineValue(scopeKey)}</span>
                      <strong>{user.scopes?.[scopeKey]?.length ? user.scopes[scopeKey].join(', ') : 'All allowed'}</strong>
                    </div>
                  ))}
                </div>

                <div className="work-item-actions admin-user-actions">
                  {canUpdateUsers ? (
                    <button type="button" className="secondary-button" onClick={() => openEditModal(user)}>
                      <Pencil size={16} />
                      Edit
                    </button>
                  ) : null}
                  {canUpdateUsers ? (
                    <button type="button" className="secondary-button" onClick={() => handleSendInvite(user)} disabled={activeUserId === user.userId}>
                      <UserPlus size={16} />
                      {activeUserId === user.userId ? 'Working...' : 'Send invite'}
                    </button>
                  ) : null}
                  {canDeactivateUsers && user.status !== 'inactive' ? (
                    <button type="button" className="secondary-button" onClick={() => handleStatusAction(user, 'deactivate')} disabled={activeUserId === user.userId}>
                      {activeUserId === user.userId ? 'Working...' : 'Deactivate'}
                    </button>
                  ) : null}
                  {canDeactivateUsers && user.status === 'inactive' ? (
                    <button type="button" className="secondary-button" onClick={() => handleStatusAction(user, 'reactivate')} disabled={activeUserId === user.userId}>
                      {activeUserId === user.userId ? 'Working...' : 'Reactivate'}
                    </button>
                  ) : null}
                  {canDeleteUsers ? (
                    <button type="button" className="secondary-button admin-danger-button" onClick={() => handleStatusAction(user, 'delete')} disabled={activeUserId === user.userId}>
                      <Trash2 size={16} />
                      {activeUserId === user.userId ? 'Working...' : 'Remove'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted-copy">No users match the current filters.</p>
        )}
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Role catalog</h3>
              <p>Display labels come from the backend when available. Machine keys stay authoritative.</p>
            </div>
          </div>
          <div className="stack-list">
            {roleOptions.map((role) => (
              <div key={role.key} className="stack-row">
                <strong>{role.label}</strong>
                <span>{role.description || role.key}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Scope options</h3>
              <p>These values drive tenant-scoped access. They should come from backend policy, not frontend hardcoding.</p>
            </div>
          </div>
          <div className="admin-scope-reference">
            {scopeKeys.map((scopeKey) => (
              <div key={scopeKey} className="admin-scope-reference-row">
                <strong>{titleizeMachineValue(scopeKey)}</strong>
                <div className="pill-row compact">
                  {(scopeOptions[scopeKey] || []).length
                    ? scopeOptions[scopeKey].map((option) => <span key={option} className="tag">{option}</span>)
                    : <span className="muted-copy">Backend options pending</span>}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {isModalOpen ? (
        <div className="modal-scrim" onClick={closeModal} role="presentation">
          <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="admin-user-modal-title">
            <div className="panel-header">
              <div>
                <h3 id="admin-user-modal-title">{modalMode === 'create' ? 'Add user' : 'Edit user'}</h3>
                <p>{modalMode === 'create' ? 'Create a tenant user and assign the right roles and scopes.' : form.email}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeModal} aria-label="Close user editor">
                <X size={18} />
              </button>
            </div>

            <form className="auth-form course-modal-body admin-user-form" onSubmit={handleSubmit}>
              <div className="admin-form-grid">
                <label className="auth-field">
                  <span>Display name</span>
                  <input name="displayName" value={form.displayName} onChange={handleFieldChange} required />
                </label>
                <label className="auth-field">
                  <span>Email</span>
                  <input type="email" name="email" value={form.email} onChange={handleFieldChange} required />
                </label>
              </div>

              <div className="admin-form-grid">
                <label className="auth-field">
                  <span>Base role</span>
                  <select name="baseRole" value={form.baseRole} onChange={handleFieldChange}>
                    <option value="">None</option>
                    {roleOptions.map((role) => (
                      <option key={role.key} value={role.key}>{role.label}</option>
                    ))}
                  </select>
                </label>
                <label className="auth-field">
                  <span>Status</span>
                  <select name="status" value={form.status} onChange={handleFieldChange}>
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="panel admin-form-panel">
                <div className="panel-header">
                  <div>
                    <h3>Roles</h3>
                    <p>Assign one or more machine-key roles. The backend remains source of truth.</p>
                  </div>
                </div>
                <div className="admin-check-grid">
                  {roleOptions.map((role) => (
                    <label key={role.key} className="admin-check-card">
                      <input
                        type="checkbox"
                        checked={form.roles.includes(role.key)}
                        onChange={() => toggleArrayValue('roles', role.key)}
                      />
                      <div>
                        <strong>{role.label}</strong>
                        <span>{role.description || role.key}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="panel admin-form-panel">
                <div className="panel-header">
                  <div>
                    <h3>Sensitivity tiers</h3>
                    <p>Use these to control academic, trust, notes, and released-decision visibility.</p>
                  </div>
                </div>
                <div className="admin-check-grid">
                  {tierOptions.map((tier) => (
                    <label key={tier.key} className="admin-check-card">
                      <input
                        type="checkbox"
                        checked={form.sensitivityTiers.includes(tier.key)}
                        onChange={() => toggleArrayValue('sensitivityTiers', tier.key)}
                      />
                      <div>
                        <strong>{tier.label}</strong>
                        <span>{tier.key}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="panel admin-form-panel">
                <div className="panel-header">
                  <div>
                    <h3>Scopes</h3>
                    <p>Scope boundaries should come from backend policy. Select what this user is allowed to work.</p>
                  </div>
                </div>
                <div className="admin-scope-editor">
                  {scopeKeys.map((scopeKey) => (
                    <div key={scopeKey} className="admin-scope-editor-row">
                      <strong>{titleizeMachineValue(scopeKey)}</strong>
                      <div className="admin-check-grid">
                        {(scopeOptions[scopeKey] || []).length ? (scopeOptions[scopeKey] || []).map((option) => (
                          <label key={option} className="admin-check-card compact">
                            <input
                              type="checkbox"
                              checked={form.scopes[scopeKey].includes(option)}
                              onChange={() => toggleScopeValue(scopeKey, option)}
                            />
                            <div>
                              <strong>{option}</strong>
                            </div>
                          </label>
                        )) : <p className="muted-copy">No backend options returned for {titleizeMachineValue(scopeKey)} yet.</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {modalMode === 'create' ? (
                <label className="admin-inline-check">
                  <input type="checkbox" name="sendInvite" checked={form.sendInvite} onChange={handleFieldChange} />
                  <span>Send invite after creation</span>
                </label>
              ) : null}

              {formError ? <p className="auth-error">{formError}</p> : null}
              {formSuccess ? <p className="auth-success">{formSuccess}</p> : null}

              <div className="password-actions">
                <button type="button" className="secondary-button" onClick={closeModal}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving ? 'Saving...' : modalMode === 'create' ? 'Create user' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
