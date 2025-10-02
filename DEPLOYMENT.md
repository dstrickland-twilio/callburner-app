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
