export default function TranscriptTimeline({ transcripts = [], onTranscriptSelect }) {
  return (
    <div className="timeline-list">
      {transcripts.map((item) => {
        return (
          <article key={item.id} className="timeline-item">
            <div className="timeline-dot" />
            <button
              type="button"
              className="timeline-content timeline-button clickable"
              onClick={() => onTranscriptSelect?.(item)}
            >
              <div className="timeline-head">
                <div>
                  <h4>{item.source}</h4>
                  <p>{item.type} · {new Date(item.uploadedAt).toLocaleDateString()}</p>
                </div>
                <div className="score-pill">{item.status}</div>
              </div>
              <p className="muted-copy">{item.notes}</p>
              <div className="timeline-steps">
                {item.steps?.map((step) => (
                  <span key={`${item.id}-${step.label}`}>{step.label} · {step.time}</span>
                ))}
              </div>
            </button>
          </article>
        )
      })}
    </div>
  )
}
