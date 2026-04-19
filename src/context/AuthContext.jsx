import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const loginUrl = `${apiBaseUrl}/api/auth/login`
const completeNewPasswordUrl = `${apiBaseUrl}/api/auth/complete-new-password`
const changePasswordUrl = `${apiBaseUrl}/api/auth/change-password`
const storageKey = 'crtfy-student-auth'
const authRetryDelayMs = 500

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function readStoredAuth() {
  if (typeof window === 'undefined') return { session: null, pendingChallenge: null }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return { session: null, pendingChallenge: null }
    const parsed = JSON.parse(raw)
    return {
      session: parsed.session || null,
      pendingChallenge: parsed.pendingChallenge || null,
    }
  } catch {
    return { session: null, pendingChallenge: null }
  }
}

function persistAuthState(session, pendingChallenge) {
  if (typeof window === 'undefined') return

  const payload = JSON.stringify({ session, pendingChallenge })
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

  const applyAuthState = useCallback((nextSession, nextChallenge) => {
    setSession(nextSession)
    setPendingChallenge(nextChallenge)
    persistAuthState(nextSession, nextChallenge)
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
      applyAuthState(null, challenge)
      return { challengeRequired: true, challenge }
    }

    const nextSession = normalizeSession(payload, username)
    applyAuthState(nextSession, null)
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
    applyAuthState(nextSession, null)
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
    applyAuthState(null, null)
  }, [applyAuthState])

  const value = useMemo(() => ({
    session,
    pendingChallenge,
    isAuthenticated: Boolean(session?.access_token),
    login,
    completeNewPassword,
    changePassword,
    buildTenantAuthHeaders,
    fetchWithTenantAuth,
    logout,
  }), [changePassword, completeNewPassword, fetchWithTenantAuth, login, logout, pendingChallenge, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
