# CallBurner Architecture

## 🏗️ Hybrid Deployment Architecture

CallBurner uses a **hybrid architecture** combining Twilio Serverless Functions and Render for optimal functionality.

## System Components

### 1. **Client (React/TypeScript)**
- **Location**: Served from Render at `https://callburner-app.onrender.com`
- **Technology**: React, TypeScript, Vite, Twilio Voice SDK
- **Responsibilities**:
  - User interface (dialpad, call controls)
  - Twilio Voice SDK integration
  - Real-time transcription display via WebSocket
  - Call history management

### 2. **Render Express Server** (Primary)
- **Location**: `https://callburner-app.onrender.com`
- **Technology**: Node.js, Express, WebSocket (ws), Twilio SDK
- **Responsibilities**:
  - **Token Generation**: `/api/token` - Generates Twilio access tokens
  - **TwiML Generation**: `/voice` - Handles call routing and configuration
  - **WebSocket Server**: `/ws/transcriptions` - Real-time transcription streaming
  - **Call Management**: `/api/calls/*` - CRUD operations for call data
  - **Recording Control**: `/api/calls/:sid/recording/*` - Start/stop recordings
  - **Status Webhooks**: `/api/calls/status` - Receives Twilio status updates
  - **Transcription Webhooks**: `/api/transcriptions/realtime` - Receives transcription data
  - **Static File Serving**: Serves the built React client

### 3. **Twilio Serverless Functions** (Backup/Alternative)
- **Location**: `https://callburner-functions-2333-dev.twil.io`
- **Functions**:
  - `/token` - Token generation (protected)
  - `/voice` - TwiML generation (public)
- **Status**: Deployed but **not currently used** (Render handles these)
- **Purpose**: Backup deployment option if Render is unavailable

## 🔄 Request Flow

### Making a Call

```
1. User enters phone number in browser
   ↓
2. Client requests token from Render
   GET https://callburner-app.onrender.com/api/token
   ↓
3. Client initiates call with Twilio Voice SDK
   SDK → Twilio Voice API
   ↓
4. Twilio requests TwiML from Render
   POST https://callburner-app.onrender.com/voice
   ↓
5. Render returns TwiML with dial instructions
   <Response><Dial>...</Dial></Response>
   ↓
6. Call connects to destination number
   ↓
7. Twilio sends status updates to Render
   POST https://callburner-app.onrender.com/api/calls/status
   ↓
8. Client opens WebSocket for transcriptions
   WS wss://callburner-app.onrender.com/ws/transcriptions
   ↓
9. Twilio sends transcription data to Render
   POST https://callburner-app.onrender.com/api/transcriptions/realtime
   ↓
10. Render broadcasts to WebSocket clients
    Real-time transcription appears in browser
```

### Call Recording

```
1. User clicks "Start Recording" button
   ↓
2. Client sends request to Render
   POST /api/calls/:sid/recording/start
   ↓
3. Render uses Twilio SDK to start recording
   twilioClient.calls(sid).recordings.create()
   ↓
4. Twilio sends recording status updates
   POST /api/calls/status
   ↓
5. Render updates call state and notifies client
```

## 🌐 URL Configuration

### Production URLs
- **Client**: `https://callburner-app.onrender.com`
- **API Base**: `https://callburner-app.onrender.com/api`
- **WebSocket**: `wss://callburner-app.onrender.com/ws/transcriptions`

### Local Development URLs
- **Client**: `http://localhost:5173` (Vite dev server)
- **API**: `http://localhost:4000/api` (proxied by Vite)
- **WebSocket**: `ws://localhost:4000/ws/transcriptions`

### Twilio Configuration
- **TwiML App Voice URL**: `https://callburner-app.onrender.com/voice`
- **Status Callback URL**: `https://callburner-app.onrender.com/api/calls/status`
- **Transcription URL**: `https://callburner-app.onrender.com/api/transcriptions/realtime`

## 📦 Deployment Process

### Render (Automatic on Git Push)
```bash
git add .
git commit -m "Your changes"
git push origin main
```

**Render automatically**:
1. Detects push to `main` branch
2. Runs `npm install && npm run build`
3. Starts server with `npm run start`
4. Serves on `https://callburner-app.onrender.com`

### Build Commands
- **Install**: `npm install` (installs all workspaces)
- **Build**: `npm run build` (builds client only)
- **Start**: `npm run start` (starts server, serves client)
- **Dev**: `npm run dev` (runs both server and client in watch mode)

## 🔐 Environment Variables

### Required on Render
```
PORT=4000
TWILIO_ACCOUNT_SID=<from Twilio Console>
TWILIO_AUTH_TOKEN=<from Twilio Console>
TWILIO_API_KEY=<from Twilio Console>
TWILIO_API_SECRET=<from Twilio Console>
TWILIO_TWIML_APP_SID=<from Twilio Console>
TWILIO_CALLER_ID=<your Twilio phone number>
PUBLIC_BASE_URL=https://callburner-app.onrender.com
SIMULATE_TRANSCRIPTION=false
```

### Local Development
See `server/.env.example` and `client/.env.example`

## 🔧 Key Features

### Real-time Transcription
- Uses WebSocket for bidirectional communication
- Twilio sends transcription webhooks to Render
- Render broadcasts to all connected clients
- Auto-enabled simulation for localhost development

### Call Recording
- Can start/stop recordings during active call
- Recordings stored in Twilio
- Recording status tracked via webhooks

### Token Generation
- Short-lived tokens (1 hour TTL)
- Unique endpoint IDs prevent conflicts
- Includes voice grant with caller ID

### Error Handling
- Centralized error middleware
- Structured logging with pino
- Consistent error response format

## 🚀 Why Hybrid Architecture?

### Render Advantages
- ✓ WebSocket support (required for real-time transcription)
- ✓ Full Express server capabilities
- ✓ Easy deployment and auto-deploy on push
- ✓ Free tier with HTTPS
- ✓ Serves both API and static client

### Twilio Functions (Backup)
- ✓ Already integrated with Twilio
- ✓ Low latency for TwiML generation
- ✓ No infrastructure management
- ✓ Alternative if Render unavailable

## 📊 Data Flow

### State Management
- **Call State**: Stored in-memory Map on server (ephemeral)
- **Active Recordings**: Tracked in-memory for start/stop
- **Transcriptions**: Streamed in real-time, not persisted
- **Client State**: React hooks (useState, useEffect)

### WebSocket Channels
- One channel per `callSid`
- Multiple clients can listen to same call
- Auto-cleanup when all clients disconnect

## 🎯 Future Improvements

- [ ] Add database for persistent call history
- [ ] Implement authentication/multi-user support
- [ ] Add call analytics and reporting
- [ ] Store transcriptions for playback
- [ ] Upgrade to Render paid tier for 24/7 uptime
- [ ] Add Twilio Media Streams for advanced transcription
- [ ] Implement call queuing and routing

## 📚 Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment instructions
- [CLEANUP.md](CLEANUP.md) - Code cleanup summary
- [README.md](README.md) - Project overview
