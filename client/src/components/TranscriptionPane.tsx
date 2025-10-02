import type { TranscriptionEvent } from '../types';

interface TranscriptionPaneProps {
  events: TranscriptionEvent[];
  isStreaming: boolean;
}

export const TranscriptionPane = ({ events, isStreaming }: TranscriptionPaneProps) => {
  return (
    <div className="transcription-pane">
      <div className="transcription-header">
        <h2>Live Transcription</h2>
        <span className={isStreaming ? 'status live' : 'status idle'}>{isStreaming ? 'Live' : 'Waiting'}</span>
      </div>
      <div className="transcription-body">
        {events.length === 0 && <p className="placeholder">No transcript chunks yet.</p>}
        {events.map((event) => (
          <div key={event.chunkId} className={event.isFinal ? 'chunk final' : 'chunk partial'}>
            <span>{event.text}</span>
            <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptionPane;
