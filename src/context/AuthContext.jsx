import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { canAccess, hasAnyPermission, hasAnyRole, hasSensitivityTier } from '../lib/rbac'

const AuthContext = createContext(null)
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const loginUrl = `${apiBaseUrl}/api/auth/login`
const completeNewPasswordUrl = `${apiBaseUrl}/api/auth/complete-new-password`
const changePasswordUrl = `${apiBaseUrl}/api/auth/change-password`
const currentUserUrl = `${apiBaseUrl}/api/v1/me`
const storageKey = 'crtfy-student-auth'
const storageVersion = 2
const authRetryDelayMs = 500

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function readStoredAuth() {
  if (typeof window === 'undefined') return { session: null, pendingChallenge: null, currentUser: null }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return { session: null, pendingChallenge: null, currentUser: null }
    const parsed = JSON.parse(raw)
    if (parsed.version !== storageVersion) {
      window.localStorage.removeItem(storageKey)
      return { session: null, pendingChallenge: null, currentUser: null }
    }
    return {
      session: parsed.session || null,
      pendingChallenge: parsed.pendingChallenge || null,
      currentUser: parsed.currentUser || null,
    }
  } catch {
    return { session: null, pendingChallenge: null, currentUser: null }
  }
}

function persistAuthState(session, pendingChallenge, currentUser) {
  if (typeof window === 'undefined') return

  const payload = JSON.stringify({ version: storageVersion, session, pendingChallenge, currentUser })
  window.localStorage.setItem(storageKey, payload)
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function getAuthErrorMessage(status, payload) {
  if (status === 404) return 'User not found.'
  if (status === 401) return 'Invalid credentials.'
  return payload?.message || payload?.detail || 'Authentication failed.'
}

function normalizeSession(payload, username) {
  return {
    username,
    tenant_id: payload.tenant_id,
    tenant_name: payload.tenant_name,
    tenant_code: payload.tenant_code,
    access_token: payload.access_token,
    id_token: payload.id_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    token_type: payload.token_type || 'Bearer',
  }
}

function buildTenantAuthHeaders(session) {
  if (!session?.access_token || !session?.tenant_id) return {}

  return {
    Authorization: `Bearer ${session.access_token}`,
    'X-Tenant-Id': session.tenant_id,
  }
}

export function AuthProvider({ children }) {
  const stored = readStoredAuth()
  const [session, setSession] = useState(stored.session)
  const [pendingChallenge, setPendingChallenge] = useState(stored.pendingChallenge)
  const [currentUser, setCurrentUser] = useState(stored.currentUser)
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(Boolean(stored.session))

  const applyAuthState = useCallback((nextSession, nextChallenge, nextCurrentUser = null) => {
    setSession(nextSession)
    setPendingChallenge(nextChallenge)
    setCurrentUser(nextCurrentUser)
    persistAuthState(nextSession, nextChallenge, nextCurrentUser)
  }, [])

  const login = useCallback(async ({ username, password }) => {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const payload = await parseResponse(response)

    if (!response.ok) throw new Error(getAuthErrorMessage(response.status, payload))

    if (payload?.challenge_name === 'NEW_PASSWORD_REQUIRED') {
      const challenge = {
        username,
        session: payload.session,
        tenant_id: payload.tenant_id,
        tenant_name: payload.tenant_name,
        tenant_code: payload.tenant_code,
        challenge_name: payload.challenge_name,
      }
      applyAuthState(null, challenge, null)
      return { challengeRequired: true, challenge }
    }

    const nextSession = normalizeSession(payload, username)
    applyAuthState(nextSession, null, null)
    return { challengeRequired: false, session: nextSession }
  }, [applyAuthState])

  const completeNewPassword = useCallback(async ({ username, newPassword, session: challengeSession }) => {
    const activeChallenge = pendingChallenge && pendingChallenge.username === username ? pendingChallenge : null
    const sessionToken = challengeSession || activeChallenge?.session

    const response = await fetch(completeNewPasswordUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        new_password: newPassword,
        session: sessionToken,
      }),
    })
    const payload = await parseResponse(response)

    if (!response.ok) throw new Error(getAuthErrorMessage(response.status, payload))

    const nextSession = normalizeSession(payload, username)
    applyAuthState(nextSession, null, null)
    return nextSession
  }, [applyAuthState, pendingChallenge])

  const changePassword = useCallback(async ({ previousPassword, proposedPassword }) => {
    if (!session?.access_token) throw new Error('You must be signed in to change your password.')

    const response = await fetch(changePasswordUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildTenantAuthHeaders(session),
      },
      body: JSON.stringify({
        access_token: session.access_token,
        previous_password: previousPassword,
        proposed_password: proposedPassword,
      }),
    })
    const payload = await parseResponse(response)

    if (!response.ok) throw new Error(getAuthErrorMessage(response.status, payload))

    return payload
  }, [session])

  const fetchWithTenantAuth = useCallback(async (url, options = {}, attempt = 0) => {
    if (!session?.access_token || !session?.tenant_id) {
      throw new Error('You must be signed in to make this request.')
    }

    const nextOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...buildTenantAuthHeaders(session),
      },
    }

    const response = await fetch(url, nextOptions)

    if (response.status === 401 && attempt === 0) {
      await sleep(authRetryDelayMs)
      return fetchWithTenantAuth(url, options, attempt + 1)
    }

    return response
  }, [session])

  const logout = useCallback(() => {
    applyAuthState(null, null, null)
  }, [applyAuthState])

  const loadCurrentUser = useCallback(async () => {
    if (!session?.access_token || !session?.tenant_id) {
      setCurrentUser(null)
      setIsBootstrappingAuth(false)
      return null
    }

    setIsBootstrappingAuth(true)

    try {
      const response = await fetch(currentUserUrl, {
        headers: {
          ...buildTenantAuthHeaders(session),
        },
      })
      const payload = await parseResponse(response)

      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || 'Unable to load current user.')
      }

      setCurrentUser(payload)
      persistAuthState(session, pendingChallenge, payload)
      return payload
    } catch (error) {
      console.error('Failed to load current user from /api/v1/me', {
        error: error?.message || error,
        tenantId: session?.tenant_id,
        username: session?.username,
      })
      setCurrentUser(null)
      persistAuthState(session, pendingChallenge, null)
      return null
    } finally {
      setIsBootstrappingAuth(false)
    }
  }, [pendingChallenge, session])

  useEffect(() => {
    if (!session?.access_token || !session?.tenant_id) {
      setCurrentUser(null)
      setIsBootstrappingAuth(false)
      return
    }

    loadCurrentUser()
  }, [loadCurrentUser, session])

  const value = useMemo(() => ({
    session,
    currentUser,
    pendingChallenge,
    isAuthenticated: Boolean(session?.access_token),
    isBootstrappingAuth,
    login,
    completeNewPassword,
    changePassword,
    buildTenantAuthHeaders,
    fetchWithTenantAuth,
    loadCurrentUser,
    canAccess: (access) => canAccess(currentUser, access),
    hasAnyRole: (roles) => hasAnyRole(currentUser, roles),
    hasAnyPermission: (permissions) => hasAnyPermission(currentUser, permissions),
    hasSensitivityTier: (tier) => hasSensitivityTier(currentUser, tier),
    logout,
  }), [changePassword, completeNewPassword, currentUser, fetchWithTenantAuth, isBootstrappingAuth, loadCurrentUser, login, logout, pendingChallenge, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
