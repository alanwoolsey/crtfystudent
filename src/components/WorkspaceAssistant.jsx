import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, CheckCircle2, Maximize2, MessageCircle, Minimize2, Paperclip, Send, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext'

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

const quickPrompts = [
  'What needs attention today?',
  'Summarize this workspace.',
  'What records are ready for review?',
]

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result || '')
      resolve(value.includes(',') ? value.split(',').pop() : value)
    }
    reader.onerror = () => reject(new Error('Unable to read attachment.'))
    reader.readAsDataURL(file)
  })
}

async function parseChatResponse(response) {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { response: text }
  }
}

function getChatErrorMessage(response, payload) {
  if (response.status === 401 || response.status === 403) {
    return 'The governed assistant rejected this request. Your Cognito access token may be missing, expired, or not trusted by the TrustedUse backend.'
  }

  return payload?.message || payload?.detail || payload?.error || `Workspace Assistant request failed: ${response.status}`
}

function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      components={{
        a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default function WorkspaceAssistant({ currentUser }) {
  const { session } = useAuth()
  const location = useLocation()
  const inputRef = useRef(null)
  const assistantRef = useRef(null)
  const fileInputRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Start a conversation to save your workspace history.',
      createdAt: new Date().toISOString(),
      policyStatus: 'allowed',
    },
  ])

  const assistantSubtitle = useMemo(() => {
    const name = currentUser?.displayName || currentUser?.email
    return name ? `Role-aware guidance for ${name}` : 'Uses authorized sources and available workflow rules.'
  }, [currentUser])

  useEffect(() => {
    if (!isOpen) return undefined

    function handleOutsideClick(event) {
      if (!assistantRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  function openAssistant() {
    setIsOpen(true)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function submitMessage(messageText = draft) {
    const content = messageText.trim()
    if (!content || isSending) return

    if (!apiBaseUrl) {
      setError('VITE_API_URL is not configured for the workspace assistant.')
      return
    }

    if (!session?.access_token || !session?.tenant_id) {
      setError('Sign in is required before using the governed assistant.')
      return
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      attachment: attachment ? {
        fileName: attachment.name,
        contentType: attachment.type || 'application/octet-stream',
        sizeBytes: attachment.size,
      } : null,
    }

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setError('')
    setIsSending(true)

    try {
      const attachments = attachment ? [{
        fileName: attachment.name,
        contentType: attachment.type || 'application/octet-stream',
        sizeBytes: attachment.size,
        dataBase64: await readFileAsBase64(attachment),
      }] : undefined

      const activeEntity = getActiveEntity(location.pathname)
      const response = await fetch(`${apiBaseUrl}/api/v1/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-Tenant-Id': session.tenant_id,
        },
        body: JSON.stringify({
          message: content,
          route: `${location.pathname}${location.search || ''}`,
          activeEntity,
          uiState: {
            pathname: location.pathname,
            search: location.search || '',
          },
          conversationSummary: summarizeConversation(messages),
          ...(attachments ? { attachments } : {}),
        }),
      })
      const payload = await parseChatResponse(response)

      if (!response.ok) {
        throw new Error(getChatErrorMessage(response, payload))
      }

      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: payload?.response || 'The governed assistant returned an empty response.',
        createdAt: new Date().toISOString(),
        policyStatus: payload?.policyStatus || 'allowed',
        model: payload?.model || '',
        citations: Array.isArray(payload?.citations) ? payload.citations : [],
        guardrails: Array.isArray(payload?.guardrails) ? payload.guardrails : [],
        auditId: payload?.auditId || '',
        latencyMs: payload?.latencyMs ?? null,
        inputTokens: payload?.inputTokens ?? null,
        outputTokens: payload?.outputTokens ?? null,
        requiredApproval: Boolean(payload?.requiredApproval),
      }])
      setAttachment(null)
    } catch (nextError) {
      const message = nextError.message || 'Workspace Assistant request failed.'
      setError(message)
      setMessages((current) => [...current, {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: message,
        createdAt: new Date().toISOString(),
        policyStatus: 'blocked',
        guardrails: ['request_error'],
        citations: [],
        auditId: '',
        requiredApproval: false,
      }])
    } finally {
      setIsSending(false)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitMessage()
    }
  }

  function handleAttachmentChange(event) {
    const file = event.target.files?.[0]
    setAttachment(file || null)
    event.target.value = ''
  }

  return (
    <div ref={assistantRef} className={`workspace-assistant ${isOpen ? 'open' : ''} ${isExpanded ? 'expanded' : ''}`}>
      {isOpen ? (
        <section className="assistant-panel" aria-label="Workspace Assistant">
          <div className="assistant-header">
            <div>
              <div className="assistant-title-row">
                <h3>Workspace Assistant</h3>
                <span className="assistant-governed"><CheckCircle2 size={14} /> Governed</span>
              </div>
              <p>{assistantSubtitle}</p>
            </div>
            <div className="assistant-header-actions">
              <button type="button" className="icon-button assistant-icon-button" onClick={() => setIsExpanded((current) => !current)} aria-label={isExpanded ? 'Collapse assistant' : 'Expand assistant'}>
                {isExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              <button type="button" className="icon-button assistant-icon-button" onClick={() => setIsOpen(false)} aria-label="Close assistant">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="assistant-messages" role="log" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`assistant-message ${message.role}`}>
                {message.role === 'assistant' ? <Bot size={16} /> : null}
                <div className={`assistant-message-body ${message.policyStatus === 'blocked' ? 'blocked' : message.requiredApproval || message.policyStatus === 'needs_approval' ? 'approval' : ''}`}>
                  <MarkdownMessage content={message.content} />
                  {message.attachment ? <span className="assistant-message-meta">Attached {message.attachment.fileName}</span> : null}
                  {message.policyStatus === 'blocked' ? <span className="assistant-message-meta">Blocked by governance</span> : null}
                  {message.requiredApproval || message.policyStatus === 'needs_approval' ? <span className="assistant-message-meta">Approval review required</span> : null}
                  {message.auditId ? <span className="assistant-message-meta">Audit ID: {message.auditId}</span> : null}
                  {message.guardrails?.length ? <span className="assistant-message-meta">Guardrails: {message.guardrails.join(', ')}</span> : null}
                  {message.citations?.length ? <span className="assistant-message-meta">Citations: {message.citations.join(', ')}</span> : null}
                </div>
              </div>
            ))}
            {isSending ? (
              <div className="assistant-message assistant">
                <Bot size={16} />
                <div className="assistant-message-body">
                  <MarkdownMessage content="Contacting governed assistant..." />
                </div>
              </div>
            ) : null}
          </div>

          <div className="assistant-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => submitMessage(prompt)} disabled={isSending}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="assistant-composer" onSubmit={(event) => {
            event.preventDefault()
            submitMessage()
          }}>
            {error ? <p className="assistant-error">{error}</p> : null}
            {attachment ? (
              <div className="assistant-attachment-chip">
                <span>{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment">
                  <X size={14} />
                </button>
              </div>
            ) : null}
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a role-aware business question..."
              rows={3}
              disabled={isSending}
            />
            <input ref={fileInputRef} type="file" className="file-input-hidden" onChange={handleAttachmentChange} />
            <button type="button" className="assistant-attach-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach file" disabled={isSending}>
              <Paperclip size={18} />
            </button>
            <button type="submit" className="assistant-send-button" disabled={!draft.trim() || isSending}>
              <Send size={18} />
              <span>{isSending ? 'Sending' : 'Send'}</span>
            </button>
          </form>
        </section>
      ) : null}

      <button type="button" className="assistant-bubble" onClick={openAssistant} aria-label="Open workspace assistant" aria-expanded={isOpen}>
        <MessageCircle size={24} />
      </button>
    </div>
  )
}

function getActiveEntity(pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean)
  if (parts[0] === 'students' && parts[1]) return { type: 'student', id: parts[1] }
  return null
}

function summarizeConversation(messages) {
  const recent = messages
    .filter((message) => message.id !== 'welcome')
    .slice(-4)
    .map((message) => `${message.role}: ${String(message.content || '').slice(0, 180)}`)
  return recent.join('\n')
}
