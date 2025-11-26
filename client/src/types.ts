export type CallPhase = 'idle' | 'ready' | 'dialing' | 'in-call' | 'recording' | 'ended' | 'error';

export interface CallSummary {
  callSid: string;
  dialedNumber: string;
  startedAt: string;
  endedAt?: string;
  duration?: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  recordingSid?: string;
  status?: string;
  statusUpdatedAt?: string;
  amdEnabled?: boolean;
  amdStatus?: string;
  amdResult?: string;
  amdConfidence?: string;
  amdDuration?: string;
  amdTimestamp?: string;
}

export interface TranscriptionEvent {
  chunkId: string;
  timestamp: number;
  text: string;
  isFinal: boolean;
  track?: string; // 'inbound_track' (Customer) or 'outbound_track' (Agent)
}
