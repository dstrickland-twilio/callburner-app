# Answering Machine Detection (AMD) - Twilio Serverless Implementation

## Overview

This document describes the implementation of AMD (Answering Machine Detection) for CallBurner when deployed to **Twilio Serverless Functions**. This implementation uses Twilio's REST API with AsyncAmd instead of TwiML-based AMD.

## Architecture

### Key Differences from Express Implementation

1. **REST API Call Initiation**: Calls are initiated via Twilio REST API instead of browser-to-PSTN through TwiML
2. **AsyncAmd Parameter**: Uses `asyncAmd` parameter in REST API instead of TwiML attributes
3. **Twilio Sync**: Uses Twilio Sync for real-time state updates instead of WebSockets
4. **Serverless Functions**: All endpoints are Twilio Functions instead of Express routes
5. **No WebSocket Required**: Sync handles real-time updates to browser clients

## Implementation Components

### 1. Twilio Functions

#### `calls-initiate.js` (NEW)
**Endpoint**: `POST /calls-initiate`

Initiates outbound calls via Twilio REST API with optional AMD.

**Parameters**:
- `to` (required): Phone number to dial
- `identity` (required): Browser client identity
- `record` (optional): Enable call recording ("true"/"false")
- `amd` (optional): Enable AMD ("true"/"false")

**AMD Configuration**:
- `machineDetection: "DetectMessageEnd"` - AMD V3 mode
- `asyncAmd: true` - Non-blocking detection
- `asyncAmdStatusCallback` - Points to `/calls-amd-status`
- `machineDetectionTimeout: 30` - 30 second max detection time
- `machineDetectionSpeechThreshold: 2400` - 2.4 seconds of speech
- `machineDetectionSpeechEndThreshold: 1500` - 1.5 seconds silence

**Flow**:
1. Receives call initiation request from client
2. Creates call via REST API with AMD parameters
3. Registers call in Sync with `amdStatus: 'Pending'`
4. Returns `callSid` to client

#### `voice-connect-client.js` (NEW)
**Endpoint**: `POST /voice-connect-client`

Generates TwiML to connect the outbound call back to browser client.

**Parameters**:
- `identity` (required): Browser client identity
- `record` (optional): Enable call recording

**Flow**:
1. Called by Twilio when outbound call connects
2. Generates TwiML with `<Dial><Client>` to browser
3. Adds transcription if configured
4. Adds recording if requested

#### `calls-amd-status.js` (NEW)
**Endpoint**: `POST /calls-amd-status`

Handles AsyncAmd callback results from Twilio.

**Callback Parameters** (from Twilio):
- `CallSid`: Call identifier
- `AnsweredBy`: Detection result
  - `human` - Human answered
  - `machine_end_beep` - Voicemail with beep
  - `machine_end_silence` - Voicemail with silence
  - `machine_end_other` - Voicemail (other)
  - `fax` - Fax machine
  - `unknown` - Unable to determine
- `MachineDetectionDuration`: Detection time in milliseconds

**Flow**:
1. Receives AMD result from Twilio
2. Maps result to user-friendly status
3. Updates Sync document with AMD data
4. Returns 200 OK to Twilio

#### `voice-continue.js` (NEW)
**Endpoint**: `POST /voice-continue`

Handles post-dial actions (simply hangs up).

#### `calls-status.js` (UPDATED)
**Endpoint**: `POST /calls-status`

Handles call status updates with AMD status progression tracking.

**Changes**:
- Tracks AMD status through call lifecycle
- Sets `amdStatus: 'Pending'` on `initiated`
- Sets `amdStatus: 'Detecting'` on `ringing`/`in-progress`
- Preserves AMD result once received

#### `calls-amd.js` (EXISTING)
**Endpoint**: `POST /calls-amd`

Existing AMD callback handler for TwiML-based AMD (browser-initiated calls).

### 2. Client Changes

#### `client/src/services/api.ts` (UPDATED)

Added `initiateCall()` function:

```typescript
export const initiateCall = async ({
  to,
  record,
  amd,
  identity
}: {
  to: string;
  record: boolean;
  amd: boolean;
  identity: string;
}): Promise<string> => {
  const response = await api.post('/calls-initiate', {
    to,
    record: record.toString(),
    amd: amd.toString(),
    identity
  });
  
  return response.data.callSid;
};
```

#### Environment Variables

Added to `client/.env.example`:

```
VITE_TWILIO_FUNCTIONS_URL=https://YOUR-TWILIO-DOMAIN.twil.io
```

## Call Flow with REST API AMD

### 1. Call Initiation
```
Browser → POST /calls-initiate
         ↓
    Twilio REST API
         ↓
  Call Created with AsyncAmd
         ↓
    Sync: amdStatus = 'Pending'
         ↓
    callSid returned to browser
```

### 2. Call Connection
```
Twilio → POST /voice-connect-client
         ↓
  TwiML: <Dial><Client>identity</Client></Dial>
         ↓
  Call connects to browser
         ↓
  Sync: status = 'in-progress'
  Sync: amdStatus = 'Detecting'
```

### 3. AMD Detection
```
Twilio (background) → Analyzing audio
                    ↓
              POST /calls-amd-status
                    ↓
         Sync: amdStatus = 'Human'/'Voicemail'/etc.
                    ↓
            Browser receives update
```

### 4. Browser Display
```
useTwilioSync hook → Subscribes to Sync document
                   ↓
              AMD status changes
                   ↓
          UI shows AMD badge
```

## Environment Variables

### Twilio Functions Environment

Required in Twilio Functions configuration:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_CALLER_ID=+15555555555
TWILIO_SYNC_SERVICE_SID=ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Client Environment

Required in `client/.env`:

```
VITE_TWILIO_FUNCTIONS_URL=https://your-function-domain.twil.io
VITE_TWILIO_TOKEN_URL=https://your-function-domain.twil.io/token
```

## Deployment

### 1. Deploy Twilio Functions

```bash
cd twilio
twilio serverless:deploy --service-name callburner-functions
```

**Note the deployed domain** (e.g., `callburner-functions-2333-dev.twil.io`)

### 2. Configure Environment Variables

In Twilio Console → Functions → Services → callburner-functions → Environment Variables:

Add all required variables listed above.

### 3. Update Client Configuration

Create `client/.env` (or `.env.local`):

```
VITE_TWILIO_FUNCTIONS_URL=https://[your-domain].twil.io
```

### 4. Build and Deploy Client

```bash
cd client
npm run build
```

Deploy `dist/` folder to your hosting provider.

## Testing

### 1. Test Call Initiation

```javascript
import { initiateCall } from './services/api';

const callSid = await initiateCall({
  to: '+15555555555',
  record: true,
  amd: true,
  identity: 'test-user'
});

console.log('Call initiated:', callSid);
```

### 2. Check Twilio Logs

In Twilio Console → Monitor → Logs → Functions:
- Look for `calls-initiate` logs showing REST API call creation
- Verify AMD parameters are included
- Check for `calls-amd-status` callback logs

### 3. Check Sync Documents

In Twilio Console → Sync → Services → Your Service → Documents:
- Find `call-{CallSid}` document
- Verify `amdEnabled: true`
- Check `amdStatus` progression: Pending → Detecting → Human/Voicemail

### 4. Browser Console

- Check for Sync updates in browser console
- Verify AMD status badge appears in UI
- Confirm transcription works

## Troubleshooting

### AMD Not Running

**Symptom**: No AMD callback received

**Checks**:
1. Verify Twilio account has AMD enabled
2. Check billing is configured (AMD costs $0.0075 per call)
3. Look for errors in `/calls-initiate` logs
4. Verify `asyncAmdStatusCallback` URL is correct

### Sync Updates Not Received

**Symptom**: Browser doesn't show AMD status

**Checks**:
1. Verify `TWILIO_SYNC_SERVICE_SID` is set
2. Check Sync document exists: `call-{CallSid}`
3. Verify client is subscribed to Sync document
4. Check browser console for Sync errors

### Call Doesn't Connect

**Symptom**: Call created but doesn't reach browser

**Checks**:
1. Verify `/voice-connect-client` generates correct TwiML
2. Check `identity` matches browser client identity
3. Verify TwiML App SID is correct
4. Check browser client is registered

## Cost Impact

### Per Call Costs

- **Base call cost**: ~$0.01-0.015/minute (destination dependent)
- **AMD cost**: $0.0075 per call
- **Transcription**: ~$0.05 per minute (if enabled)
- **Sync**: Included in most plans

### Example Monthly Costs

- 1,000 calls with AMD: $7.50/month
- 10,000 calls with AMD: $75/month

## Comparison: TwiML AMD vs REST API AsyncAmd

### TwiML AMD (Browser-Initiated)
- Configured in TwiML `<Dial>` or `<Number>`
- Callback via `amdStatusCallback` attribute
- Used for browser → PSTN calls
- Handler: `calls-amd.js`

### REST API AsyncAmd (Server-Initiated)
- Configured in `calls.create()` API call
- Callback via `asyncAmdStatusCallback` parameter
- Used for API → PSTN → Browser calls
- Handler: `calls-amd-status.js`

**Both are supported** in this implementation for maximum flexibility.

## Future Enhancements

- [ ] Add AMD result to call recordings metadata
- [ ] Implement auto-hangup on voicemail detection
- [ ] Show AMD confidence score in UI
- [ ] Add AMD statistics dashboard
- [ ] Configure AMD timeout per call
- [ ] Batch call initiation with AMD

## Related Documentation

- [AMD-IMPLEMENTATION.md](./AMD-IMPLEMENTATION.md) - Original Express-based implementation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment guide
- [README.md](./README.md) - Project overview

## References

- [Twilio REST API - Create Call](https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource)
- [Twilio AsyncAmd Documentation](https://www.twilio.com/docs/voice/answering-machine-detection)
- [Twilio Sync Documentation](https://www.twilio.com/docs/sync)
- [Twilio Serverless Functions](https://www.twilio.com/docs/serverless/functions-assets/functions)
