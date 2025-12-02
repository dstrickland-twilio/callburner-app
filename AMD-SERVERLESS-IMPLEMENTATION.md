# AMD Serverless Implementation Guide

This document describes the Twilio Serverless Functions implementation for Answering Machine Detection (AMD) when using REST API-initiated calls.

## Overview

When calls are initiated via the Twilio REST API (rather than through the Client SDK), AMD requires a different approach using AsyncAMD callbacks. This implementation provides the necessary Twilio Functions to handle REST API-initiated calls with AMD support.

## Architecture

### Call Flow

1. **Call Initiation** (`calls-initiate.js`)
   - Client requests a call via REST API
   - Creates outbound call with AMD parameters
   - Registers call in Twilio Sync
   - Returns CallSid to client

2. **Call Connection** (`voice-connect-client.js`)
   - Twilio connects the outbound call
   - TwiML dials back to browser client
   - Starts real-time transcription
   - Configures recording if enabled

3. **AMD Detection** (`calls-amd-status.js`)
   - Receives AsyncAMD callback results
   - Updates call data in Twilio Sync
   - Maps AMD results to user-friendly status

4. **Status Tracking** (`calls-status.js`)
   - Tracks call lifecycle events
   - Updates AMD status progression
   - Stores recording URLs and metadata

5. **Call Completion** (`voice-continue.js`)
   - Handles post-dial cleanup
   - Terminates call gracefully

## Twilio Functions

### calls-initiate.js

**Purpose**: Initiate outbound calls via Twilio REST API with AMD support

**Endpoint**: `POST /calls-initiate`

**Parameters**:
- `to` (required): Phone number to dial
- `identity` (required): Client identity to connect
- `record` (optional): Enable call recording (true/false)
- `amd` (optional): Enable AMD detection (true/false)

**AMD Configuration**:
When AMD is enabled, the function configures:
- `machineDetection`: 'DetectMessageEnd'
- `asyncAmd`: 'true'
- `asyncAmdStatusCallback`: Callback URL for AMD results
- `machineDetectionTimeout`: 30 seconds
- `machineDetectionSpeechThreshold`: 2400ms
- `machineDetectionSpeechEndThreshold`: 1500ms

**Response**:
```json
{
  "callSid": "CA..."
}
```

### voice-connect-client.js

**Purpose**: Generate TwiML to connect the call back to the browser client

**Endpoint**: `POST /voice-connect-client`

**Parameters**:
- `identity`: Client identity to dial
- `record`: Enable recording flag
- `CallSid`: Twilio CallSid (auto-provided)

**TwiML Generated**:
- `<Start><Transcription>` for real-time transcription
- `<Dial>` with client connection
- Recording configuration if enabled
- Status callbacks for call events

### calls-amd-status.js

**Purpose**: Handle AsyncAMD callback results

**Endpoint**: `POST /calls-amd-status`

**Parameters** (from Twilio):
- `CallSid`: The call identifier
- `AnsweredBy`: AMD detection result
- `MachineDetectionDuration`: Detection time in ms

**AMD Results Mapping**:
- `human` → "Human"
- `machine_start` → "Machine (Start)"
- `machine_end_beep` → "Machine (Beep)"
- `machine_end_silence` → "Machine (Silence)"
- `machine_end_other` → "Machine (Other)"
- `fax` → "Fax Machine"
- `unknown` → "Unknown"

**Sync Updates**:
Updates the call document in Sync with:
- `amdStatus`: User-friendly status
- `amdResult`: Raw AMD result
- `answeredBy`: Detection result
- `machineDetectionDuration`: Detection time
- `amdTimestamp`: When AMD completed

### calls-status.js

**Purpose**: Track call lifecycle and AMD progression

**Endpoint**: `POST /calls-status`

**AMD Status Progression**:
- `initiated` → Sets `amdStatus: 'Pending'`
- `ringing/in-progress` → Sets `amdStatus: 'Detecting'` (if no AMD result yet)
- AMD callback received → Status set by `calls-amd-status.js`

### voice-continue.js

**Purpose**: Handle post-dial completion

**Endpoint**: `POST /voice-continue`

**Behavior**:
- Called after `<Dial>` verb completes
- Returns `<Hangup>` to terminate call
- Logs dial status for debugging

## Client Integration

### API Service

Add to `client/src/services/api.ts`:

```typescript
export const initiateCall = async (payload: { 
  to: string; 
  identity: string; 
  record?: boolean; 
  amd?: boolean 
}) => {
  const { data } = await api.post<{ callSid: string }>('/calls-initiate', payload);
  return data.callSid;
};
```

### Environment Configuration

Add to `client/.env.example`:

```bash
# Twilio Functions URL for Serverless deployment
VITE_TWILIO_FUNCTIONS_URL=https://your-twilio-serverless-domain.twil.io
```

## Deployment

### Prerequisites

1. Twilio account with AMD enabled
2. Twilio CLI installed: `npm install -g twilio-cli`
3. Serverless plugin: `twilio plugins:install @twilio-labs/plugin-serverless`
4. Twilio Sync service created

### Environment Variables

Configure in Twilio Functions:
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Auth Token
- `TWILIO_CALLER_ID`: Verified phone number for outbound calls
- `TWILIO_SYNC_SERVICE_SID`: Sync service SID for call storage

### Deploy Functions

```bash
cd twilio
twilio serverless:deploy
```

### Update Client Configuration

After deployment, update client environment:

```bash
# In client/.env or client/.env.local
VITE_TWILIO_FUNCTIONS_URL=https://callburner-functions-XXXX-dev.twil.io
```

Then rebuild the client:

```bash
npm run build --workspace client
```

## Testing

### Test Call with AMD

1. Ensure functions are deployed
2. Configure client environment variables
3. Make a test call with AMD enabled:

```typescript
const callSid = await initiateCall({
  to: '+1234567890',
  identity: 'user-123',
  record: true,
  amd: true
});
```

4. Monitor call in Twilio console
5. Check AMD callback logs
6. Verify Sync document updates

### Debug AMD Issues

Check Twilio Function logs:
```bash
twilio serverless:logs
```

Look for:
- "AMD enabled with AsyncAmd configuration"
- "AsyncAmd callback received"
- "AMD Status updated in Sync"

### Verify Sync Updates

Query Sync document:
```bash
twilio api:sync:v1:services:documents:fetch \
  --service-sid ISXXXXXXXX \
  --sid call-CAXXXXXXXX
```

Expected fields when AMD is enabled:
- `amdEnabled: true`
- `amdStatus: "Human"` (or other status)
- `amdResult: "human"`
- `answeredBy: "human"`
- `machineDetectionDuration: 1234`
- `amdTimestamp: "2024-11-26T..."

## Differences from Client SDK AMD

### Client SDK Implementation (calls-amd.js)

- Used when calls are initiated via `device.connect()`
- Uses regular AMD parameters (not AsyncAMD)
- AMD result returned in call parameters
- Handled in voice.js TwiML endpoint

### REST API Implementation (this guide)

- Used when calls are initiated via REST API
- Requires AsyncAMD with callback URL
- AMD result delivered to separate endpoint
- Requires additional functions for call flow

## Cost

- AMD detection: $0.0075 per call
- Same cost for both implementations
- Only charged when AMD is enabled

## Troubleshooting

### AMD Not Working

1. **Check AMD is enabled in Twilio account**
   ```bash
   # Contact Twilio support to verify AMD is enabled
   ```

2. **Verify AsyncAMD callback URL is accessible**
   - Must be publicly accessible HTTPS URL
   - Check function is deployed
   - Verify no firewall blocking

3. **Check function logs**
   ```bash
   twilio serverless:logs
   ```

4. **Verify Sync service is configured**
   - `TWILIO_SYNC_SERVICE_SID` must be set
   - Service must exist and be accessible

### AMD Status Not Updating

1. **Check calls-amd-status.js logs**
   - Verify callback is received
   - Check for Sync update errors

2. **Verify Sync document exists**
   - Document created in calls-initiate.js
   - Document name: `call-{CallSid}`

3. **Check calls-status.js**
   - Verify AMD status progression logic
   - Check `amdEnabled` flag is set

## Best Practices

1. **Always test AMD in production-like environment**
   - Use real phone numbers
   - Test with various answering scenarios

2. **Monitor AMD accuracy**
   - Track false positives/negatives
   - Adjust thresholds if needed

3. **Handle AMD results gracefully**
   - Continue call regardless of AMD result
   - Use results for analytics/routing

4. **Log AMD events**
   - Track detection duration
   - Monitor callback reliability

5. **Set appropriate timeouts**
   - 30 seconds is recommended
   - Balance accuracy vs. call delay

## Support

For issues with AMD detection:
- Check [AMD-IMPLEMENTATION.md](./AMD-IMPLEMENTATION.md) for general AMD info
- Review [AMD-DIAGNOSTIC.md](./AMD-DIAGNOSTIC.md) for troubleshooting
- Contact Twilio support for account-specific issues

## References

- [Twilio AMD Documentation](https://www.twilio.com/docs/voice/answering-machine-detection)
- [AsyncAMD Guide](https://www.twilio.com/docs/voice/answering-machine-detection#asynchronous-amd)
- [Twilio Serverless Functions](https://www.twilio.com/docs/serverless/functions-assets/functions)
