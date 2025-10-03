/**
 * CallBurner Server
 * Twilio-powered web dialer with real-time transcription
 *
 * Note: Logging migration in progress. Some console.log statements remain
 * and can be incrementally replaced with logger.* calls.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import Twilio from 'twilio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isLocalhost, shouldSimulateTranscription } from './utils/env.js';
import logger from './utils/logger.js';
import { errorHandler, AppError, asyncHandler } from './middleware/errorHandler.js';

const {
  PORT = 4000,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_TWIML_APP_SID,
  TWILIO_CALLER_ID,
  PUBLIC_BASE_URL,
  SIMULATE_TRANSCRIPTION
} = process.env;

const simulationEnabled = typeof SIMULATE_TRANSCRIPTION === 'string'
  ? SIMULATE_TRANSCRIPTION.toLowerCase() === 'true'
  : Boolean(SIMULATE_TRANSCRIPTION);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const hasClientBundle = fs.existsSync(path.join(clientDistPath, 'index.html'));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: '/ws/transcriptions' });

const transcriptionChannels = new Map();
const callStore = new Map();
const activeRecordings = new Map();
const transcriptionSimulators = new Map();

const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;
const { AccessToken } = Twilio.jwt;
const { VoiceGrant } = AccessToken;

const toString = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return toString(value[0]);
  }
  return String(value);
};

const parseJson = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const mapTwilioRealtimeEvent = (body) => {
  const normalized = typeof body === 'object' && body !== null ? body : {};

  const eventType = toString(normalized.EventType ?? normalized.eventType);

  const transcriptionPayload = parseJson(normalized.Transcription ?? normalized.transcription);
  const segmentPayload = parseJson(
    normalized.segment ?? normalized.Segment ?? transcriptionPayload?.segment
  );

  const callSid = toString(
    normalized.CallSid ?? normalized.callSid ?? transcriptionPayload?.callSid ?? segmentPayload?.callSid
  );

  const text = toString(
    segmentPayload?.text ??
      segmentPayload?.transcript ??
      segmentPayload?.alternatives?.[0]?.transcript ??
      normalized.TranscriptionText ??
      normalized.transcriptionText ??
      normalized.Text ??
      normalized.text
  );

  if (!callSid || !text) {
    return null;
  }

  const chunkId = toString(
    segmentPayload?.sid ??
      normalized.SegmentSid ??
      normalized.segmentSid ??
      normalized.TranscriptionSid ??
      normalized.transcriptionSid ??
      `twilio-${Date.now()}`
  );

  const status = toString(segmentPayload?.status ?? normalized.SegmentStatus ?? normalized.status);
  const isFinal = Boolean(
    segmentPayload?.isFinal ??
      normalized.IsFinal ??
      normalized.isFinal ??
      (status ? ['final', 'completed', 'complete', 'done'].includes(status.toLowerCase()) : false) ??
      (eventType ? eventType.toLowerCase().includes('completed') : false)
  );

  const timestampRaw = toString(
    segmentPayload?.endTime ??
      segmentPayload?.timestamp ??
      normalized.Timestamp ??
      normalized.timestamp
  );
  const parsedTimestamp = timestampRaw ? new Date(timestampRaw).getTime() : NaN;
  const timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now();

  const participant = toString(
    segmentPayload?.participant ??
      segmentPayload?.speaker ??
      normalized.Participant ??
      normalized.participant
  );

  return {
    callSid,
    payload: {
      chunkId,
      text,
      isFinal,
      timestamp,
      ...(participant ? { participant } : {}),
      source: 'twilio'
    }
  };
};

const ensureTwilioConfigured = (res) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) {
    res.status(500).json({ error: 'Missing Twilio configuration in environment variables.' });
    return false;
  }
  return true;
};

wss.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '', `http://${request.headers.host}`);
  const callSid = url.searchParams.get('callSid');

  logger.debug({ url: request.url, callSid }, 'WebSocket connection attempt');

  if (!callSid) {
    logger.warn('Rejecting WebSocket connection: missing callSid');
    socket.close(4001, 'callSid is required');
    return;
  }

  if (!transcriptionChannels.has(callSid)) {
    logger.info({ callSid }, 'Creating new transcription channel');
    transcriptionChannels.set(callSid, new Set());
  }

  transcriptionChannels.get(callSid).add(socket);
  const listenerCount = transcriptionChannels.get(callSid).size;
  logger.info({ callSid, listenerCount }, 'WebSocket connected');

  // Start simulation immediately when WebSocket connects if enabled OR if localhost
  if (shouldSimulateTranscription(simulationEnabled, PUBLIC_BASE_URL)) {
    logger.info({
      callSid,
      localhost: isLocalhost(PUBLIC_BASE_URL),
      explicit: simulationEnabled
    }, 'Starting transcription simulation');
    startSimulation(callSid);
  }

  socket.on('close', () => {
    const listeners = transcriptionChannels.get(callSid);
    listeners?.delete(socket);
    if (listeners && listeners.size === 0) {
      transcriptionChannels.delete(callSid);
    }
  });
});

const broadcastTranscription = (callSid, payload) => {
  const listeners = transcriptionChannels.get(callSid);
  if (!listeners) {
    console.log(`No listeners found for call ${callSid}`);
    return;
  }
  
  console.log(`Broadcasting transcription to ${listeners.size} listeners for call ${callSid}:`, payload);
  const message = JSON.stringify(payload);
  
  let activeSockets = 0;
  listeners.forEach((socket) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
      activeSockets++;
    }
  });
  
  console.log(`Successfully sent to ${activeSockets} active sockets`);
};

const startSimulation = (callSid) => {
  const shouldSimulate = shouldSimulateTranscription(simulationEnabled, PUBLIC_BASE_URL);

  console.log('Simulation request for call:', callSid, 'Simulation enabled:', simulationEnabled, 'Localhost:', isLocalhost(PUBLIC_BASE_URL), 'Should simulate:', shouldSimulate);

  if (!shouldSimulate) {
    console.log('Simulation disabled, skipping');
    return;
  }

  if (transcriptionSimulators.has(callSid)) {
    console.log('Simulation already running for call:', callSid);
    return;
  }

  const phrases = [
    'Connecting you to the party now.',
    'Please hold while I check that.',
    'Absolutely, I can help with that today.',
    'Let me pull up the account details.',
    'Is there anything else I can assist you with?',
    'Thanks for choosing CallBurner.'
  ];

  console.log('Starting transcription simulation for call:', callSid);
  let counter = 0;
  const interval = setInterval(() => {
    counter += 1;
    const text = phrases[counter % phrases.length];
    const isFinal = counter % 2 === 0;
    
    console.log(`Simulating transcription [${counter}/12]:`, { callSid, text, isFinal });
    broadcastTranscription(callSid, {
      chunkId: `sim-${counter}`,
      timestamp: Date.now(),
      text,
      isFinal
    });
    
    if (counter >= 12) {
      console.log('Simulation completed for call:', callSid);
      clearInterval(interval);
      transcriptionSimulators.delete(callSid);
    }
  }, 2500);

  transcriptionSimulators.set(callSid, interval);
};

app.post('/api/token', (req, res) => {
  console.log('Token request received:', {
    accountSid: TWILIO_ACCOUNT_SID?.substring(0, 8) + '...',
    apiKey: TWILIO_API_KEY?.substring(0, 8) + '...',
    twimlAppSid: TWILIO_TWIML_APP_SID?.substring(0, 8) + '...',
    identity: req.body.identity
  });

  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) {
    const missing = [];
    if (!TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
    if (!TWILIO_API_KEY) missing.push('TWILIO_API_KEY');
    if (!TWILIO_API_SECRET) missing.push('TWILIO_API_SECRET');
    if (!TWILIO_TWIML_APP_SID) missing.push('TWILIO_TWIML_APP_SID');
    
    console.error('Missing required Twilio credentials:', missing);
    res.status(500).json({ 
      error: 'Missing Twilio configuration',
      details: `Missing: ${missing.join(', ')}`
    });
    return;
  }

  try {
    const identity = req.body.identity ?? 'unknown-operator';

    const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, {
      identity,
      ttl: 3600 // Token valid for 1 hour
    });

    const grant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_TWIML_APP_SID,
      incomingAllow: true,
      endpointId: `${identity}_${Date.now()}`, // Unique endpoint identifier with timestamp
      forwardedFrom: TWILIO_CALLER_ID, // Add caller ID to the grant
      params: {
        // Additional parameters for Voice SDK
        allowIncomingWhileBusy: true,
        maxConnectionsPerEndpoint: 1,
        region: 'gll' // Global region
      }
    });

    token.addGrant(grant);
    
    const jwt = token.toJwt();
    console.log('Token generated successfully for:', identity);
    
    res.json({ token: jwt });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ 
      error: 'Token generation failed',
      details: error.message
    });
  }
});

app.post('/api/calls', (req, res) => {
  const { callSid, to, startedAt } = req.body;
  if (!callSid || !to) {
    res.status(400).json({ error: 'callSid and to are required' });
    return;
  }

  const summary = {
    callSid,
    dialedNumber: to,
    startedAt,
    status: 'in-progress'
  };

  callStore.set(callSid, summary);

  // Auto-start simulation for localhost development
  if (shouldSimulateTranscription(simulationEnabled, PUBLIC_BASE_URL)) {
    console.log(`Auto-starting simulation for call ${callSid} (localhost: ${isLocalhost(PUBLIC_BASE_URL)})`);
    startSimulation(callSid);
  }

  res.status(204).send();
});

app.get('/api/calls', (_req, res) => {
  const summaries = Array.from(callStore.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 15);
  res.json(summaries);
});

app.get('/api/calls/:sid/summary', (req, res) => {
  const summary = callStore.get(req.params.sid);
  if (!summary) {
    res.status(404).json({ error: 'Unknown call SID' });
    return;
  }
  res.json(summary);
});

app.post('/api/calls/:sid/hangup', async (req, res) => {
  if (!twilioClient) {
    res.status(400).json({ error: 'Twilio client is not configured' });
    return;
  }

  try {
    await twilioClient.calls(req.params.sid).update({ status: 'completed' });
    res.status(204).send();
  } catch (error) {
    console.error('Unable to hang up call', error);
    res.status(500).json({ error: 'Unable to hang up call', details: error.message });
  }
});

app.post('/api/calls/:sid/recording/start', async (req, res) => {
  if (!twilioClient) {
    logger.error('Recording start failed: Twilio client not configured');
    res.status(400).json({ error: 'Twilio client is not configured' });
    return;
  }

  const callSid = req.params.sid;
  logger.info({ callSid }, 'Starting recording for call');

  try {
    // First check if there's already an in-progress recording
    const recordings = await twilioClient.recordings.list({
      callSid: callSid,
      status: 'in-progress'
    });

    if (recordings.length > 0) {
      const recording = recordings[0];
      logger.info({ callSid, recordingSid: recording.sid }, 'Found existing recording');
      activeRecordings.set(callSid, recording.sid);
      res.status(204).send();
      return;
    }

    // If no existing recording, create a new one
    const recording = await twilioClient.calls(callSid).recordings.create({
      recordingStatusCallback: PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/api/calls/status` : undefined,
      recordingStatusCallbackEvent: ['in-progress', 'completed']
    });

    logger.info({ callSid, recordingSid: recording.sid }, 'Recording started successfully');
    activeRecordings.set(callSid, recording.sid);

    // Note: Real-time transcription is started via TwiML in the /voice endpoint
    // This ensures transcription begins immediately when the call connects

    res.status(204).send();
  } catch (error) {
    logger.error({ callSid, error: error.message }, 'Unable to start recording');
    res.status(500).json({ error: 'Unable to start recording', details: error.message });
  }
});

app.post('/api/calls/:sid/recording/stop', async (req, res) => {
  if (!twilioClient) {
    console.error('Recording stop failed: Twilio client not configured');
    res.status(400).json({ error: 'Twilio client is not configured' });
    return;
  }

  const callSid = req.params.sid;
  console.log(`Attempting to stop recording. Call SID: ${callSid}`);

  try {
    // First check if we have a known recording SID for this call
    const knownRecordingSid = activeRecordings.get(callSid);
    if (knownRecordingSid) {
      console.log(`Found known recording ${knownRecordingSid} for call ${callSid}`);
      try {
        await twilioClient.recordings(knownRecordingSid).update({ status: 'stopped' });
        console.log(`Successfully stopped known recording ${knownRecordingSid}`);
        activeRecordings.delete(callSid);
        res.status(204).send();
        return;
      } catch (error) {
        console.warn(`Failed to stop known recording ${knownRecordingSid}:`, error.message);
        // Continue to try finding other recordings
      }
    }

    // If no known recording or stopping it failed, look for all in-progress recordings
    const recordings = await twilioClient.recordings.list({
      callSid: callSid,
      status: 'in-progress'
    });

    console.log(`Found ${recordings.length} active recordings for call ${callSid}`);

    if (recordings.length === 0) {
      console.error(`No active recordings found for call ${callSid}`);
      res.status(400).json({ error: 'No active recording for call' });
      return;
    }

    // Stop all in-progress recordings using the correct client method
    for (const recording of recordings) {
      console.log(`Stopping recording ${recording.sid}`);
      await twilioClient.calls(callSid)
        .recordings(recording.sid)
        .update({ status: 'stopped' });
    }

    console.log(`Successfully stopped all recordings for call ${callSid}`);
    activeRecordings.delete(callSid);
    res.status(204).send();
  } catch (error) {
    console.error(`Error stopping recordings for call ${callSid}:`, error);
    res.status(500).json({ error: 'Unable to stop recording', details: error.message });
  }
});

app.post('/api/transcriptions', (req, res) => {
  const { callSid, chunkId, text, isFinal, timestamp } = req.body;
  if (!callSid || !chunkId || typeof text !== 'string') {
    res.status(400).json({ error: 'callSid, chunkId, and text are required' });
    return;
  }

  broadcastTranscription(callSid, {
    chunkId,
    text,
    isFinal: Boolean(isFinal),
    timestamp: timestamp ? Number(timestamp) : Date.now()
  });

  res.status(204).send();
});

app.post('/api/transcriptions/realtime', (req, res) => {
  logger.debug({ body: req.body }, 'Received real-time transcription webhook');

  // Use the mapper to normalize different Twilio transcription formats
  const mapped = mapTwilioRealtimeEvent(req.body);

  if (!mapped) {
    logger.warn('Ignoring invalid transcription event');
    res.status(202).send('ignored');
    return;
  }

  logger.info({ callSid: mapped.callSid, text: mapped.payload.text }, 'Broadcasting transcription');
  broadcastTranscription(mapped.callSid, mapped.payload);
  res.status(204).send();
});

// Handle post-call recording transcriptions
app.post('/api/transcriptions/recording', (req, res) => {
  logger.info({ body: req.body }, 'Received recording transcription');

  const { RecordingSid, TranscriptionSid, TranscriptionText, CallSid } = req.body;

  if (CallSid && TranscriptionText) {
    // Broadcast the full transcription as a final event
    broadcastTranscription(CallSid, {
      chunkId: TranscriptionSid || `transcription-${Date.now()}`,
      text: TranscriptionText,
      isFinal: true,
      timestamp: Date.now(),
      source: 'recording'
    });

    logger.info({ callSid: CallSid, recordingSid: RecordingSid }, 'Recording transcription broadcasted');
  }

  res.status(200).send('OK');
});

app.post('/api/calls/status', (req, res) => {
  const { CallSid, CallStatus, RecordingUrl, RecordingSid, TranscriptionUrl, Timestamp, RecordingStatus } = req.body;
  
  console.log('Received call status update:', {
    CallSid,
    CallStatus,
    RecordingStatus,
    RecordingSid
  });

  if (!CallSid) {
    res.status(400).send('Missing CallSid');
    return;
  }

  const summary = callStore.get(CallSid) ?? { callSid: CallSid };
  summary.status = CallStatus;
  
  // Only set endedAt if the call is actually ending
  if (CallStatus === 'completed') {
    summary.endedAt = new Date().toISOString();
  }

  if (RecordingUrl) {
    summary.recordingUrl = RecordingUrl;
  }

  if (TranscriptionUrl) {
    summary.transcriptUrl = TranscriptionUrl;
  }

  // Store recording SID in both the call summary and active recordings map
  if (RecordingSid) {
    summary.recordingSid = RecordingSid;
    if (RecordingStatus === 'in-progress') {
      console.log(`Storing active recording ${RecordingSid} for call ${CallSid}`);
      activeRecordings.set(CallSid, RecordingSid);
    } else if (RecordingStatus === 'completed') {
      console.log(`Removing completed recording ${RecordingSid} for call ${CallSid}`);
      activeRecordings.delete(CallSid);
    }
  }

  if (Timestamp) {
    summary.statusUpdatedAt = Timestamp;
  }

  callStore.set(CallSid, summary);
  res.status(200).send('ok');
});

app.post('/voice', (req, res) => {
  if (!ensureTwilioConfigured(res)) {
    return;
  }

  console.log('Voice webhook received:', req.body);
  const { To, record, CallSid } = req.body;

  // Build dial options
  const dialOptions = {
    answerOnBridge: true
  };

  if (TWILIO_CALLER_ID) {
    dialOptions.callerId = TWILIO_CALLER_ID;
  }

  if (record === 'true') {
    dialOptions.record = 'record-from-answer';
    dialOptions.recordingStatusCallbackMethod = 'POST';
    dialOptions.trim = 'trim-silence';
    // Enable transcription on recordings (post-call)
    dialOptions.transcribe = true;
    dialOptions.transcribeCallback = `${PUBLIC_BASE_URL}/api/transcriptions/recording`;
  }

  if (PUBLIC_BASE_URL) {
    // Recording status callbacks (applies to both auto and manual recording)
    dialOptions.recordingStatusCallback = `${PUBLIC_BASE_URL}/api/calls/status`;
    dialOptions.recordingStatusCallbackEvent = ['in-progress', 'completed'];

    // Call status callbacks
    dialOptions.statusCallback = `${PUBLIC_BASE_URL}/api/calls/status`;
    dialOptions.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'];

    // Action URL to continue call flow after dial completes
    dialOptions.action = `${PUBLIC_BASE_URL}/voice/continue?callSid=${CallSid}`;
    dialOptions.method = 'POST';
  }

  // Build TwiML manually to include transcription (helper library doesn't support it properly)
  let twimlStr = '<?xml version="1.0" encoding="UTF-8"?><Response>';

  // Add transcription start if PUBLIC_BASE_URL is available
  if (PUBLIC_BASE_URL) {
    twimlStr += `<Start><Transcription name="Transcription for ${CallSid}" track="both_tracks" statusCallbackUrl="${PUBLIC_BASE_URL}/api/transcriptions/realtime" statusCallbackMethod="POST" /></Start>`;
  }

  // Build dial options as XML attributes
  let dialAttrs = 'answerOnBridge="true"';
  if (TWILIO_CALLER_ID) {
    dialAttrs += ` callerId="${TWILIO_CALLER_ID}"`;
  }
  if (record === 'true') {
    dialAttrs += ' record="record-from-answer" trim="trim-silence"';
    dialAttrs += ` transcribe="true" transcribeCallback="${PUBLIC_BASE_URL}/api/transcriptions/recording"`;
  }
  if (PUBLIC_BASE_URL) {
    dialAttrs += ` recordingStatusCallback="${PUBLIC_BASE_URL}/api/calls/status"`;
    dialAttrs += ' recordingStatusCallbackEvent="in-progress completed"';
    dialAttrs += ' recordingStatusCallbackMethod="POST"';
    dialAttrs += ` statusCallback="${PUBLIC_BASE_URL}/api/calls/status"`;
    dialAttrs += ' statusCallbackEvent="initiated ringing answered completed"';
    dialAttrs += ` action="${PUBLIC_BASE_URL}/voice/continue?callSid=${CallSid}"`;
    dialAttrs += ' method="POST"';
  }

  twimlStr += `<Dial ${dialAttrs}>`;

  if (To && /^\+?[\d*#]+$/.test(To)) {
    if (!TWILIO_CALLER_ID) {
      twimlStr = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Outbound dialing is not configured properly. Please set TWILIO_CALLER_ID.</Say></Response>';
    } else {
      twimlStr += `<Number>${To}</Number>`;
    }
  } else if (To) {
    twimlStr += `<Client>${To}</Client>`;
  } else {
    twimlStr = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>No destination number provided.</Say></Response>';
  }

  if (To && (TWILIO_CALLER_ID || !/^\+?[\d*#]+$/.test(To))) {
    twimlStr += '</Dial>';
  }
  twimlStr += '</Response>';

  res.type('text/xml');
  res.send(twimlStr);
});

// Continue handler for after dial completes
app.post('/voice/continue', (req, res) => {
  console.log('Voice continue webhook received:', req.body);
  const twiml = new Twilio.twiml.VoiceResponse();

  // Just hangup after the dial completes
  twiml.hangup();

  res.type('text/xml');
  res.send(twiml.toString());
});

if (hasClientBundle) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (req.headers.upgrade === 'websocket') {
      return next();
    }

    if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path === '/voice') {
      return next();
    }

    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  logger.warn('Client build not found – serving API only. Run `npm run build` to ship the frontend.');
}

// Error handling middleware (must be last)
app.use(errorHandler);

httpServer.listen(PORT, () => {
  logger.info({ port: PORT, url: `http://localhost:${PORT}` }, 'CallBurner server started');
  if (simulationEnabled) {
    logger.info('Simulation mode explicitly enabled for transcription events');
  }
  if (isLocalhost(PUBLIC_BASE_URL)) {
    logger.info('Running in localhost mode - transcription simulation auto-enabled');
  }
});
