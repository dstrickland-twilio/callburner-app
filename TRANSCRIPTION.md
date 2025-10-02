# Real-Time Transcription Guide

## 🎤 How It Works

CallBurner now uses **Twilio's Real-Time Transcription API** to provide live transcription during calls.

## 📋 Architecture

```
1. User clicks "Start Recording" button
   ↓
2. Server calls Twilio API to:
   - Start recording
   - Start real-time transcription
   ↓
3. Twilio transcribes audio in real-time
   ↓
4. Twilio sends transcription events to:
   POST /api/transcriptions/realtime
   ↓
5. Server broadcasts to WebSocket clients
   ↓
6. Transcription appears in browser UI
```

## 🚀 Implementation Details

### Starting Transcription

When you click "Start Recording", the server makes two API calls:

```javascript
// 1. Start recording
const recording = await twilioClient.calls(callSid).recordings.create({
  recordingStatusCallback: `${PUBLIC_BASE_URL}/api/calls/status`,
  recordingStatusCallbackEvent: ['in-progress', 'completed']
});

// 2. Start real-time transcription
const transcription = await twilioClient.calls(callSid).transcriptions.create({
  name: `Transcription for ${callSid}`,
  track: 'both_tracks',  // Transcribe both caller and callee
  statusCallbackUrl: `${PUBLIC_BASE_URL}/api/transcriptions/realtime`,
  statusCallbackMethod: 'POST'
});
```

### Receiving Transcription Events

Twilio sends POST requests to `/api/transcriptions/realtime` with transcription data.

The `mapTwilioRealtimeEvent()` function normalizes different Twilio formats and extracts:
- `CallSid` - Which call this transcription belongs to
- `Text` - The transcribed text
- `isFinal` - Whether this is a partial or final transcription
- `Timestamp` - When the transcription occurred
- `Participant` - Which track (caller/callee) if available

### Broadcasting to Clients

The server maintains WebSocket connections per call:

```javascript
// Client connects with callSid
ws://your-server.com/ws/transcriptions?callSid={callSid}

// Server broadcasts transcription events to all listeners for that call
broadcastTranscription(callSid, {
  chunkId: 'unique-id',
  text: 'Hello, this is a test',
  isFinal: true,
  timestamp: 1696282800000
});
```

## ⚙️ Configuration

### Required Environment Variables

```bash
PUBLIC_BASE_URL=https://your-render-app.onrender.com
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
```

### Twilio Webhook Configuration

**Not needed!** - The transcription webhook URL is set programmatically when calling the API.

## 📊 Transcription Tracks

The implementation uses `both_tracks` to capture:
- **Inbound track** - What the caller says
- **Outbound track** - What the person being called says

This provides a complete conversation transcript.

## 🧪 Testing

### Test Real-Time Transcription

1. **Open the app**: https://callburner-app.onrender.com
2. **Enter a phone number** and click "Call"
3. **Click "Start Recording"** once connected
4. **Speak during the call** - transcription should appear in real-time!

### What to Expect

- ✅ Transcription starts when you click "Start Recording"
- ✅ Text appears in the right panel as you speak
- ✅ Both sides of the conversation are transcribed
- ✅ Partial results may appear, then get refined to final

## 🔍 Troubleshooting

### No Transcription Appearing?

**Check Render Logs**:
1. Go to Render Dashboard → Your Service → Logs
2. Look for:
   ```
   [INFO]: Starting recording for call
   [INFO]: Real-time transcription started
   [INFO]: Received real-time transcription webhook
   [INFO]: Broadcasting transcription
   ```

**Common Issues**:

1. **Recording not started**: Transcription only works when recording is active
   - Click "Start Recording" button during call

2. **PUBLIC_BASE_URL not set**: Server must be publicly accessible
   - Verify `PUBLIC_BASE_URL=https://callburner-app.onrender.com` in Render environment

3. **WebSocket not connected**: Client must have active WebSocket
   - Check browser console for WebSocket errors

4. **Twilio API error**: Check for transcription errors in logs
   - Look for "Failed to start transcription" warnings

### Simulation vs Real Transcription

**Simulation** (localhost only):
- Enabled automatically when `PUBLIC_BASE_URL` contains "localhost"
- Shows fake transcriptions for testing UI
- Set `SIMULATE_TRANSCRIPTION=true` to force enable

**Real Transcription** (production):
- Uses Twilio Real-Time Transcription API
- Requires active recording
- Costs apply per minute of transcription

## 💰 Pricing

Twilio Real-Time Transcription pricing:
- **$0.05 per minute** of transcribed audio
- Billed per call leg (both tracks transcribed = 2x cost)
- Example: 10-minute call = ~$1.00

See: https://www.twilio.com/voice/pricing

## 🎯 Future Enhancements

Possible improvements:
- [ ] Add language selection (currently English only)
- [ ] Support partial results display
- [ ] Add transcription export/download
- [ ] Store transcriptions in database
- [ ] Add speaker diarization (who said what)
- [ ] Support custom vocabulary for better accuracy

## 📚 References

- [Twilio Real-Time Transcription Docs](https://www.twilio.com/docs/voice/api/realtime-transcription-resource)
- [Twilio Transcription Pricing](https://www.twilio.com/voice/pricing)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
