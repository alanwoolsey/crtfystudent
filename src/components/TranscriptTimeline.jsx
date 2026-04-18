export default function TranscriptTimeline({ transcripts = [], onTranscriptSelect }) {
  return (
    <div className="timeline-list">
      {transcripts.map((transcript) => (
        <button
          key={transcript.id}
          type="button"
          className="timeline-item"
          onClick={() => onTranscriptSelect?.(transcript)}
        >
          <div className="timeline-rail" />
          <div className="timeline-content">
            <div className="timeline-top">
              <strong>{transcript.institution || transcript.source}</strong>
              <span className="tag">{transcript.status}</span>
            </div>
            <p>{transcript.notes}</p>
            <div className="timeline-meta">
              <span>{new Date(transcript.uploadedAt).toLocaleDateString()}</span>
              <span>{transcript.confidence}% confidence</span>
              <span>{transcript.credits} credits</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
