# AMD v3 Testing Checklist

## Pre-Test Requirements

- [ ] Server running with `PUBLIC_BASE_URL` configured
- [ ] Twilio account has AMD enabled (check Console → Voice → Settings)
- [ ] Billing/credits configured on Twilio account
- [ ] ngrok or production URL set for callbacks

## Test Cases

### 1. Human Answered Call

- [ ] Dial a number you know will be answered by a person
- [ ] Check server logs for "AMD v3 enabled for call: CAxxxx"
- [ ] Wait for AMD callback (should arrive within 5-10 seconds)
- [ ] Check logs for: `AMD callback received: { answeredBy: 'human' }`
- [ ] Verify call summary shows `amdStatus: 'Human'`
- [ ] Client UI should show "👤 Human answered" badge

**Expected Result:**
```json
{
  "amdStatus": "Human",
  "amdResult": "human",
  "amdConfidence": "high",
  "amdDuration": "2400"
}
```

### 2. Voicemail Detected

- [ ] Dial a number that goes to voicemail
- [ ] Check server logs for AMD v3 enabled
- [ ] Wait up to 30 seconds for detection
- [ ] Check logs for: `answeredBy: 'machine_end_beep'` or similar
- [ ] Verify call summary shows `amdStatus: 'Voicemail'`
- [ ] Client UI should show "📧 Voicemail" badge

**Expected Result:**
```json
{
  "amdStatus": "Voicemail",
  "amdResult": "machine_end_beep",
  "amdConfidence": "high",
  "amdDuration": "8500"
}
```

### 3. Unknown/Timeout

- [ ] Dial number with ambiguous answer (e.g., very short greeting)
- [ ] Wait for 30 second timeout
- [ ] Check for `answeredBy: 'unknown'`
- [ ] Verify `amdStatus: 'Unknown'`

### 4. Call Without AMD

- [ ] Make call without `amd: true` parameter
- [ ] Verify no AMD attributes in TwiML
- [ ] Verify no AMD callback received
- [ ] Verify call summary has no AMD fields

## Debugging

### Check Twilio Console

1. Go to Twilio Console → Monitor → Logs → Voice
2. Find your call SID
3. Look for "Machine Detection" section in call details
4. Should show detection result and duration

### Check Server Logs

Look for these log entries:

```
Voice webhook received: { To: '+1234567890', amd: 'true', ... }
AMD v3 enabled for call: CAxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AMD callback received: { callSid: 'CAxxxx', answeredBy: 'human', ... }
Updated call CAxxxx with AMD status: Human
```

### Check API Response

```bash
curl http://localhost:4000/api/calls/CAxxxxx/summary
```

Should include:
```json
{
  "callSid": "CAxxxxx",
  "amdEnabled": true,
  "amdStatus": "Human",
  "amdResult": "human",
  "amdConfidence": "high",
  "amdDuration": "2400",
  "amdTimestamp": "2025-11-24T19:30:00.000Z"
}
```

## Common Issues

### Issue: No AMD callback received

**Check:**
- [ ] PUBLIC_BASE_URL is set correctly
- [ ] ngrok or server is publicly accessible
- [ ] Twilio can reach the callback URL
- [ ] Check Twilio debugger for webhook failures

### Issue: Warning 21262 in Twilio Console

**Message:** "No AMD status callback URL provided"

**Solution:** Verify PUBLIC_BASE_URL is set and accessible

### Issue: AMD always returns "unknown"

**Possible Causes:**
- AMD not enabled on Twilio account
- Billing not configured
- Trial account limitations
- Detection timeout too short

### Issue: Call fails when AMD enabled

**Check:**
- [ ] TwiML syntax is correct
- [ ] All AMD attributes properly formatted
- [ ] No quote escaping issues in XML

## Performance Verification

- [ ] Call connects immediately (async mode working)
- [ ] Detection completes within 5-30 seconds
- [ ] No noticeable delay for caller
- [ ] Callback arrives reliably

## Cost Verification

- [ ] Check Twilio usage dashboard
- [ ] Verify AMD charge ($0.0075) appears per call
- [ ] Calculate expected monthly cost

## Sign-off

- [ ] All test cases passed
- [ ] Documentation updated
- [ ] Team informed of new feature
- [ ] Monitoring alerts configured (if applicable)

---

**Tested by:** _________________

**Date:** _________________

**Result:** ☐ Pass ☐ Fail ☐ Needs Review

**Notes:**
