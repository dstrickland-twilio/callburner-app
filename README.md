# CallBurner - Local Twilio Dialer

A local-first web dialer that pairs a polished React UI with an Express backend wrapping the core Twilio Voice features you described: dialing, hangup, call recording, live transcription display, and post-call summaries.

## Project layout

```
callburner-app/
├── client/   # Vite + React (TypeScript) SPA
└── server/   # Express server for Twilio tokens, call control, transcription fan-out
```

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

### Hosting `/token` + `/voice` on Twilio Functions (no ngrok required)

If you only want Twilio to handle the voice webhook and access token (so the browser never has to reach your local server), deploy the small Twilio Serverless project included in `twilio/`:

1. Install the Twilio CLI if you have not already: `npm install -g twilio-cli`
2. Copy `server/.env` values into `twilio/.env` using the keys Twilio Functions expects:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_API_SECRET=your_api_secret
   TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_CALLER_ID=+15555555555
   PUBLIC_BASE_URL=https://<your-public-server-or-render-app>
   ALLOWED_ORIGIN=https://localhost:5173
   ```
   > ✅ You can leave `PUBLIC_BASE_URL` pointing at wherever your Express app runs (Render, Fly, etc.). It is only needed for status callbacks.
3. Deploy the functions:
   ```
   cd twilio
   twilio login
   twilio serverless:deploy --service-name callburner-functions
   ```
4. In Twilio Console update your TwiML App Voice URL to the new `voice` function URL (shown after deploy) and point the React app’s token request to the `token` function URL (copy `client/.env.example` to `client/.env` and set `VITE_TWILIO_TOKEN_URL=https://<twilio-function-domain>/token`).

The rest of the Express server (WebSocket transcripts, call log, recording controls) still needs to be reachable from Twilio. Deploy it to any small Node host when you are ready, or keep using ngrok for those routes while you experiment.

### Enable real-time transcription (Twilio)

1. Set `SIMULATE_TRANSCRIPTION=false` in `server/.env` so the fake phrases stay disabled.
2. Make sure `PUBLIC_BASE_URL` points to a public URL (ngrok while local, Render/Fly/etc. in prod). The server exposes `/api/transcriptions/realtime` for Twilio’s callbacks.
3. Keep using this project’s `/voice` TwiML: it now adds a `<Start><Transcription transcriptionType="real-time" track="both_tracks" ... />` block automatically when `PUBLIC_BASE_URL` is set.
4. In Twilio Console, enable Real-time Transcription for the voice app/number you are using (follow [Twilio’s guide](https://www.twilio.com/docs/voice/api/realtime-transcription-resource)). Twilio will stream partial + final segments to the callback URL above and the web app will echo them live.

> Need to ingest transcripts from someplace else? POST to `/api/transcriptions` with `{ callSid, chunkId, text, isFinal }` and the UI will render it the same way.

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

## Answering Machine Detection (AMD)

CallBurner includes Twilio's Answering Machine Detection (AMD v3) using REST API with AsyncAmd support. AMD automatically detects whether a call was answered by a human, voicemail system, fax machine, or other machine.

### How It Works

When AMD is enabled:
1. Call is initiated via REST API (`/api/calls/initiate`)
2. Twilio connects to the phone number
3. AMD detection runs in background (non-blocking)
4. Call dials back to browser client
5. AMD results delivered via webhook to `/api/calls/amd-status`

### AMD Results

- **Human**: Call answered by a person
- **Voicemail**: Answering machine or voicemail detected
- **Fax**: Fax machine detected
- **Unknown**: Unable to determine

### Documentation

- **[AMD REST API Implementation](AMD-REST-API-IMPLEMENTATION.md)** - Technical architecture
- **[AMD Test Validation Guide](AMD-TEST-VALIDATION.md)** - Comprehensive testing procedures
- **[AMD Migration Guide](AMD-MIGRATION-GUIDE.md)** - User-friendly migration guide
- **[Implementation Summary](IMPLEMENTATION-SUMMARY.md)** - Quick reference

### Requirements

- AMD must be enabled in your Twilio account (Console → Voice → Settings)
- Account needs credits (AMD costs $0.0075 per detection)
- `PUBLIC_BASE_URL` must be publicly accessible for webhooks

## Next steps / production hardening

- Persist call records & transcripts beyond process memory (Redis, Postgres, etc.)
- Secure Express routes (JWT session, API Gateway, or reverse proxy auth)
- Serve the Vite build via the Express app for a single command deploy
- Handle inbound calls and agent routing (Twilio `Device.on('incoming')` already wired)
- Replace the transcript simulator with Twilio Media Streams or Voice Intelligence webhooks
- Integrate AMD status with Twilio Sync for real-time UI updates

Enjoy the new dialer! 🎧
