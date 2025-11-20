# CallBurner Roadmap

**Last Updated**: November 2025  
**Current Version**: Production deployment on Render

---

## 📊 Project Status Overview

CallBurner is a **fully functional Twilio-based web dialer** deployed to production with real-time transcription, call recording, and WebSocket-based live updates.

### ✅ Core Features (Complete)
- ✓ Web-based dialer with glassmorphic UI
- ✓ Twilio Voice SDK integration
- ✓ Call recording (start/stop during call)
- ✓ Real-time transcription via Twilio API
- ✓ WebSocket streaming for live transcripts
- ✓ Call history and status tracking
- ✓ Production deployment on Render
- ✓ Automatic builds and deployments

### 🏗️ Recent Improvements (Completed Oct 2025)
- ✓ Proper `.gitignore` configuration
- ✓ Environment variable cleanup and documentation
- ✓ Structured logging with Pino
- ✓ Centralized error handling middleware
- ✓ Code deduplication and utility extraction
- ✓ Security improvements

---

## 🎯 Current Priorities

### 🔴 High Priority (Security & Stability)

#### 1. **Security: Rotate Twilio Credentials** 
**Status**: ⚠️ URGENT  
**Effort**: 15 minutes  
**Impact**: Critical security fix

The `.env` files previously contained real Twilio credentials that were exposed in version control.

**Action Items**:
- [ ] Generate new API Key/Secret in Twilio Console
- [ ] Update credentials in Render environment variables
- [ ] Delete old credentials from Twilio Console
- [ ] Verify deployment works with new credentials

**References**: 
- Twilio Console: https://console.twilio.com → Account → API Keys
- Render Dashboard: https://dashboard.render.com → Service → Environment

---

#### 2. **Consolidate Server/Twilio Functions Code**
**Status**: 🟡 Recommended  
**Effort**: 4-6 hours  
**Impact**: Reduces maintenance, prevents drift

Token and voice logic is duplicated between Express server and Twilio Functions.

**Current State**:
- Express server (`server/src/index.js`) - Currently used in production
- Twilio Functions (`twilio/functions/`) - Deployed but not actively used

**Options**:
1. **Extract shared logic** to utility modules used by both
2. **Choose one deployment method** (recommended: Express server for WebSocket support)
3. **Keep both but auto-sync** from single source of truth

**Recommendation**: Use Express server exclusively, archive Twilio Functions as backup.

---

#### 3. **Complete Logging Migration**
**Status**: 🟡 In Progress  
**Effort**: 2-3 hours  
**Impact**: Better debugging and monitoring

Approximately 40 `console.log` statements remain in the codebase.

**Progress**:
- ✓ Pino logger configured with pretty formatting
- ✓ Key endpoints migrated (token, voice, transcription)
- ⏳ ~40 console.log statements to migrate

**Action Items**:
- [ ] Migrate remaining console.log in server routes
- [ ] Add structured logging to error cases
- [ ] Document logging conventions in CONTRIBUTING.md

---

### 🟡 Medium Priority (Code Quality)

#### 4. **Enable Stricter TypeScript Checks**
**Status**: 🟢 Nice to have  
**Effort**: 2-3 hours  
**Impact**: Catches bugs earlier

Add stricter TypeScript compiler options to client:
- `noUnusedLocals`
- `noUnusedParameters`
- `noImplicitReturns`
- `strictNullChecks`

**Action Items**:
- [ ] Update `client/tsconfig.json` with strict options
- [ ] Fix resulting type errors
- [ ] Document TypeScript conventions

---

#### 5. **Convert Inline Comments to JSDoc**
**Status**: 🟢 Nice to have  
**Effort**: 3-4 hours  
**Impact**: Better IDE support and documentation

Complex functions would benefit from proper JSDoc documentation.

**Target Files**:
- `server/src/index.js` - Main endpoints
- `client/src/hooks/useTwilioDevice.ts` - Call control logic
- `client/src/hooks/useTranscriptionStream.ts` - WebSocket management

---

#### 6. **Remove Unused Code**
**Status**: 🟢 Low priority  
**Effort**: 1 hour  
**Impact**: Minor cleanup

**Action Items**:
- [ ] Remove `disabled` prop in CallControls component (unused)
- [ ] Review and remove unused imports
- [ ] Consider removing `clsx` dependency (only used once)

---

### 🟢 Low Priority (Nice to Have)

#### 7. **Externalize Simulation Code**
**Status**: 🟢 Low priority  
**Effort**: 1 hour  
**Impact**: Cleaner code organization

Move transcription simulation to separate file:
- From: Inline in `server/src/index.js`
- To: `server/src/utils/transcriptionSimulator.js`

---

#### 8. **Use Environment Variables in Vite Config**
**Status**: 🟢 Low priority  
**Effort**: 30 minutes  
**Impact**: More flexible configuration

Currently the Vite proxy is hardcoded to `http://localhost:4000`. Use environment variables instead.

---

## 🚀 Future Features & Enhancements

### Data Persistence
**Status**: 📋 Planned  
**Effort**: 8-12 hours  
**Impact**: Production-ready data management

**Current State**: All data stored in-memory (lost on restart)

**Goals**:
- [ ] Add database (PostgreSQL or Redis)
- [ ] Persist call records beyond process memory
- [ ] Store transcriptions for playback
- [ ] Maintain recording references

**Benefits**:
- Call history survives restarts
- Historical transcription search
- Analytics and reporting capabilities

---

### Authentication & Multi-User Support
**Status**: 📋 Planned  
**Effort**: 12-16 hours  
**Impact**: Enterprise-ready security

**Goals**:
- [ ] JWT-based authentication
- [ ] User registration and login
- [ ] Per-user call history
- [ ] Role-based access control (admin, agent, viewer)

**Security Considerations**:
- Secure Express routes
- API Gateway or reverse proxy auth
- Session management

---

### Advanced Transcription Features
**Status**: 📋 Planned  
**Effort**: 6-8 hours per feature  
**Impact**: Enhanced call intelligence

**Potential Features**:
- [ ] Language selection (currently English only)
- [ ] Display partial results (real-time refinement)
- [ ] Transcription export/download (PDF, TXT, JSON)
- [ ] Speaker diarization (identify who said what)
- [ ] Custom vocabulary for better accuracy
- [ ] Sentiment analysis
- [ ] Keyword highlighting

**Technical Options**:
- Continue with Twilio Real-Time Transcription
- Integrate Twilio Media Streams
- Add Voice Intelligence webhooks

---

### Call Analytics & Reporting
**Status**: 📋 Planned  
**Effort**: 8-12 hours  
**Impact**: Business insights

**Features**:
- [ ] Call volume dashboard
- [ ] Average call duration
- [ ] Transcription word clouds
- [ ] Call outcome tracking
- [ ] Agent performance metrics
- [ ] Cost analysis (Twilio usage)

---

### Inbound Call Handling
**Status**: 📋 Planned  
**Effort**: 6-8 hours  
**Impact**: Two-way communication

**Current State**: Outbound calls only

**Goals**:
- [ ] Handle inbound calls (`Device.on('incoming')` already wired)
- [ ] Agent routing and queuing
- [ ] Call transfer and conferencing
- [ ] Voicemail handling

---

### Infrastructure Improvements
**Status**: 📋 Planned  
**Effort**: Varies  
**Impact**: Scalability and reliability

**Goals**:
- [ ] Upgrade Render to paid tier for 24/7 uptime
- [ ] Add health check endpoints
- [ ] Implement rate limiting
- [ ] Add request/response logging
- [ ] Set up monitoring (Datadog, New Relic, etc.)
- [ ] Add automated tests (unit, integration, e2e)
- [ ] CI/CD pipeline improvements

---

## 📈 Performance & Scalability

### Current Limitations
- **In-memory storage**: Data lost on restart
- **Single instance**: No horizontal scaling
- **Free tier spin-down**: 30s cold start after 15 min inactivity
- **No connection pooling**: Database connections not optimized

### Future Scaling Strategy
1. **Short-term** (0-100 concurrent calls):
   - Render paid tier ($7-25/month)
   - Redis for session storage
   
2. **Medium-term** (100-1000 concurrent calls):
   - PostgreSQL for persistent data
   - Load balancer + multiple instances
   - Separate WebSocket servers
   
3. **Long-term** (1000+ concurrent calls):
   - Kubernetes deployment
   - Dedicated Twilio Elastic SIP Trunking
   - CDN for static assets
   - Microservices architecture

---

## 📚 Documentation Improvements

### Current Documentation
- ✓ README.md - Project overview and setup
- ✓ ARCHITECTURE.md - System design and deployment
- ✓ DEPLOYMENT.md - Render deployment guide
- ✓ TRANSCRIPTION.md - Real-time transcription guide
- ✓ CLEANUP.md - Code cleanup summary
- ✓ ROADMAP.md - This document

### Future Documentation Needs
- [ ] CONTRIBUTING.md - Contribution guidelines
- [ ] API.md - API endpoint documentation
- [ ] TESTING.md - Testing strategy and guide
- [ ] TROUBLESHOOTING.md - Common issues and solutions
- [ ] SECURITY.md - Security policies and best practices

---

## 🎯 Milestones

### Q4 2025 (Current)
- [x] Launch production deployment
- [x] Implement real-time transcription
- [x] Code cleanup and logging
- [ ] Rotate security credentials
- [ ] Consolidate deployment architecture

### Q1 2026
- [ ] Database integration (PostgreSQL)
- [ ] User authentication system
- [ ] Call analytics dashboard
- [ ] Automated testing suite

### Q2 2026
- [ ] Inbound call handling
- [ ] Advanced transcription features
- [ ] Multi-tenant support
- [ ] Monitoring and alerting

### Q3 2026
- [ ] Mobile app (React Native)
- [ ] API v2 with REST standards
- [ ] International number support
- [ ] Webhook integrations (Slack, Teams)

---

## 💰 Cost Considerations

### Current Monthly Costs
- **Render**: $0 (free tier)
- **Twilio**: Variable based on usage
  - Voice: ~$0.013/minute
  - Real-time Transcription: ~$0.05/minute
  - Phone Number: ~$1.15/month

### Projected Costs (100 calls/day, 5 min avg)
- **Render Paid**: $7-25/month
- **PostgreSQL**: $7/month (Render)
- **Twilio Voice**: ~$195/month
- **Twilio Transcription**: ~$750/month
- **Total**: ~$960-980/month

### Cost Optimization Strategies
- [ ] Implement call duration limits
- [ ] Optional transcription (user opt-in)
- [ ] Bulk pricing negotiation with Twilio
- [ ] Regional number optimization

---

## 🤝 Contributing

This roadmap is a living document. Priorities may shift based on:
- User feedback
- Business requirements
- Technical discoveries
- Resource availability

For questions or suggestions, open an issue or submit a PR!

---

## 📞 Support

- **GitHub Issues**: https://github.com/dstrickland-twilio/callburner-app/issues
- **Twilio Support**: https://support.twilio.com
- **Render Support**: https://render.com/docs

---

**Note**: This roadmap reflects the current state as of November 2025. Items marked "Completed" are production-ready. Items marked "Planned" are subject to prioritization and resource availability.
