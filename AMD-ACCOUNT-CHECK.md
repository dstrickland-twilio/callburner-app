# AMD Account Diagnostic Checklist

## Issue Summary
TwiML is correctly configured with all AMD parameters, but Twilio is not executing AMD detection. Child call shows error 21262 even though callback URL is present in TwiML.

## Diagnostic Steps

### 1. Check Account Type
- [x] Go to: https://console.twilio.com/us1/account/manage-account
- [x] Verify account is **not in trial mode**
- [x] Trial accounts have limited AMD capabilities

### 2. Verify AMD Feature is Enabled
- [x] Go to: https://console.twilio.com/us1/develop/voice/settings/general
- [x] Look for "Answering Machine Detection" section
- [x] If not visible, AMD may not be enabled on your account

### 3. Check Billing & Credits
- [x] Go to: https://console.twilio.com/us1/billing/manage-billing/billing-overview
- [x] Verify billing is configured
- [x] Ensure you have available credits
- [ ] AMD costs $0.0075 per detection

### 4. Contact Twilio Support (If Needed)
If AMD settings aren't visible in Console:
- [ ] Open support ticket at: https://support.twilio.com
- [ ] Request: "Enable Answering Machine Detection (AMD) on account ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
- [ ] Reference: Account needs AMD V3 (DetectMessageEnd) feature

## Test Once AMD is Enabled

After AMD is enabled on your account:

1. **Make a test call** to a voicemail
2. **Check child call logs** for "Machine Detection" section
3. **Verify** error 21262 is gone
4. **Check** /calls-amd function receives callback
5. **See** AMD badge appear in UI

## Expected Behavior When Working

### Call Logs Should Show:
- ✅ Machine Detection section with result
- ✅ AnsweredBy parameter (human/machine/fax)
- ✅ No error 21262

### Function Logs Should Show:
```
AMD callback received
CallSid: CA...
AnsweredBy: machine_end_beep
MachineDetectionDuration: 4500
Confidence: high
```

### UI Should Show:
- 👤 **Human answered** (if human)
- 📧 **Voicemail detected** (if machine)
- 📠 **Fax detected** (if fax)

## Current Status

✅ **Code Implementation**: Complete and correct
✅ **TwiML Generation**: Perfect - all AMD attributes present
✅ **Client Integration**: AMD enabled by default
❌ **Account Feature**: AMD not enabled/available

## Next Steps

1. Verify account is out of trial mode
2. Check if AMD feature is visible in Console
3. Contact Twilio Support if needed to enable AMD
4. Once enabled, test immediately - no code changes needed!

## Reference Documentation

- AMD Overview: https://www.twilio.com/docs/voice/answering-machine-detection
- AMD Best Practices: https://www.twilio.com/docs/voice/answering-machine-detection-faq-best-practices
- Error 21262: https://www.twilio.com/docs/api/errors/21262
