export type CallPhase = 'idle' | 'ready' | 'dialing' | 'in-call' | 'recording' | 'ended' | 'error';

export interface CallSummary {
  callSid: string;
  dialedNumber: string;
  startedAt: string;
  endedAt?: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  recordingSid?: string;
  status?: string;
  statusUpdatedAt?: string;
}

export interface TranscriptionEvent {
  chunkId: string;
  timestamp: number;
  text: string;
  isFinal: boolean;
}
