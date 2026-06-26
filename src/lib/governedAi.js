export const governedAiBaseUrl = (import.meta.env.VITE_CHAT_URL || '').replace(/\/+$/, '')

export const activeGovernedAiProvider = {
  id: 'crtfy_ai',
  name: 'crtfy.ai',
  status: governedAiBaseUrl ? 'Active' : 'Configured in environment',
  direction: 'Governed AI runtime',
  latency: 'Real-time',
  coverage: ['Workspace assistant', 'Catalog lookup', 'Guardrails', 'Audit-aware AI actions'],
}
