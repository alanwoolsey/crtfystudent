const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result || '')
      resolve(value.includes(',') ? value.split(',').pop() : value)
    }
    reader.onerror = () => reject(new Error('Unable to read document for classification.'))
    reader.readAsDataURL(file)
  })
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

export async function classifyDocumentWithGovernedAi({ file, classificationOptions, session }) {
  if (!file) throw new Error('A file is required for document classification.')
  if (!session?.access_token || !session?.tenant_id) throw new Error('Sign in is required before classifying documents.')
  const dataBase64 = await readFileAsBase64(file)
  const response = await fetch(`${apiBaseUrl}/api/v1/assistant/classify-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'X-Tenant-Id': session.tenant_id,
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size || 0,
      dataBase64,
      classificationOptions,
    }),
  })
  const payload = await parseResponse(response)
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || payload?.error || 'Governed document classification failed.')
  }
  return payload
}
