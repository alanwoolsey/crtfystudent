const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const importsBaseUrl = `${apiBaseUrl}/api/v1/utilities/imports`

async function parsePayload(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

async function request(fetchWithTenantAuth, path, options = {}) {
  const response = await fetchWithTenantAuth(`${importsBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const payload = await parsePayload(response)
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || 'Utility import request failed.')
  }
  return payload
}

export function listUtilityImportJobs(fetchWithTenantAuth) {
  return request(fetchWithTenantAuth, '/jobs')
}

export function createUtilityImportJob(fetchWithTenantAuth, payload) {
  return request(fetchWithTenantAuth, '/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUtilityImportJob(fetchWithTenantAuth, jobId, payload) {
  return request(fetchWithTenantAuth, `/jobs/${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function listUtilityImportTemplates(fetchWithTenantAuth) {
  return request(fetchWithTenantAuth, '/templates')
}

export function saveUtilityImportTemplate(fetchWithTenantAuth, payload) {
  return request(fetchWithTenantAuth, '/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
