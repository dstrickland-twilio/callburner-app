import type { CallSummary } from '../types';

interface CallSummaryModalProps {
  open: boolean;
  summary?: CallSummary | null;
  onClose: () => void;
}

export const CallSummaryModal = ({ open, summary, onClose }: CallSummaryModalProps) => {
  if (!open || !summary) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>Call Summary</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close summary">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <dl>
            <div className="row">
              <dt>Call SID</dt>
              <dd>
                <a href={summary.recordingUrl ?? '#'} target="_blank" rel="noreferrer">
                  {summary.callSid}
                </a>
              </dd>
            </div>
            <div className="row">
              <dt>Dialed Number</dt>
              <dd>{summary.dialedNumber}</dd>
            </div>
            <div className="row">
              <dt>Started</dt>
              <dd>{new Date(summary.startedAt).toLocaleString()}</dd>
            </div>
            {summary.endedAt && (
              <div className="row">
                <dt>Ended</dt>
                <dd>{new Date(summary.endedAt).toLocaleString()}</dd>
              </div>
            )}
            {summary.recordingUrl && (
              <div className="row">
                <dt>Recording</dt>
                <dd>
                  <a href={summary.recordingUrl} target="_blank" rel="noreferrer">
                    Open recording
                  </a>
                </dd>
              </div>
            )}
            {summary.transcriptUrl && (
              <div className="row">
                <dt>Transcript</dt>
                <dd>
                  <a href={summary.transcriptUrl} target="_blank" rel="noreferrer">
                    View transcript
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default CallSummaryModal;
