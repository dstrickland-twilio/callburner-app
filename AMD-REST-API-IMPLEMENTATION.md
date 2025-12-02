# AMD REST API Implementation

## Date: 2025-12-02

## Overview

Implemented Twilio's Answering Machine Detection (AMD) using REST API with `AsyncAmd=true` parameter to enable proper AMD result delivery. The previous TwiML-based approach using `device.connect()` with AMD parameters on the `<Number>` element did not provide AMD results because TwiML-based AMD doesn't return detection results to the application.

## Architecture Change

### Previous Architecture (TwiML-based)
```
Client → Device.connect() → TwiML (/voice) → PSTN Number
                                ↓
                         AMD on <Number> element
                         (Results not returned)
```

### New Architecture (REST API-based)
```
Client → REST API (/api/calls/initiate) → Twilio.calls.create()
                                              ↓
                                          AsyncAmd enabled
                                              ↓
                                    PSTN Number answers
                                              ↓
                                    TwiML (/voice/connect-client)
                                              ↓
                                    Dial back to Client
                                              ↓
                                    AMD results → /api/calls/amd-status
```

## Implementation Details

### 1. Server Endpoints

#### `/api/calls/initiate` (NEW)
- **Method**: POST
- **Purpose**: Initiate outbound calls via Twilio REST API with AsyncAmd support
- **Parameters**:
  - `to` (string, required): Phone number to dial
  - `record` (boolean): Enable call recording
  - `amd` (boolean): Enable answering machine detection
  - `identity` (string, required): Client identity for callback
- **Returns**: `{ callSid: string }`
- **AMD Configuration**:
  ```javascript
  machineDetection: 'DetectMessageEnd'
  asyncAmd: true
  asyncAmdStatusCallback: '/api/calls/amd-status'
  asyncAmdStatusCallbackMethod: 'POST'
  machineDetectionTimeout: 30
  machineDetectionSpeechThreshold: 2400
  machineDetectionSpeechEndThreshold: 1500
  ```

#### `/voice/connect-client` (NEW)
- **Method**: POST
- **Purpose**: Generate TwiML to dial back to browser client
- **Parameters** (query string):
  - `identity` (string): Client identity to dial
  - `record` (string): 'true' or 'false'
- **TwiML Generated**:
  ```xml
  <Response>
    <Start>
      <Transcription track="both_tracks" 
                     statusCallbackUrl="/api/transcriptions/realtime" />
    </Start>
    <Dial answerOnBridge="true" 
          record="record-from-answer"
          statusCallback="/api/calls/status">
      <Client>{identity}</Client>
    </Dial>
  </Response>
  ```

#### `/api/calls/amd-status` (NEW)
- **Method**: POST
- **Purpose**: Receive AMD detection results from Twilio
- **Parameters** (from Twilio webhook):
  - `CallSid` (string): Call identifier
  - `AnsweredBy` (string): Detection result
    - `human`: Answered by a person
    - `machine_start`: Machine greeting started
    - `machine_end_beep`: Voicemail with beep detected
    - `machine_end_silence`: Voicemail with silence detected
    - `machine_end_other`: Voicemail (other detection method)
    - `fax`: Fax machine detected
    - `unknown`: Unable to determine
  - `MachineDetectionDuration` (string): Time taken to detect (ms)
  - `Confidence` (string): Detection confidence level
- **Processing**:
  - Maps raw Twilio results to user-friendly status
  - Updates call record with AMD data
  - Logs detection results for debugging

### 2. Client Changes

#### `client/src/services/api.ts`
- Added `initiateCall()` function:
  ```typescript
  export const initiateCall = async (payload: { 
    to: string; 
    record: boolean; 
    amd: boolean; 
    identity: string 
  }) => {
    const { data } = await axios.post<{ callSid: string }>(
      `${EXPRESS_API_URL}/api/calls/initiate`, 
      payload
    );
    return data.callSid;
  };
  ```

#### `client/src/hooks/useTwilioDevice.ts`
- Modified `connect()` function to use REST API approach:
  1. Calls `/api/calls/initiate` with call parameters
  2. Receives CallSid from server
  3. Waits for Twilio to dial back to the client (incoming connection)
  4. Resolves with the incoming connection object
  5. Sets up connection event handlers
- Added `pendingConnectionRef` to match incoming connections with REST API calls
- Added 30-second timeout for waiting on incoming connection

### 3. Call Flow with REST API

1. **User initiates call**
   - Client calls `device.connect({ to, record, amd })`
   
2. **REST API call initiated**
   - Client POSTs to `/api/calls/initiate`
   - Server creates call via `twilioClient.calls.create()`
   - Call registered in call store with status: `'initiated'`
   - AMD status: `'Pending'`
   - Server returns CallSid to client
   
3. **Call connects to PSTN**
   - Twilio dials the target number
   - Status updates received at `/api/calls/status`:
     - `initiated` → `ringing` → `answered`
   - When status becomes `answered`, AMD status updates to `'Detecting'`
   
4. **AMD detection runs**
   - Twilio analyzes audio in background (AsyncAmd)
   - Call connects immediately (non-blocking)
   
5. **TwiML requested**
   - Twilio POSTs to `/voice/connect-client?identity={identity}&record={record}`
   - Server generates TwiML to dial back to browser client
   - TwiML includes transcription start and recording config
   
6. **Client receives incoming call**
   - Twilio dials the browser client
   - Device `incoming` event fires
   - Client matches with pending REST API call
   - Connection resolved and returned to app
   
7. **AMD results received**
   - Twilio POSTs to `/api/calls/amd-status`
   - Server updates call record with AMD detection result
   - AMD status updated (e.g., `'Human'`, `'Voicemail (Beep)'`, etc.)
   
8. **Call continues normally**
   - Transcription streams via WebSocket
   - Recording works as configured
   - Status updates continue to `/api/calls/status`

### 4. AMD Status Progression

```
Pending → Detecting → [Final Result]
   ↓          ↓              ↓
Created   Answered    AMD Callback
            ↓
      Call connected
```

**Status Values**:
- `Pending`: Call initiated, not yet answered
- `Detecting`: Call answered, AMD running in background
- `Human`: Person answered
- `Voicemail (Beep)`: Voicemail with beep detected
- `Voicemail (Silence)`: Voicemail with silence detected
- `Voicemail (Other)`: Voicemail (other detection)
- `Machine (Start)`: Machine greeting started
- `Fax`: Fax machine detected
- `Unknown`: Unable to determine

## Benefits of REST API Approach

1. **AMD Results Delivered**: Unlike TwiML-based AMD, REST API with AsyncAmd sends results to callback URL
2. **Non-Blocking**: Call connects immediately while AMD runs in background
3. **Better Control**: Full access to AMD configuration parameters
4. **Proper Status Tracking**: AMD status updates tracked through call lifecycle
5. **Debugging Support**: Comprehensive logging at each stage

## Backward Compatibility

- Legacy `/api/calls/amd` endpoint maintained for compatibility
- Original `/voice` endpoint still functional for non-REST API calls
- Client automatically uses new REST API approach for all calls
- No breaking changes to existing call flow

## Configuration Requirements

### Environment Variables
All variables from `.env.example`:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
TWILIO_TWIML_APP_SID=your_twiml_app_sid
TWILIO_CALLER_ID=+1234567890
PUBLIC_BASE_URL=https://your-server.com
```

### Twilio Account Requirements
- AMD must be enabled on Twilio account
- Account must have credits (AMD costs $0.0075 per detection)
- Verified/purchased phone number required for `TWILIO_CALLER_ID`
- TwiML app must be configured

## Testing

### Test Cases
1. **AMD Enabled Call to Voicemail**
   - Expected: AMD status progresses to `'Voicemail (Beep)'` or similar
   - Verify callback received at `/api/calls/amd-status`
   
2. **AMD Enabled Call to Human**
   - Expected: AMD status progresses to `'Human'`
   - Verify low detection duration
   
3. **AMD Disabled Call**
   - Expected: Call works normally without AMD
   - No AMD status updates
   
4. **Recording with AMD**
   - Expected: Both AMD and recording work together
   - Transcription streams correctly
   
5. **Call Failure Handling**
   - Expected: Proper error messages
   - Timeout handling for incoming connection

### Manual Testing
```bash
# 1. Start server
npm run dev

# 2. Open browser to http://localhost:5173

# 3. Make test call with AMD enabled
#    - Check browser console for "Initiating call via REST API"
#    - Check server logs for REST API call creation
#    - Verify incoming connection received
#    - Check for AMD callback logs

# 4. Verify AMD results
#    - Check call summary for AMD status
#    - Look for AMD result in call record
```

## Logging

Comprehensive logging added at each stage:
- Call initiation via REST API
- AMD configuration applied
- Call status updates
- AMD callback received
- AMD results stored
- Errors and warnings

Check server logs for:
```
Initiating REST API call
AMD configured for REST API call
Call created successfully via REST API
AMD callback received via REST API
Updated call with AMD detection result
```

## Known Issues & Limitations

1. **Timeout Handling**: 30-second timeout for incoming connection may need adjustment based on network latency
2. **Simulation Mode**: AMD simulation not implemented (only works with real Twilio calls)
3. **Sync Integration**: Not yet integrated with Twilio Sync for real-time AMD updates to UI
4. **Multiple Clients**: If same identity used on multiple devices, incoming call routing may be unpredictable

## Future Enhancements

1. **Twilio Sync Integration**: Broadcast AMD status changes to connected clients via Sync
2. **WebSocket AMD Updates**: Send AMD status updates through existing WebSocket connection
3. **AMD Simulation**: Add simulation mode for local development testing
4. **Configurable Timeouts**: Make AMD detection parameters configurable
5. **UI Indicators**: Show AMD detection in progress in the UI
6. **Call Queue**: Support for multiple simultaneous calls with AMD

## References

- [Twilio AMD Documentation](https://www.twilio.com/docs/voice/answering-machine-detection)
- [AsyncAmd Parameter](https://www.twilio.com/docs/voice/twiml/dial#asyncamd)
- Previous implementation docs: `AMD-IMPLEMENTATION.md`, `AMD-SERVER-IMPLEMENTATION.md`
- Diagnostic results: `AMD-DIAGNOSTIC.md`
