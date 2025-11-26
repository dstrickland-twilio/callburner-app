# Answering Machine Detection (AMD V3) Implementation

## Overview

Successfully implemented Twilio's Answering Machine Detection (AMD V3) feature for CallBurner. AMD automatically detects whether a call was answered by a human, voicemail system, fax machine, or other machine.

## Implementation Date

2025-11-20 (Initial)
2025-11-24 (Server-side AMD v3 added)

## Changes Made

### 1. Client-Side Changes

#### Types (`client/src/types.ts`)
- Added AMD-related fields to `CallSummary` interface:
  - `amdEnabled?: boolean`
  - `amdStatus?: string` (Human, Voicemail, Fax, Machine, Unknown)
  - `amdResult?: string` (raw Twilio result)
  - `amdConfidence?: string`
  - `amdDuration?: string`
  - `amdTimestamp?: string`
- Added `track` field to `TranscriptionEvent` for speaker identification

#### Hooks

**`useTwilioDevice.ts`**
- Added `amd?: boolean` parameter to `ConnectOptions` interface
- Modified `connect()` function to pass AMD parameter to Twilio Voice SDK

**`useTwilioSync.ts`**
- Added `amdStatus` state variable
- Subscribed to Sync document `call-${callSid}` to receive AMD updates
- Returns `amdStatus` in hook return value

#### Components

**`App.tsx`**
- Added `isAmdEnabled` state (always enabled by default)
- Added `lastAmdStatus` state for tracking status changes
- Added `useEffect` hook to display AMD status messages
- Updated `handleDial()` to pass `amd: isAmdEnabled` parameter
- Updated `registerCall()` calls to include `amdEnabled` parameter
- Passed `amdStatus` prop to `TranscriptionPane` component

**`TranscriptionPane.tsx`**
- Added `amdStatus` prop to component interface
- Added visual AMD badge in header showing detection result
- Added speaker labels (Agent/Customer) based on track
- Added auto-scroll functionality for transcription body

#### Styles (`client/src/styles.css`)
- Added `.amd-badge` base styles with variants:
  - `.amd-badge.human` - green theme
  - `.amd-badge.voicemail` - yellow theme
  - `.amd-badge.fax` - purple theme
  - `.amd-badge.machine` - orange theme
- Added `.amd-result-card` styles for call summary display
- Added `.speaker-label` styles for transcript speaker identification

#### API Service (`client/src/services/api.ts`)
- Updated `registerCall()` function signature to accept `amdEnabled` parameter

### 2. Server-Side Changes (Express)

#### Voice Endpoint (`server/src/index.js`)
- Added `amd` parameter extraction from request body
- Added AMD v3 configuration when `amd === 'true'`:
  - `machineDetection="DetectMessageEnd"` (AMD V3 mode)
  - `asyncAmd="true"` (non-blocking detection)
  - `asyncAmdStatusCallback="${PUBLIC_BASE_URL}/api/calls/amd"`
  - `asyncAmdStatusCallbackMethod="POST"`
  - `machineDetectionTimeout="30"` (30 second timeout)
  - `machineDetectionSpeechThreshold="2400"` (2.4 seconds of speech)
  - `machineDetectionSpeechEndThreshold="1500"` (1.5 seconds of silence after speech)
- Added console logging for AMD configuration

#### AMD Callback Handler (`/api/calls/amd`) - NEW ENDPOINT
- Receives AMD results from Twilio
- Processes AMD callback parameters:
  - `CallSid` - Call identifier
  - `AnsweredBy` - Detection result (human, machine_end_*, fax, unknown)
  - `MachineDetectionDuration` - Time taken to detect
  - `Confidence` - Detection confidence score
- Updates call store with AMD data
- Simplifies `AnsweredBy` to user-friendly status:
  - "human" → "Human"
  - "machine_end_*" → "Voicemail"
  - "fax" → "Fax"
  - Other → "Unknown"

#### Call Registration (`/api/calls`)
- Added `amdEnabled` parameter handling
- Sets initial `amdStatus: 'Detecting'` when AMD is enabled
- Stores AMD enabled state in call summary

### 3. Twilio Functions Changes (Optional Deployment)

#### Voice Handler (`twilio/functions/voice.js`)
- Added AMD configuration when `event.amd === 'true'`:
  - `machineDetection="DetectMessageEnd"` (AMD V3 mode)
  - `asyncAmd="true"` (non-blocking detection)
  - `asyncAmdStatusCallback="${baseUrl}/calls-amd"`
  - `machineDetectionTimeout="30"` (30 second timeout)
  - `machineDetectionSpeechThreshold="2400"` (2.4 seconds of speech)
  - `machineDetectionSpeechEndThreshold="1500"` (1.5 seconds of silence after speech)
- Added console logging for AMD configuration

#### AMD Callback Handler (`twilio/functions/calls-amd.js`) - NEW FILE
- Receives AMD results from Twilio
- Processes AMD callback parameters:
  - `CallSid` - Call identifier
  - `AnsweredBy` - Detection result (human, machine_end_*, fax, unknown)
  - `MachineDetectionDuration` - Time taken to detect
  - `Confidence` - Detection confidence score
- Updates or creates Sync document with AMD data
- Simplifies `AnsweredBy` to user-friendly status:
  - "human" → "Human"
  - "machine_end_*" → "Voicemail"
  - "fax" → "Fax"
  - Other → "Unknown"

#### Call Registration (`twilio/functions/calls-register.js`)
- Added `amdEnabled` parameter handling
- Sets initial `amdStatus: 'Detecting'` when AMD is enabled
- Stores AMD enabled state in Sync document

### 4. Documentation

#### Files Copied
- `ROADMAP.md` - Product roadmap (AMD is Phase 1 core feature)
- `AMD-DIAGNOSTIC.md` - Previous diagnostic results and troubleshooting

#### New Documentation
- This file (`AMD-IMPLEMENTATION.md`)

## How It Works

### Call Flow with AMD

1. **Call Initiation**
   - User dials a number with AMD enabled (default)
   - Client passes `amd: true` parameter to Twilio Device

2. **TwiML Generation**
   - Voice webhook receives `amd` parameter
   - Generates TwiML with AMD attributes
   - Sets up async callback to `/calls-amd`

3. **AMD Detection**
   - Twilio analyzes call audio in background (non-blocking)
   - Detects speech patterns, silence, beeps
   - Makes determination within 30 seconds max

4. **Result Callback**
   - Twilio sends AMD result to `/calls-amd`
   - Handler processes result and updates Sync document
   - Client receives real-time update via Sync subscription

5. **UI Update**
   - `useTwilioSync` hook receives AMD status change
   - App displays message (e.g., "👤 Human answered")
   - Badge appears in transcription pane header

## AMD Detection Results

Twilio's AMD V3 can detect:

- **human** - Human answered the call
- **machine_end_beep** - Voicemail with beep detected
- **machine_end_silence** - Voicemail with silence after greeting
- **machine_end_other** - Voicemail detected (other method)
- **fax** - Fax machine detected
- **unknown** - Unable to determine (timeout or ambiguous)

## Configuration

### Best Practice Settings (Implemented)

- **Detection Mode**: `DetectMessageEnd` (AMD V3)
  - More accurate than V1/V2
  - Waits for voicemail greeting to end before returning result

- **Async Mode**: Enabled
  - Non-blocking detection
  - Call proceeds while detection runs in background
  - Result delivered via callback when ready

- **Timeout**: 30 seconds
  - Maximum time allowed for detection
  - Returns "unknown" if detection takes longer

- **Speech Threshold**: 2400ms (2.4 seconds)
  - Minimum speech duration to detect as voicemail greeting
  - Helps avoid false positives from brief sounds

- **Speech End Threshold**: 1500ms (1.5 seconds)
  - Silence duration to detect end of voicemail greeting
  - Signals when greeting has finished

## Testing

To test AMD:

1. Call a known human-answered number
   - Should show "👤 Human answered" badge

2. Call a voicemail system
   - Should show "📧 Voicemail" badge

3. Check Twilio Console logs for:
   - Voice webhook showing AMD parameters
   - AMD callback with detection result

## Important Notes

### Account Requirements

AMD requires:
- **Twilio account with AMD enabled** (may need to request access)
- **Billing/credits configured** (AMD costs $0.0075 per detection)
- **Trial accounts may have AMD disabled** (upgrade to enable)

### Limitations

- AMD adds latency to call connection (up to 30 seconds)
- Not 100% accurate (industry standard ~85-95% accuracy)
- Some voicemail systems may be detected as "unknown"
- Costs $0.0075 per call with AMD enabled

### Troubleshooting

If AMD isn't working:

1. **Check Twilio Console**
   - Go to call logs and look for "Machine Detection" section
   - Verify it shows detection results

2. **Check Account Status**
   - Visit Twilio Console → Voice → Settings
   - Confirm AMD is enabled

3. **Check Billing**
   - Verify account has credits/billing configured
   - AMD won't run without billing

4. **Check Logs**
   - Voice webhook should log "AMD enabled for call"
   - AMD callback should receive and process result
   - Sync document should be updated with AMD data

See `AMD-DIAGNOSTIC.md` for detailed troubleshooting steps.

## Cost Impact

With AMD enabled:
- Base call cost: ~$0.01-0.015 per minute (depends on destination)
- AMD cost: $0.0075 per call
- **Example**: 1000 calls/month = $7.50/month additional cost

## Future Enhancements

Potential improvements:
- [ ] Toggle AMD on/off per call (currently always enabled)
- [ ] Configure AMD timeout in UI
- [ ] Show AMD confidence score in call summary
- [ ] Add AMD statistics to analytics dashboard
- [ ] Implement auto-hangup on voicemail detection
- [ ] Add AMD result to call recordings metadata

## Related Files

### Server (Express)
- `server/src/index.js` - Voice endpoint, AMD callback handler, call registration

### Client (React)
- `client/src/hooks/useTwilioDevice.ts` - Core call control logic
- `client/src/hooks/useTwilioSync.ts` - Real-time AMD status updates
- `client/src/components/TranscriptionPane.tsx` - AMD badge display
- `client/src/App.tsx` - AMD state management
- `client/src/types.ts` - Shared TypeScript interfaces
- `client/src/styles.css` - AMD badge styling

### Twilio Functions (Optional)
- `twilio/functions/voice.js` - TwiML generation for calls
- `twilio/functions/calls-amd.js` - AMD result callback handler
- `twilio/functions/calls-register.js` - Call registration with AMD

## References

- [Twilio AMD Documentation](https://www.twilio.com/docs/voice/answering-machine-detection)
- [Twilio AMD Best Practices](https://www.twilio.com/docs/voice/answering-machine-detection-faq-best-practices)
- [Twilio Sync Documentation](https://www.twilio.com/docs/sync)
