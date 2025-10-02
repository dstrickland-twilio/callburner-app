# CallBurner AI Assistant Instructions

This guide helps AI coding assistants understand CallBurner's architecture and development patterns.

## Project Architecture

CallBurner is a web-based Twilio dialer with three main components:

1. **React Client** (`client/`)
   - TypeScript + Vite
   - Uses Twilio Voice SDK for call handling
   - Key state management in `useTwilioDevice` hook
   - WebSocket connection for real-time transcription

2. **Express Server** (`server/`)
   - Handles Twilio token generation, call control, and WebSocket hub
   - In-memory call store (see `callStore` Map in `server/src/index.js`)
   - Real-time transcription WebSocket broadcasts

3. **Twilio Functions** (`twilio/`)
   - Optional serverless deployment for token/voice endpoints
   - Reduces need for public URLs during local development

## Key Patterns

### Call Lifecycle

1. Token negotiation via `POST /api/token`
2. Device registration in `useTwilioDevice` hook
3. Call initiation triggers `POST /voice` for TwiML
4. Real-time events flow through WebSocket (`/ws/transcriptions?callSid=...`)
5. Call status updates via `/api/calls/status` webhook
6. Recording controls through REST endpoints

### State Management

- Call phases tracked in `CallPhase` type: 'idle' | 'ready' | 'dialing' | 'in-call' | 'recording' | 'ended' | 'error'
- Active calls and recordings stored in server memory Maps
- WebSocket channels managed per call SID

### Environment Configuration

Required in `server/.env`:
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TWILIO_API_KEY`, `TWILIO_API_SECRET`
- `TWILIO_TWIML_APP_SID`, `TWILIO_CALLER_ID`
- `PUBLIC_BASE_URL` for webhook callbacks

### Development Workflow

1. Run `npm install` at root (installs all workspaces)
2. Start with `npm run dev` for concurrent API + Vite
3. Use ngrok for local Twilio webhook testing
4. Set `SIMULATE_TRANSCRIPTION=true` for testing without Twilio

## Common Tasks

### Adding New Call Features
1. Update call phases in `client/src/types.ts`
2. Extend `useTwilioDevice` hook for device interaction
3. Add API endpoints in `server/src/index.js`
4. Update TwiML response in `/voice` endpoint

### Real-time Feature Integration
1. Add WebSocket event handling in server
2. Subscribe in React components via `useTranscriptionStream`
3. Update relevant types in `types.ts`

### UI Components
- Follow glassmorphic styling pattern in `styles.css`
- Component structure matches call lifecycle phases
- Use existing hooks for Twilio/WebSocket integration

## Key Files

- `client/src/hooks/useTwilioDevice.ts` - Core call control logic
- `server/src/index.js` - All server endpoints and WebSocket handling
- `client/src/types.ts` - Shared TypeScript interfaces
- `twilio/functions/voice.js` - TwiML generation for calls

## Integration Points

- Twilio Voice SDK integration in `useTwilioDevice`
- WebSocket transcription streaming
- Twilio webhooks for call status and recordings
- Optional Twilio Functions deployment