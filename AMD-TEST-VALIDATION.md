# AMD REST API Implementation - Test Validation Guide

## Date: 2025-12-02

## Overview
This document provides a comprehensive testing guide for the new REST API-based AMD implementation.

## Prerequisites

### Server Configuration
Ensure the following environment variables are set in `server/.env`:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_CALLER_ID=+1234567890
PUBLIC_BASE_URL=https://your-server.com
```

### Twilio Account Setup
1. AMD must be enabled on your Twilio account
2. Account must have sufficient credits (AMD costs $0.0075 per detection)
3. Verified/purchased phone number set as `TWILIO_CALLER_ID`
4. TwiML app configured and SID set in environment

## Test Cases

### Test Case 1: AMD Enabled - Call to Voicemail

**Objective**: Verify AMD detects voicemail correctly

**Steps**:
1. Start the server: `npm run dev`
2. Open browser to client URL
3. Enable AMD toggle in UI (if present, otherwise AMD is enabled by default)
4. Enter a phone number known to go to voicemail
5. Click "Dial"

**Expected Results**:
- Client logs show: REST API call initiated
- Server logs show:
  ```
  Initiating REST API call
  AMD configured for REST API call
  Call created successfully via REST API
  ```
- Call connects and dials back to browser
- AMD status progresses: `Pending` → `Detecting` → `Voicemail (Beep|Silence|Other)`
- Server logs show:
  ```
  AMD callback received via REST API
  Updated call with AMD detection result
  ```

**Verification**:
- Check call summary: `/api/calls/{callSid}/summary`
  - Should include: `amdStatus`, `amdResult`, `amdConfidence`, `amdDuration`
- Check server logs for AMD callback
- Verify call store contains AMD data

### Test Case 2: AMD Enabled - Call to Human

**Objective**: Verify AMD detects human correctly

**Steps**:
1. Start the server
2. Open browser to client URL
3. Enable AMD
4. Enter a phone number where a person will answer
5. Click "Dial"
6. Person should answer the phone

**Expected Results**:
- Call connects normally
- AMD status progresses: `Pending` → `Detecting` → `Human`
- Detection duration should be relatively short (< 5 seconds typically)
- Call continues normally with person on the line

**Verification**:
- Check call summary for `amdStatus: "Human"`
- Check `amdResult: "human"`
- Verify low `amdDuration` value
- Confirm call quality is good

### Test Case 3: AMD Disabled - Normal Call

**Objective**: Verify calls work normally without AMD

**Steps**:
1. Start the server
2. Open browser to client URL
3. Disable AMD (if toggle exists) or pass `amd: false`
4. Enter any phone number
5. Click "Dial"

**Expected Results**:
- Call connects normally
- No AMD status in call record
- No AMD callback received
- Call works exactly as before AMD implementation

**Verification**:
- Check call summary: no `amdStatus` field
- Server logs should NOT show "AMD configured"
- No AMD callback logs

### Test Case 4: Recording with AMD

**Objective**: Verify recording works alongside AMD

**Steps**:
1. Start the server
2. Open browser to client URL
3. Enable both AMD and Recording
4. Make a call
5. Let call connect and record

**Expected Results**:
- Both AMD and recording work simultaneously
- AMD detection completes
- Recording starts and captures audio
- Transcription streams in real-time
- Recording URL available after call ends

**Verification**:
- Check call summary for both `amdStatus` and `recordingUrl`
- Verify recording file exists and is playable
- Check transcription data was received
- Confirm both features worked together

### Test Case 5: Call to Fax Machine

**Objective**: Verify AMD detects fax machines

**Steps**:
1. Start the server
2. Open browser to client URL
3. Enable AMD
4. Enter a fax number (if available)
5. Click "Dial"

**Expected Results**:
- AMD status progresses to `Fax`
- `amdResult: "fax"`
- Call may disconnect after detection

**Verification**:
- Check call summary for `amdStatus: "Fax"`
- Verify AMD callback was received
- Check detection duration

### Test Case 6: Error Handling - Invalid Number

**Objective**: Verify proper error handling for invalid numbers

**Steps**:
1. Start the server
2. Open browser to client URL
3. Enter an invalid number (e.g., "1234")
4. Click "Dial"

**Expected Results**:
- Error response from `/api/calls/initiate`
- Proper error message displayed to user
- No pending connection timeout
- Call status shows error

**Verification**:
- Check client error handling
- Verify server logs show error
- Confirm no orphaned call records

### Test Case 7: Timeout Handling

**Objective**: Verify timeout when incoming connection doesn't arrive

**Steps**:
1. Modify code to simulate no incoming connection
2. Or: Block incoming call routing temporarily
3. Make a call
4. Wait 30+ seconds

**Expected Results**:
- Timeout error after 30 seconds
- Error message: "Timeout waiting for incoming connection"
- Call cleanup happens properly
- User can make another call

**Verification**:
- Check timeout triggers at 30 seconds
- Verify error state is set
- Confirm no memory leaks (pending connections cleared)

### Test Case 8: Multiple Rapid Calls

**Objective**: Verify system handles multiple calls correctly

**Steps**:
1. Start the server
2. Open browser to client URL
3. Make a call
4. Before first call connects, make another call (if UI allows)
5. OR: Make calls in quick succession after each completes

**Expected Results**:
- Each call gets unique CallSid
- AMD detection works for each call independently
- No interference between calls
- Call store maintains correct records

**Verification**:
- Check call store has separate entries
- Verify each call has correct AMD status
- Confirm no cross-contamination of call data

## Manual Testing Checklist

### Server Startup
- [ ] Server starts without errors
- [ ] All environment variables loaded correctly
- [ ] Twilio client initialized
- [ ] Endpoints registered correctly

### Call Initiation
- [ ] REST API endpoint `/api/calls/initiate` accessible
- [ ] Accepts valid parameters
- [ ] Returns CallSid
- [ ] Rejects invalid requests with proper error messages

### TwiML Generation
- [ ] `/voice/connect-client` endpoint generates valid TwiML
- [ ] TwiML includes transcription start
- [ ] TwiML includes proper Dial configuration
- [ ] Recording configuration included when enabled

### AMD Callbacks
- [ ] `/api/calls/amd-status` receives callbacks from Twilio
- [ ] All AMD result types handled correctly
- [ ] Call store updated with AMD data
- [ ] Proper logging at each stage

### Client Integration
- [ ] Client initiates REST API calls correctly
- [ ] Waits for incoming connection
- [ ] Handles connection properly
- [ ] Connection events fire correctly
- [ ] Error handling works

### Status Tracking
- [ ] AMD status progresses correctly: Pending → Detecting → Result
- [ ] Call status updates received
- [ ] Status visible in UI (if implemented)
- [ ] Historical calls show AMD results

## Logging Verification

### Client Console Logs (Expected)
```
Requesting access token...
Token received successfully
Device registered
[Call initiated via REST API]
[Waiting for incoming connection]
[Incoming connection received]
Connection accepted
```

### Server Logs (Expected)
```
Token request received
Token generated successfully
Initiating REST API call { to: '+1234567890', record: false, amd: true }
AMD configured for REST API call
Call created successfully via REST API { callSid: 'CA...', to: '+1234567890' }
Connect-client webhook received
Generating TwiML to dial client
Received call status update { CallSid: 'CA...', CallStatus: 'initiated' }
Received call status update { CallSid: 'CA...', CallStatus: 'ringing' }
Received call status update { CallSid: 'CA...', CallStatus: 'answered' }
Call answered, AMD detection in progress { callSid: 'CA...' }
AMD callback received via REST API { callSid: 'CA...', answeredBy: 'human' }
Updated call with AMD detection result { callSid: 'CA...', amdStatus: 'Human' }
```

## API Testing with curl

### Test Call Initiation
```bash
curl -X POST http://localhost:4000/api/calls/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "record": false,
    "amd": true,
    "identity": "test-user"
  }'
```

**Expected Response**:
```json
{
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Check Call Status
```bash
curl http://localhost:4000/api/calls/CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/summary
```

**Expected Response**:
```json
{
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "dialedNumber": "+1234567890",
  "startedAt": "2025-12-02T14:30:00.000Z",
  "status": "answered",
  "amdEnabled": true,
  "amdStatus": "Human",
  "amdResult": "human",
  "amdConfidence": "high",
  "amdDuration": "3200",
  "amdTimestamp": "2025-12-02T14:30:05.000Z"
}
```

## Known Issues & Workarounds

### Issue 1: Timeout Too Short
**Symptom**: Calls timeout before incoming connection arrives
**Solution**: Increase `INCOMING_CONNECTION_TIMEOUT_MS` in `useTwilioDevice.ts`

### Issue 2: AMD Callback Not Received
**Symptom**: No AMD results appear in call summary
**Possible Causes**:
- AMD not enabled on Twilio account
- Insufficient account credits
- PUBLIC_BASE_URL not accessible from Twilio
- Firewall blocking webhooks

**Debug Steps**:
1. Check Twilio Console call logs
2. Verify AMD section shows data
3. Check webhook logs in Twilio Console
4. Verify PUBLIC_BASE_URL is publicly accessible
5. Check server logs for callback receipt

### Issue 3: Incoming Connection Not Received
**Symptom**: Timeout waiting for incoming connection
**Possible Causes**:
- Device not registered properly
- Identity mismatch
- Network issues
- TwiML app misconfigured

**Debug Steps**:
1. Check device registration status
2. Verify identity in token matches identity in REST API call
3. Check TwiML app configuration
4. Test with Twilio Console debugger

## Performance Considerations

### Expected Latencies
- Call initiation: < 1 second
- Incoming connection arrival: 2-5 seconds
- AMD detection (human): 2-5 seconds
- AMD detection (voicemail): 5-30 seconds
- Total time to connected call: 5-10 seconds

### Resource Usage
- Memory: ~50MB per server instance
- Network: Minimal (WebSocket + API calls)
- Twilio Credits: $0.0075 per AMD detection

## Success Criteria

✅ All test cases pass
✅ AMD results received for all call types
✅ Recording works with AMD
✅ Transcription works with AMD
✅ Error handling works correctly
✅ No security vulnerabilities found
✅ Code review feedback addressed
✅ Documentation complete
✅ Logging comprehensive and correct

## Next Steps After Testing

1. **Production Deployment**
   - Update environment variables on production server
   - Verify PUBLIC_BASE_URL is correct
   - Test with real phone numbers
   - Monitor AMD detection accuracy

2. **UI Enhancements**
   - Add AMD status indicator in UI
   - Show real-time AMD detection progress
   - Display AMD results in call history
   - Add AMD confidence metrics

3. **Monitoring**
   - Track AMD detection success rate
   - Monitor detection durations
   - Alert on failed AMD callbacks
   - Log AMD result distribution (human vs voicemail)

4. **Optimization**
   - Tune AMD threshold parameters
   - Adjust timeout values based on real-world data
   - Implement AMD result caching if needed
   - Add AMD simulation mode for development

## Support & Troubleshooting

### Debug Mode
Enable verbose logging:
```bash
# Add to server/.env
LOG_LEVEL=debug
```

### Twilio Console Resources
- Call Logs: https://www.twilio.com/console/voice/calls/logs
- Debugger: https://www.twilio.com/console/voice/calls/debugger
- AMD Settings: https://www.twilio.com/console/voice/settings

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Device is not ready" | Device not registered | Wait for device registration |
| "Twilio client is not configured" | Missing env vars | Check environment variables |
| "Timeout waiting for incoming connection" | Connection not arriving | Check device registration, identity, and network |
| "Failed to initiate call" | REST API error | Check Twilio account status and credentials |
| "Missing identity in connect-client request" | Parameter not passed | Verify URL parameters in REST API call |

## Conclusion

This implementation provides a robust, production-ready AMD solution using Twilio's REST API with AsyncAmd support. The architecture ensures:

- ✅ AMD results are properly delivered via webhooks
- ✅ Non-blocking detection (calls connect immediately)
- ✅ Comprehensive status tracking
- ✅ Proper error handling
- ✅ Backward compatibility
- ✅ Production-ready logging and monitoring

Follow this test validation guide to ensure the implementation works correctly in your environment before deploying to production.
