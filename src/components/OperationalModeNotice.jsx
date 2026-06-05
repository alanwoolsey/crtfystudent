export default function OperationalModeNotice({
  mode = 'derived',
  error = '',
  liveLabel = 'Live backend data',
  derivedLabel = 'Derived fallback data',
  isLoading = false,
  onRetry,
}) {
  const isLive = mode === 'live'
  const toneClass = isLive ? 'risk-low' : 'neutral-badge'

  return (
    <div className="operational-mode-notice">
      <div className="pill-row compact">
        <span className={`badge ${toneClass}`}>{isLive ? liveLabel : derivedLabel}</span>
        {isLoading ? <span className="tag">Refreshing</span> : null}
      </div>
      {!isLive ? (
        <p>
          {error || 'Backend work endpoints are not returning live data yet. This view is using Student 360 fallback state until Phase 1 APIs are available.'}
        </p>
      ) : null}
      {!isLive && typeof onRetry === 'function' ? (
        <button type="button" className="secondary-button compact-button" onClick={onRetry} disabled={isLoading}>
          {isLoading ? 'Retrying...' : 'Retry live data'}
        </button>
      ) : null}
    </div>
  )
}

