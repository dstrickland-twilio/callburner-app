# CallBurner - Twilio Web Dialer

A web-based dialer with a polished React UI and flexible backend options: local Express server for development or Twilio Serverless Functions for production. Features include dialing, hangup, call recording, live transcription, answering machine detection (AMD), and post-call summaries.

## Project layout

```
callburner-app/
├── client/   # Vite + React (TypeScript) SPA
├── server/   # Express server for local development
└── twilio/   # Twilio Serverless Functions for production deployment
```

## Architecture Options

### Option 1: Local Development (Express)
- Express server for local testing
- Requires ngrok for Twilio webhooks
- Good for development and testing

### Option 2: Production (Twilio Serverless Functions)
- Deploy to Twilio's serverless platform
- No server maintenance required
- Built-in HTTPS and scaling
- **Recommended for production use**
- **Required for AMD via REST API**

## Prerequisites

- Node.js 18+
- A Twilio account with Voice enabled
- A TwiML App configured to hit `POST https://<public-url>/voice` (use a tool such as ngrok when running locally)
- Create an API Key/Secret pair in Twilio Console (Programmable Voice > Tools)

## Environment variables

Create `server/.env` with the following keys:

```
PORT=4000
# Core auth
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret
# TwiML app that points to POST https://<public-url>/voice
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Verified / purchased number used as callerId when dialing PSTN numbers
TWILIO_CALLER_ID=+15555555555
# Public URL that Twilio can reach (required for callbacks when running locally expose via ngrok)
PUBLIC_BASE_URL=https://<your-ngrok-subdomain>.ngrok.io

# Optional helpers
# Set to `true` to stream simulated transcript text while you integrate the real thing.
SIMULATE_TRANSCRIPTION=false
```

> 💡 Run `ngrok http 4000` (or similar) and paste the generated URL into `PUBLIC_BASE_URL`. Update your TwiML App, Voice status callback, and (optionally) transcription webhook URLs inside Twilio Console to use the same host.

### Production Deployment with Twilio Functions (Recommended)

For production use, deploy to Twilio Serverless Functions. This eliminates the need for server maintenance and provides built-in scaling.

**Benefits**:
- ✅ No ngrok required
- ✅ Built-in HTTPS and scaling
- ✅ AMD via REST API support
- ✅ Twilio Sync for real-time updates
- ✅ No server to maintain

1. Install the Twilio CLI if you have not already: `npm install -g twilio-cli`
2. Create `twilio/.env` with required environment variables:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_API_SECRET=your_api_secret
   TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_CALLER_ID=+15555555555
   TWILIO_SYNC_SERVICE_SID=ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ALLOWED_ORIGIN=*
   ```
   
   **Get Sync Service SID**: https://console.twilio.com/us1/develop/sync/services (create one if needed)

3. Deploy the functions:
   ```
   cd twilio
   twilio login
   twilio serverless:deploy --service-name callburner-functions
   ```

4. After deployment, note your Functions domain (e.g., `callburner-functions-2333-dev.twil.io`)

5. Update `client/.env`:
   ```
   VITE_TWILIO_FUNCTIONS_URL=https://your-function-domain.twil.io
   VITE_TWILIO_TOKEN_URL=https://your-function-domain.twil.io/token
   ```

6. Update your TwiML App in Twilio Console:
   - Go to: https://console.twilio.com/us1/develop/voice/manage/twiml-apps
   - Update Voice Request URL to: `https://your-function-domain.twil.io/voice`
   - Method: `HTTP POST`

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.**

## Features

### Answering Machine Detection (AMD)

CallBurner supports AMD v3 via Twilio Serverless Functions:
- Automatically detects human vs. voicemail
- Real-time status updates via Twilio Sync
- Non-blocking detection (call proceeds while detecting)
- Supports both TwiML-based and REST API-based AMD

See [AMD-SERVERLESS-IMPLEMENTATION.md](./AMD-SERVERLESS-IMPLEMENTATION.md) for details.

### Real-time Transcription

Twilio's real-time transcription is automatically enabled when using Twilio Functions. The transcription callbacks are handled by the `/transcription-realtime` function.

For local development with Express:
1. Set `SIMULATE_TRANSCRIPTION=false` in `server/.env`
2. Make sure `PUBLIC_BASE_URL` points to a public URL (ngrok while local)
3. The server exposes `/api/transcriptions/realtime` for Twilio's callbacks

The TwiML automatically includes transcription configuration when deployed.

## Install dependencies

```
npm install
```

The root workspace installs both the Express server and the React client for you.

## Run the stack locally

```
npm run dev
```

This single command launches the API (http://localhost:4000) and the Vite dev server (http://localhost:5173) together. Want to run them separately? Use `npm run dev --workspace server` and `npm run dev --workspace client`.

## Build + start the production bundle

```
npm run build
npm start
```

`npm run build` compiles the React app into `client/dist`, and the Express server automatically serves that folder when you start it.

## Deploy (Render.com friendly)

1. Push this repo to GitHub.
2. Create a new Web Service in [Render](https://render.com) and select "Use a Blueprint." Point it at the included `render.yaml` (Render reads it automatically).
3. When Render asks for environment variables, paste the same values you keep in `server/.env`. Make sure `PUBLIC_BASE_URL` matches the Render URL (Render prints it after the first deploy) and update your Twilio settings to use it.
4. Render runs `npm install && npm run build` during the build and `npm run start` when serving traffic. The same container handles the API and the React UI.

Prefer another host? Any Node-friendly platform that runs `npm install`, `npm run build`, and `npm start` will work the same way.

## How calls flow

1. **Token negotiation** – the browser requests a short-lived access token (`POST /api/token`) so the Twilio Voice SDK can register the device.
2. **Dialing** – hitting *Dial* triggers the Voice SDK to connect using the params (`To`, `record=true|false`).
3. **TwiML execution** – Twilio invokes `/voice` which dials your PSTN or SIP destination, optionally starting call recording.
4. **Live transcription** – Post real-time transcript webhooks to `POST /api/transcriptions` (or enable `SIMULATE_TRANSCRIPTION` for demo data) and they will fan out to any subscribed browser via WebSockets (`/ws/transcriptions?callSid=...`).
5. **Call lifecycle** – Twilio status callbacks hit `/api/calls/status`, letting the app show the call SID, timestamps, and recording/transcript links inside the pop-up summary.
6. **Manual controls** – *Hang Up* invokes the REST API to complete the call; *Start/Stop Recording* toggles recordings using Twilio’s REST resources.

## Front-end highlights

- Dial pad + manual input with slick glassmorphic styling
- Separate panels for call controls and live transcription
- Recent calls list (updates after each call) with single-click access to the post-call summary modal
- WebSocket powered transcript stream with final/partial chunk states and timestamps

## Back-end highlights

- Twilio Access Token minting with Voice grants
- `/voice` TwiML endpoint that honours the `record` flag and hooks up status callbacks
- `/api/calls` store that tracks active & historical calls in-memory (swap to Redis/DB when you’re ready)
- Recording control endpoints (`start` / `stop`) managing the latest recording SID per call
- WebSocket hub for transcript broadcasting (+ optional simulator for local demos)

## Next steps / production hardening

- Persist call records & transcripts beyond process memory (Redis, Postgres, etc.)
- Secure Express routes (JWT session, API Gateway, or reverse proxy auth)
- Serve the Vite build via the Express app for a single command deploy
- Handle inbound calls and agent routing (Twilio `Device.on('incoming')` already wired)
- Replace the transcript simulator with Twilio Media Streams or Voice Intelligence webhooks

Enjoy the new dialer! 🎧
