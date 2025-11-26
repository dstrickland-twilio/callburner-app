# AMD v3 Server Implementation Summary

## Date: 2025-11-24

## What Was Done

Added Answering Machine Detection (AMD) v3 support to the Express server in CallBurner, complementing the existing Twilio Functions implementation.

## Changes Made

### 1. Voice Endpoint (`/voice`) - AMD v3 Parameters

Added AMD v3 configuration to the `/voice` endpoint in `server/src/index.js`:

- Extracts `amd` parameter from request body
- When `amd === 'true'` and `PUBLIC_BASE_URL` is set, adds these attributes to the `<Dial>` TwiML:
  - `machineDetection="DetectMessageEnd"` - Uses AMD v3 for improved accuracy
  - `asyncAmd="true"` - Non-blocking detection (call connects immediately)
  - `asyncAmdStatusCallback="${PUBLIC_BASE_URL}/api/calls/amd"` - Callback URL for results
  - `asyncAmdStatusCallbackMethod="POST"` - POST method for callback
  - `machineDetectionTimeout="30"` - 30 second detection timeout
  - `machineDetectionSpeechThreshold="2400"` - 2.4 seconds minimum speech duration
  - `machineDetectionSpeechEndThreshold="1500"` - 1.5 seconds silence to detect greeting end

### 2. AMD Callback Endpoint (`/api/calls/amd`) - NEW

Created new endpoint to receive AMD detection results from Twilio:

**Request Parameters:**
- `CallSid` - The call identifier
- `AnsweredBy` - Detection result (human, machine_end_beep, machine_end_silence, machine_end_other, fax, unknown)
- `MachineDetectionDuration` - Time in milliseconds to complete detection
- `Confidence` - Detection confidence level (high, medium, low)

**Processing:**
- Maps raw Twilio results to user-friendly statuses:
  - `human` → "Human"
  - `machine_end_*` → "Voicemail"
  - `fax` → "Fax"
  - `unknown` → "Unknown"
- Updates call store with AMD data
- Stores: amdStatus, amdResult, amdConfidence, amdDuration, amdTimestamp

### 3. Call Registration (`/api/calls`) - AMD Tracking

Enhanced call registration endpoint:

- Accepts `amdEnabled` parameter (boolean)
- Adds `amdEnabled` field to call summary
- Sets initial `amdStatus: 'Detecting'` when AMD is enabled
- Stores AMD state for later retrieval

## How It Works

### Call Flow with AMD v3

1. **Client initiates call** with `amd: true` parameter
2. **Voice webhook** receives request and generates TwiML with AMD attributes
3. **Twilio connects call** immediately (async mode)
4. **AMD runs in background** analyzing audio
5. **Detection complete** → Twilio POSTs to `/api/calls/amd`
6. **Server updates** call store with detection result
7. **Client retrieves** AMD status via `/api/calls/:sid/summary`

### Key Features

- **Non-blocking**: Call connects immediately, detection happens in background
- **Accurate**: Uses AMD v3 (DetectMessageEnd) for improved detection
- **Configurable**: Timeout and threshold settings optimized for real-world use
- **Tracked**: Full AMD metadata stored with call summary

## Integration with Existing Code

### Compatible With

- ✅ Twilio Functions implementation (optional deployment)
- ✅ Client-side AMD UI (badges, status display)
- ✅ Call store and call summary API
- ✅ WebSocket transcription system
- ✅ Recording functionality

### No Breaking Changes

- All changes are additive
- Existing calls without AMD continue to work
- AMD is opt-in via `amd` parameter

## Testing

To test the implementation:

1. **Start server**: `npm run dev`
2. **Make call with AMD**: Pass `amd: true` when dialing
3. **Check logs**: Voice webhook should show "AMD v3 enabled for call"
4. **Wait for callback**: `/api/calls/amd` receives detection result
5. **Verify storage**: Call summary includes AMD fields

## Configuration Requirements

### Environment Variables (already configured)

- `PUBLIC_BASE_URL` - Required for AMD callbacks (e.g., ngrok URL or production domain)
- `TWILIO_ACCOUNT_SID` - Twilio account identifier
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_CALLER_ID` - Outbound caller ID

### Twilio Account Requirements

- AMD must be enabled on Twilio account (may require support request)
- Billing/credits configured (AMD costs $0.0075 per detection)
- Trial accounts may have AMD disabled

## Cost Impact

- Base call cost: ~$0.01-0.015 per minute
- AMD v3 cost: $0.0075 per call
- **Example**: 1000 calls/month = $7.50/month additional

## Documentation Updates

Updated `AMD-IMPLEMENTATION.md` to reflect server-side implementation alongside existing Twilio Functions approach.

## References

- [Twilio AMD v3 Documentation](https://www.twilio.com/docs/voice/answering-machine-detection)
- [AMD Best Practices](https://www.twilio.com/docs/voice/answering-machine-detection-faq-best-practices)
- [Async AMD Announcement](https://www.twilio.com/en-us/changelog/async-answering-machine-detection-now-generally-available)

## Files Modified

1. `server/src/index.js` - Added AMD parameters to `/voice`, created `/api/calls/amd`, updated `/api/calls`
2. `AMD-IMPLEMENTATION.md` - Updated documentation with server-side changes
3. `AMD-SERVER-IMPLEMENTATION.md` - Created this summary document

## Status

✅ **Complete** - AMD v3 fully implemented in Express server
