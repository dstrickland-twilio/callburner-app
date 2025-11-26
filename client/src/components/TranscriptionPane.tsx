import { useEffect, useRef } from 'react';
import type { TranscriptionEvent } from '../types';

interface TranscriptionPaneProps {
  events: TranscriptionEvent[];
  isStreaming: boolean;
  amdStatus?: string | null;
}

export const TranscriptionPane = ({ events, isStreaming, amdStatus }: TranscriptionPaneProps) => {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="transcription-pane">
      <div className="transcription-header">
        <h2>Live Transcription</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {amdStatus && amdStatus !== 'Detecting' && (
            <span className={`amd-badge ${amdStatus.toLowerCase()}`}>
              {amdStatus === 'Voicemail' ? '📧 Voicemail' :
               amdStatus === 'Human' ? '👤 Human' :
               amdStatus === 'Fax' ? '📠 Fax' :
               amdStatus === 'Machine' ? '🤖 Machine' : amdStatus}
            </span>
          )}
          <span className={isStreaming ? 'status live' : 'status idle'}>{isStreaming ? 'Live' : 'Waiting'}</span>
        </div>
      </div>
      <div ref={bodyRef} className="transcription-body">
        {events.length === 0 && <p className="placeholder">No transcript chunks yet.</p>}
        {events.map((event) => {
          const speaker = event.track === 'inbound_track' ? 'Agent' : event.track === 'outbound_track' ? 'Customer' : 'Unknown';
          return (
            <div key={event.chunkId} className={event.isFinal ? 'chunk final' : 'chunk partial'}>
              <div className="chunk-content">
                <span className="speaker-label">{speaker}:</span>
                <span>{event.text}</span>
              </div>
              <time>{new Date(event.timestamp).toLocaleTimeString()}</time>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TranscriptionPane;
