import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranscriptionEvent } from '../types';

export const useTranscriptionStream = (callSid?: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [events, setEvents] = useState<TranscriptionEvent[]>([]);

  const reset = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (!callSid) {
      wsRef.current?.close();
      wsRef.current = null;
      reset();
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/transcriptions?callSid=${callSid}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reset();
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as TranscriptionEvent;
        setEvents((prev) => {
          const next = [...prev];
          const existingIndex = next.findIndex((item) => item.chunkId === payload.chunkId);
          if (existingIndex >= 0) {
            next[existingIndex] = payload;
            return next;
          }
          return [...prev, payload];
        });
      } catch (error) {
        console.error('Malformed transcription event', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Transcription socket error', error);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [callSid, reset]);

  return {
    events,
    reset
  };
};
