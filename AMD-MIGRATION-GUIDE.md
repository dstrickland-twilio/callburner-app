# AMD Migration Guide - TwiML to REST API

## Overview

This guide explains the migration from TwiML-based AMD to REST API-based AMD implementation in CallBurner.

## What Changed?

### Before (TwiML-based AMD)
- Used `device.connect()` with AMD parameters
- AMD configuration on `<Number>` TwiML element
- **Problem**: AMD results were never returned to the application

### After (REST API-based AMD)
- Uses Twilio REST API `calls.create()` with `AsyncAmd=true`
- Server initiates call, then TwiML dials back to browser
- **Benefit**: AMD results delivered via webhook callback

## Why This Change?

The TwiML-based AMD approach has a fundamental limitation: **it doesn't return AMD results to the application**. Only the REST API approach with `AsyncAmd=true` provides AMD detection results via webhooks.

### What Was Broken
```javascript
// OLD - TwiML-based (results not returned)
device.connect({
  params: {
    To: phoneNumber,
    amd: 'true'
  }
});
// ❌ AMD runs but results never returned
// ❌ AnsweredBy field always undefined
```

### What Now Works
```javascript
// NEW - REST API-based (results delivered)
const callSid = await initiateCall({
  to: phoneNumber,
  amd: true,
  identity: 'user'
});
// ✅ AMD runs and results sent to /api/calls/amd-status
// ✅ AnsweredBy field populated correctly
```

## Impact on Users

### For Developers

**No Code Changes Required** - The hook interface remains the same:
```typescript
const { connect } = useTwilioDevice({ identity, onIncomingCall, onCallEnded });

// Still call connect() the same way
await connect({ to: phoneNumber, record: true, amd: true });
```

The implementation details changed internally, but the API is unchanged.

### For End Users

**Better AMD Detection** - Users will now see:
- Proper AMD results in call summaries
- Real-time AMD status updates
- Accurate detection of human vs voicemail vs fax
- AMD confidence scores

## Technical Changes

### Server Endpoints

#### New Endpoints
1. **`POST /api/calls/initiate`** - Initiates calls via REST API
2. **`POST /voice/connect-client`** - TwiML to dial browser client
3. **`POST /api/calls/amd-status`** - Receives AMD results

#### Modified Endpoints
- **`POST /api/calls/status`** - Now tracks AMD status progression

#### Legacy Endpoints (Still Work)
- **`POST /api/calls/amd`** - Legacy AMD callback (kept for compatibility)
- **`POST /voice`** - Original TwiML endpoint (still functional)

### Client Changes

#### New Functions
- `initiateCall()` in `services/api.ts` - Calls REST API endpoint

#### Modified Functions
- `useTwilioDevice.connect()` - Uses REST API approach
  - Initiates call via REST API
  - Waits for incoming connection (Twilio dials back)
  - Returns connection object as before

### Call Flow Changes

#### Old Flow
```
User clicks Dial
    ↓
device.connect() with params
    ↓
TwiML generates <Dial><Number>+1234567890</Number></Dial>
    ↓
Call connects to phone number
    ↓
AMD runs (results not returned ❌)
```

#### New Flow
```
User clicks Dial
    ↓
POST /api/calls/initiate
    ↓
Twilio REST API creates call with AsyncAmd
    ↓
Call connects to phone number
    ↓
AMD runs in background (non-blocking)
    ↓
TwiML dials back to browser client
    ↓
Incoming connection arrives at browser
    ↓
AMD results → POST /api/calls/amd-status ✅
    ↓
Call record updated with AMD status
```

## Configuration Changes

### Required Environment Variables
No new variables required! All existing variables still used:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_API_KEY=SKxxxxxxxxx
TWILIO_API_SECRET=your_secret
TWILIO_TWIML_APP_SID=APxxxxxxxxx
TWILIO_CALLER_ID=+1234567890
PUBLIC_BASE_URL=https://your-server.com
```

### Twilio Account Requirements
- AMD must be enabled (check Twilio Console → Voice → Settings)
- Account needs credits ($0.0075 per AMD detection)
- Same as before, no new requirements

## Migration Steps

### For Existing Deployments

1. **Pull Latest Code**
   ```bash
   git pull origin main
   ```

2. **Install Dependencies** (if needed)
   ```bash
   npm install
   ```

3. **Build Client**
   ```bash
   npm run build
   ```

4. **Restart Server**
   ```bash
   npm run start
   # or
   npm run dev
   ```

5. **Verify AMD Works**
   - Make a test call with AMD enabled
   - Check server logs for "AMD configured for REST API call"
   - Verify AMD callback received
   - Check call summary includes AMD status

### For New Deployments

Follow the standard deployment process. The new AMD implementation is the default.

## Backward Compatibility

### What Still Works
✅ All existing calls without AMD
✅ Recording functionality
✅ Transcription functionality  
✅ Call status tracking
✅ Manual recording toggle
✅ WebSocket transcription streaming

### What Changed
- AMD now actually works (returns results)
- Call initiation happens via REST API
- Browser receives "incoming" call for outbound calls
- Slight delay (~2-5 seconds) before call connects to browser

### Breaking Changes
**None** - The changes are transparent to the user interface. The hook API remains unchanged.

## Testing Your Deployment

### Quick Test
1. Start the application
2. Make a call to a voicemail box with AMD enabled
3. Wait for call to connect
4. Check call summary:
   ```bash
   curl http://localhost:4000/api/calls/{callSid}/summary
   ```
5. Verify response includes AMD fields:
   ```json
   {
     "amdStatus": "Voicemail (Beep)",
     "amdResult": "machine_end_beep",
     "amdConfidence": "high",
     "amdDuration": "8500"
   }
   ```

### Comprehensive Tests
See `AMD-TEST-VALIDATION.md` for complete test suite.

## Troubleshooting

### Issue: "Timeout waiting for incoming connection"

**Cause**: Browser not receiving the incoming connection

**Solutions**:
1. Check device is registered (wait for "ready" phase)
2. Verify identity matches between token and REST API call
3. Check TwiML app configuration in Twilio Console
4. Ensure no firewall blocking incoming connections

### Issue: "AMD status never updates"

**Cause**: AMD callback not being received

**Solutions**:
1. Verify AMD enabled in Twilio account (Console → Voice → Settings)
2. Check account has credits
3. Verify `PUBLIC_BASE_URL` is publicly accessible
4. Check Twilio Console call logs for webhook attempts
5. Review server logs for callback receipt

### Issue: "Calls work but no AMD"

**Cause**: AMD might be disabled or not configured

**Solutions**:
1. Verify `amd: true` passed to `connect()`
2. Check server logs for "AMD configured for REST API call"
3. Verify Twilio account has AMD enabled
4. Check call was created with AsyncAmd parameter

## Performance Impact

### Latency
- **Additional time**: ~2-5 seconds (for Twilio to dial back to browser)
- **AMD detection**: Same as before (runs in background, non-blocking)
- **Overall**: Minimal impact on user experience

### Resource Usage
- **Server**: No significant change
- **Client**: Same memory footprint
- **Network**: One additional REST API call per dial

### Costs
- **Same as before**: $0.0075 per AMD detection
- **No additional charges** from using REST API

## Rollback Plan

If issues arise, you can temporarily disable AMD:
1. Set `amd: false` in all `connect()` calls
2. Or modify client to skip AMD entirely
3. Calls will work normally without AMD

The legacy TwiML endpoint (`/voice`) still exists and can be re-enabled if needed, though it won't provide AMD results.

## Support

### Documentation
- `AMD-REST-API-IMPLEMENTATION.md` - Full technical documentation
- `AMD-TEST-VALIDATION.md` - Complete testing guide
- `ARCHITECTURE.md` - System architecture overview

### Logging
Check server logs for:
- "Initiating REST API call"
- "AMD configured for REST API call"
- "AMD callback received via REST API"
- "Updated call with AMD detection result"

### Twilio Resources
- [AMD Documentation](https://www.twilio.com/docs/voice/answering-machine-detection)
- [AsyncAmd Parameter](https://www.twilio.com/docs/voice/twiml/dial#asyncamd)
- [Call Logs](https://www.twilio.com/console/voice/calls/logs)

## FAQ

### Q: Will this affect my existing calls?
**A:** No, existing functionality remains unchanged. This only adds proper AMD support.

### Q: Do I need to change my code?
**A:** No, the `useTwilioDevice` hook API is unchanged. Changes are internal.

### Q: Will AMD cost more now?
**A:** No, AMD pricing is the same ($0.0075 per detection).

### Q: Why does the call take slightly longer to connect?
**A:** The REST API approach requires Twilio to dial back to the browser, adding 2-5 seconds.

### Q: Can I disable the new AMD implementation?
**A:** Yes, set `amd: false` when calling `connect()`, or the calls will work without AMD.

### Q: What if AMD is not enabled on my Twilio account?
**A:** Calls will work normally, but AMD results won't be returned. Enable AMD in Twilio Console.

### Q: Is this production-ready?
**A:** Yes! The implementation includes:
- Comprehensive error handling
- Proper logging
- Security validation (CodeQL passed)
- Code review completed
- Full test coverage documented

## Conclusion

This migration brings **working AMD detection** to CallBurner by using Twilio's REST API with AsyncAmd support. The change is:

- ✅ Transparent to users (no API changes)
- ✅ Backward compatible (existing features work)
- ✅ Production-ready (tested and validated)
- ✅ Well-documented (comprehensive guides)
- ✅ Properly logged (debug support)

Enjoy reliable answering machine detection! 🎉
