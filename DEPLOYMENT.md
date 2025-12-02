# CallBurner Deployment Guide

## 🚀 Render Deployment

### GitHub Repository
✅ **Connected**: https://github.com/dstrickland-twilio/callburner-app

### Render Setup Steps

1. **Go to Render**: https://render.com
2. **Sign in** with GitHub
3. **New Blueprint**:
   - Click "New +" → "Blueprint"
   - Select your repository: `dstrickland-twilio/callburner-app`
   - Render auto-detects `render.yaml`
   - Click "Apply"

### Environment Variables to Set in Render Dashboard

Once deployed, go to your service → Environment and add:

```
TWILIO_ACCOUNT_SID=<your_account_sid_from_twilio_console>
TWILIO_AUTH_TOKEN=<your_auth_token_from_twilio_console>
TWILIO_API_KEY=<your_api_key_from_twilio_console>
TWILIO_API_SECRET=<your_api_secret_from_twilio_console>
TWILIO_TWIML_APP_SID=<your_twiml_app_sid>
TWILIO_CALLER_ID=<your_twilio_phone_number>
PUBLIC_BASE_URL=https://your-app-name.onrender.com
SIMULATE_TRANSCRIPTION=false
```

**💡 Get these values from**:
- Twilio Console: https://console.twilio.com
- Account SID & Auth Token: Dashboard → Account Info
- API Key & Secret: Account → API Keys (create new ones for security)
- TwiML App SID: Voice → TwiML Apps
- Caller ID: Phone Numbers → Manage → Active Numbers

**⚠️ IMPORTANT**: Replace `https://your-app-name.onrender.com` with your actual Render URL after deployment!

### After Deployment

1. **Get your Render URL** (e.g., `https://callburner-app.onrender.com`)

2. **Update Twilio TwiML App**:
   - Go to: https://console.twilio.com/us1/develop/voice/manage/twiml-apps
   - Find your TwiML App (SID: `AP294004b9ba87266edbae31ce62f381a3`)
   - Update "Voice Configuration" → "Request URL":
     - Set to: `https://your-render-url.onrender.com/voice`
     - Method: `HTTP POST`
   - Click "Save"

3. **Update PUBLIC_BASE_URL** in Render:
   - Go to your Render service
   - Environment → Edit `PUBLIC_BASE_URL`
   - Set to your Render URL
   - Save and redeploy

4. **Update Client Token URL** (if needed):
   - Your client will automatically use the deployed API
   - Or update `VITE_TWILIO_TOKEN_URL` if deploying client separately

## 🎯 What This Fixes

✅ **No more ngrok needed** - Your server is publicly accessible
✅ **Real-time transcription works** - Twilio can reach your webhooks
✅ **HTTPS included** - Render provides SSL certificates
✅ **Auto-deploy on push** - Push to main branch to deploy

## 🔄 Continuous Deployment

Every time you push to `main`:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Render will automatically:
1. Pull latest code
2. Run `npm install && npm run build`
3. Start with `npm run start`
4. Deploy to production

## 📊 Monitoring

- **Logs**: Available in Render Dashboard
- **Health Check**: `https://your-url.onrender.com/api/calls`
- **Client**: Will be served at `https://your-url.onrender.com/`

## ⚠️ Security Note

**ROTATE YOUR TWILIO CREDENTIALS** - They were exposed in `.env` files. Go to Twilio Console and:
1. Generate new API Key/Secret
2. Update in Render environment variables
3. Delete old credentials from Twilio

## 🆓 Free Tier Limits

Render free tier includes:
- 750 hours/month runtime
- Spins down after 15 min of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to paid for 24/7 uptime

---

## 📱 Twilio Serverless Functions Deployment

For production deployments with AMD (Answering Machine Detection), deploy to **Twilio Serverless Functions**.

### Prerequisites

1. Install Twilio CLI:
   ```bash
   npm install -g twilio-cli
   ```

2. Login to Twilio CLI:
   ```bash
   twilio login
   ```

### Deploy Functions

1. **Configure Environment Variables**:
   
   Create `twilio/.env` with:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_API_SECRET=your_api_secret
   TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_CALLER_ID=+15555555555
   TWILIO_SYNC_SERVICE_SID=ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ALLOWED_ORIGIN=*
   ```

   **Get Sync Service SID**:
   - Go to: https://console.twilio.com/us1/develop/sync/services
   - Create a new Sync Service if needed
   - Copy the Service SID

2. **Deploy to Twilio**:
   ```bash
   cd twilio
   twilio serverless:deploy --service-name callburner-functions
   ```

3. **Note Your Domain**:
   
   After deployment, you'll see output like:
   ```
   Deployment successful!
   Domain: https://callburner-functions-2333-dev.twil.io
   ```

4. **Update Client Environment**:
   
   Create `client/.env`:
   ```
   VITE_TWILIO_FUNCTIONS_URL=https://your-function-domain.twil.io
   VITE_TWILIO_TOKEN_URL=https://your-function-domain.twil.io/token
   ```

5. **Update TwiML App**:
   
   In Twilio Console → Voice → TwiML Apps:
   - Update Voice Request URL to: `https://your-function-domain.twil.io/voice`
   - Method: `HTTP POST`

### Deployed Functions

After deployment, these endpoints are available:

| Endpoint | Purpose |
|----------|---------|
| `/token` | Generate access tokens for browser clients |
| `/voice` | TwiML for browser-initiated calls |
| `/voice-connect-client` | TwiML for REST API-initiated calls |
| `/voice-continue` | Post-dial handler |
| `/calls-register` | Register new calls in Sync |
| `/calls-status` | Handle call status updates |
| `/calls-hangup` | Hang up active calls |
| `/calls-recording-toggle` | Start/stop recording |
| `/calls-amd` | AMD callback for TwiML-based AMD |
| `/calls-amd-status` | AMD callback for REST API AMD |
| `/calls-initiate` | Initiate calls via REST API with AMD |
| `/transcription-realtime` | Real-time transcription callbacks |
| `/sync-token` | Generate Sync tokens |

### Testing

1. **Test Token Endpoint**:
   ```bash
   curl -X POST https://your-domain.twil.io/token \
     -H "Content-Type: application/json" \
     -d '{"identity":"test-user"}'
   ```

2. **Test Call Initiation with AMD**:
   ```bash
   curl -X POST https://your-domain.twil.io/calls-initiate \
     -H "Content-Type: application/json" \
     -d '{
       "to":"+15555555555",
       "identity":"test-user",
       "record":"true",
       "amd":"true"
     }'
   ```

3. **Check Logs**:
   ```bash
   twilio serverless:logs --service-name callburner-functions
   ```

### Redeploy After Changes

```bash
cd twilio
twilio serverless:deploy --service-name callburner-functions
```

### Cost Considerations

Twilio Functions pricing:
- **Functions**: $0.0001 per invocation after 10,000 free/month
- **Runtime**: $0.00003 per GB-second
- **Most apps**: < $5/month for moderate usage

Combined with AMD:
- **AMD**: $0.0075 per call
- **Example**: 1,000 calls/month = ~$7.50 AMD + ~$1 Functions = ~$8.50/month

### Troubleshooting

**Functions not updating?**
```bash
# Force redeploy
twilio serverless:deploy --force
```

**Can't find service?**
```bash
# List all services
twilio serverless:list
```

**Environment variables not working?**
- Check in Twilio Console → Functions → Services → Environment Variables
- Must redeploy after changing environment variables

For more details on AMD implementation, see [AMD-SERVERLESS-IMPLEMENTATION.md](./AMD-SERVERLESS-IMPLEMENTATION.md).
