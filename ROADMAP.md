# CallBurner Product Roadmap

## Vision Statement

**"A modern cloud-based calling platform that helps sales and customer support teams make better calls through real-time transcription, AI insights, and workflow automation."**

### Key Differentiators
1. **Real-time transcription** during calls (not just post-call)
2. **AI-powered insights** (sentiment, action items, objections)
3. **Built-in compliance** (automatic recording, transcription storage)
4. **Simple, modern UI** (vs. legacy phone systems)

#### Important Links (Twilio Docs)
1. **Real-time Transcription for Video** https://www.twilio.com/docs/video/api/transcriptions
2. **Twilio Video** https://www.twilio.com/docs/video/overview
3. **Twilio AMD (Answering Machine Detection)** https://www.twilio.com/docs/voice/answering-machine-detection
4. **Twilio AMD Best Practices & FAQ** https://www.twilio.com/docs/voice/answering-machine-detection-faq-best-practices
5. **Twilio Conversation Relay** https://www.twilio.com/docs/voice/twiml/connect/conversationrelay
6. **Conversational Intelligence Language Operators** https://www.twilio.com/docs/conversational-intelligence/language-operators

---

## Business Model & Strategy

**Target Market:** Small businesses (sales & customer support teams)
**Go-to-Market:** Self-service initially, direct sales as budget allows
**Pricing Model:** Flat-fee subscription with add-on features
**Technical Approach:** Twilio-native (maximize their services)
**Development:** Part-time, solo founder

### Suggested Pricing (Launch)

#### Starter Plan - $29/month
- 1 user
- 1 phone number
- 500 call minutes/mo
- Real-time transcription
- Call recording
- Basic call history

#### Team Plan - $99/month ⭐ *Most Popular*
- Up to 5 users
- 3 phone numbers
- 2,000 call minutes/mo
- Everything in Starter, plus:
  - Team dashboard
  - Call assignment
  - SMS messaging (500 messages)

#### Business Plan - $299/month
- Unlimited users
- 10 phone numbers
- 5,000 call minutes/mo
- Everything in Team, plus:
  - AI call summaries & insights
  - Call scoring
  - API access
  - Priority support

#### Add-Ons
- Extra 1,000 minutes: $25/mo
- AI Insights (Starter/Team): $49/mo
- CRM Integration: $29/mo
- Additional phone number: $5/mo
- Video calling: $19/mo per user

**Target Customer LTV:** $99/mo × 24 months = $2,376

---

## Development Phases

### ✅ Phase 0: Foundation (Complete)
**Status:** ✅ Complete
**Duration:** Initial setup

**Completed Features:**
- [x] Twilio Voice SDK integration
- [x] Basic web dialer
- [x] Real-time transcription (TwiML-based)
- [x] Call recording (auto-start + manual toggle)
- [x] Twilio Sync for real-time data
- [x] React/TypeScript frontend
- [x] Twilio Serverless Functions backend

---

### 🔄 Phase 1: MVP Foundation (Weeks 1-6)
**Status:** 🔄 In Progress (Week 1)
**Goal:** Launch-ready single-team product with core value prop

#### Core Features
- [x] Outbound calling
- [x] Real-time transcription display
- [x] Call recording
- [x] Post-call summary modal
- [ ] Call details page (recording playback + full transcript)
- [ ] Call history with search
- [ ] Sidebar navigation (Calls, History, Messages, SMS, Video, Analytics, Settings)
- [ ] Answering Machine Detection (AMD V3 via Twilio)
- [ ] Basic contact book
- [ ] Inbound calling (simple IVR)
- [ ] Inter-team chat feature (user to user chat)
- [ ] Video calling, feature rich (external)
- [ ] Video real time transcription
- [ ] Video recording


#### Twilio Services Used
- [x] Voice SDK (calling)
- [x] Programmable Voice (backend)
- [x] Sync (real-time data)
- [x] Transcription API
- [x] Recording API
- [ ] Phone Numbers (inbound)
- [ ] Video
- [ ] Conversation Relay
- [ ] Conversational Intelligence
- [ ] AMD
- [ ] Compliance Embeddable
- [ ] Compliance Toolkit
- [ ] Lookups
- [ ] SMS
- [ ] WhatsApp
- [ ] Conversations API (Chat, Facebook Messenger)

#### Data Storage
- Twilio Sync Documents (call metadata, contacts)
- Twilio Recordings (audio files)
- Twilio Transcriptions (transcript storage)

#### Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: Twilio Serverless Functions
- Database: Twilio Sync (for now - zero cost, simple)
- Auth: Twilio Sync access tokens (lightweight)

**Deliverable:** Functional calling app usable daily for real business calls

**Success Criteria:**
- [ ] Place 10+ production-quality calls/day with <150ms audio latency
- [ ] Maintain 98%+ connection success rate and <2% drop rate
- [ ] Deliver real-time transcription with <10% word error rate and transcript posted within 2 minutes post-call
- [ ] Capture call summaries within 5 seconds and retain audio/transcript with zero data loss
- [ ] Maintain a unified contact record that ingests 100% of call metadata (recording, transcript, AMD status, notes) and is retrievable via search in <1s
- [ ] Provide real-time team messaging with 99% message delivery in <2s and conversation history visible alongside the related contact/call

#### Phase 1 Calling Experience Focus

**Experience Goal:** Give sales/support agents a frictionless outbound call flow where they connect in under 3 seconds, see live two-speaker transcription, capture key notes before wrap-up, and never lose recordings or transcript data.

**Primary Personas:**
- SDR running outbound sequences who needs rapid dialing, AMD feedback, and instant transcript snippets for CRM follow-up.
- Support agent handling scheduled callbacks who needs context (contact lookup) and reliable recordings for QA/compliance.
- Small business owners/employees making and taking calls for their business. May include sales, services, scheduling, ordering, etc.

**Golden Path Checklist:**
1. **Pre-Call:** Contact/number search in <1s, verified caller ID, compliance reminder visible before dialing.
2. **In-Call:** Connection established <3s, audio latency <150ms, AMD status banner when detection completes, live transcript with speaker labels and manual flagging for key moments.
3. **Post-Call:** Summary modal loads <5s, operator can add notes/action items, recording link & transcript accessible within 2 minutes, follow-up tasks queued.

**Experience Metrics & Targets:**
- Connection success rate ≥98%, drop rate ≤2%.
- Mean time to transcript availability ≤120s; transcription word error rate ≤10%.
- AMD precision ≥85% once launched; banner shown within 5s of detection.
- Operator satisfaction (post-call survey) ≥4/5; average wrap-up time ≤60s.

**Risks & Mitigations:**
- **Transcript persistence:** Twilio Sync 16KB limit risks truncation. Mitigation: design migration path to durable storage (Supabase/S3) before exceeding average call length.
- **Compliance gap:** “Built-in compliance” positioning requires consent capture and retention policy decisions before GA. Mitigation: document consent flow and legal review by end of Phase 1.
- **Twilio dependency:** Outages or AMD inaccuracies degrade UX. Mitigation: add monitoring and fallback messaging when real-time events fail.
- **Solo capacity:** Part-time delivery could slip. Mitigation: timebox golden-path QA and consider contractor assistance if metrics are not met by Week 5.

#### Phase 1 Contact Management Foundations

**Objective:** Ensure every outbound interaction automatically enriches a contact profile so agents see the full relationship at a glance today, and other channels (SMS, video, social) can plug in later without rework.

**Required Capabilities:**
- Contact creation/upsert on dial: normalize phone numbers, deduplicate by number/email, and auto-attach call metadata.
- Unified timeline UI that lists recent calls with timestamps, recordings, transcripts, AMD result, and agent notes; include placeholder sections for SMS/video/social to establish layout.
- Fast lookup: contact search/filter returns results in <1s for 1k records, with clear empty states when a channel has no activity yet.
- Notes & tagging: allow agents to add structured notes and tags that persist to the contact and surface in the summary modal.

**Measures of Success:**
- 100% of calls started from the dialer create or update a contact record without duplicate entries.
- Agents can open a contact page from call history in <3s and see the latest call data without manual refresh.
- Contact records remain consistent when edited concurrently (e.g., prevent race conditions between call wrap-up and manual edits).
- Data model documented for future channel events (SMS messages, video sessions, social DMs) with schema placeholders ready for Phase 4 expansion.

**Dependencies & Risks:**
- Requires decision on where contact data lives long-term (Twilio Sync vs Supabase); define migration path before record counts exceed Sync limits.
- Without early design for multi-channel timeline, later additions could fragment the UI; mitigate by creating wireframes covering voice + placeholder tiles now.

#### Phase 1 Team Messaging Foundations

**Objective:** Enable team members to coordinate before, during and after calls through lightweight in-app messaging that is anchored to standalone Chat feature (separate from messaging (SMS, WhatsApp, etc))

**Required Capabilities:**
- 1:1 conversations between team members with presence indicators and unread badges.
- Ability to share quick notes/links while on a call and have those messages automatically linked to the active contact/call record.
- Message history drawer accessible from both the dialer screen and the contact detail view, with timestamps and author attribution.
- Notifications for new messages (toast + sidebar badge) without interrupting the current call workflow.

**Measures of Success:**
- 99% of messages delivered and confirmed within 2 seconds under normal load; zero message loss in QA scenarios.
- Message history loads in <2 seconds for the most recent 50 messages and persists after page refresh.
- Operators can attach at least one message to a call during wrap-up and see it reflected in the contact timeline immediately.
- Documented plan to migrate to Twilio Conversations in Phase 2, including mapping from current message schema to Conversations resources.

**Dependencies & Risks:**
- Current implementation relies on Twilio Sync/WebSockets; scaling beyond a handful of concurrent users may require earlier adoption of Twilio Conversations.
- Lack of mobile push notifications could limit responsiveness; note for future phases.
- Additional UX polish (group messaging, rich media) deferred to future phases—communicate MVP scope clearly to early users.

---

### ⏳ Phase 2: Multi-User & Monetization Prep (Weeks 7-12)
**Status:** ⏳ Not Started
**Goal:** Team-ready with billing infrastructure

#### Features
- [ ] Support for sign up process
- [ ] Support for administrative abilities
- [ ] Know Your Customer process (Twilio Compliance Embeddable)
- [ ] Multi-user support (team accounts)
- [ ] User authentication (Supabase for user management)
- [ ] Team dashboard (see all calls)
- [ ] Video (internal)
- [ ] Manager listen in, whisper, and barge in
- [ ] Team listen in feature (other team members can listen into a call silently)
- [ ] Call assignment/ownership
- [ ] **Billing integration** (Stripe)
- [ ] **Subscription tiers** (see pricing above)

#### Twilio Services to Add
- [ ] Twilio Conversations (team messaging around calls)
- [ ] Twilio Verify (2FA for security)

#### Tech Additions
- [ ] Supabase (user auth + metadata storage)
- [ ] Stripe (billing)
- [ ] Keep Twilio Sync for call data (cheaper than database)

**Deliverable:** 3-5 beta customers using it

**Success Criteria:**
- [ ] 5 team members can use simultaneously
- [ ] Calls persist in database
- [ ] Basic admin controls (add/remove users)
- [ ] Stripe billing active
- [ ] 3-5 paying beta customers

---

### ⏳ Phase 3: AI Intelligence Layer (Weeks 13-18)
**Status:** ⏳ Not Started
**Goal:** Differentiation through AI (premium feature)

#### Features
- [ ] **Twilio Conversational Intelligence** integration
  - [ ] Auto call summaries
  - [ ] Sentiment tracking
  - [ ] Key moments detection
  - [ ] Action items extraction
- [ ] Call scoring/quality metrics
- [ ] Smart tags (auto-categorization)
- [ ] Manager coaching tools

#### Twilio Services
- [ ] ⭐ **Twilio Conversational Intelligence** (key differentiator!)
- [ ] Twilio AI Assistants (future: real-time agent coaching)

#### Pricing
- Add "AI Insights" as $49/mo add-on per team
- Include in Business tier

**Deliverable:** AI-powered platform competitive with Gong/Chorus (at lower price)

**Success Criteria:**
- [ ] 90%+ accurate call summaries
- [ ] Sentiment detection visible during calls
- [ ] Managers can review call quality scores
- [ ] $10K MRR target

---

### ⏳ Phase 4: Communication Suite (Weeks 19-24)
**Status:** ⏳ Not Started
**Goal:** Multi-channel platform (voice + text + video)

#### Features
- [ ] **SMS/MMS** (text customers from same number)
- [ ] **Voicemail transcription** (auto-transcribe missed calls)
- [ ] **Video calls** (screen share for demos)
- [ ] **Call routing** (IVR, skills-based routing)
- [ ] **AMD (Answering Machine Detection)** (skip voicemails in sales dialing)
- [ ] **Conversation Relay** (omnichannel inbox)

#### Twilio Services
- [ ] Twilio Messaging (SMS/MMS)
- [ ] Twilio Video (video calls)
- [ ] Twilio Conversation Relay (unified inbox)
- [ ] Twilio AMD (answering machine detection)

**Deliverable:** Full communication platform (not just calling)

**Success Criteria:**
- [ ] Multi-channel communication working
- [ ] $25K MRR target

---

### ⏳ Phase 5: Integrations & Workflow (Weeks 25-30)
**Status:** ⏳ Not Started
**Goal:** Fit into existing business tools

#### Features
- [ ] Salesforce integration (Enterprise add-on)
- [ ] HubSpot integration (most popular for SMB)
- [ ] Zapier app (long-tail integrations)
- [ ] Slack/Teams notifications
- [ ] Calendar integration (Google/Outlook)
- [ ] Email integration (log calls in Gmail)

#### Tech
- [ ] OAuth 2.0 for CRM connections
- [ ] Twilio Sync webhooks to trigger integrations
- [ ] Public API (REST) for custom integrations

#### Pricing
- CRM integrations: $29/mo add-on
- API access: Business tier only

**Deliverable:** Platform that replaces multiple tools

**Success Criteria:**
- [ ] Calls auto-logged to CRM within 1 minute
- [ ] Zero manual data entry
- [ ] Users can dial from CRM
- [ ] $50K MRR target

---

### ⏳ Phase 6: Scale & Polish (Weeks 31-36)
**Status:** ⏳ Not Started
**Goal:** 100+ paying customers, reliable platform

#### Features
- [ ] Mobile-responsive web app (PWA)
- [ ] Advanced analytics dashboard
- [ ] Team performance reports
- [ ] Call queue management
- [ ] Auto-dialer for sales teams
- [ ] Compliance tools (call recording consent, DNC lists)
- [ ] SOC 2 Type 1 (security certification)

#### Infrastructure
- [ ] Migrate to dedicated backend (Node.js API on Railway/Fly.io)
- [ ] Keep Twilio for all communication services
- [ ] Add PostgreSQL for complex queries/analytics
- [ ] CDN for global performance

**Deliverable:** Enterprise-ready platform, 99.9% uptime

**Success Criteria:**
- [ ] 99.9% uptime
- [ ] Sub-200ms latency
- [ ] 100+ paying customers
- [ ] $100K MRR target
- [ ] Ready for enterprise sales

---

## Timeline Summary

| Phase | Duration | Hours/Week | Key Milestone | Target MRR |
|-------|----------|------------|---------------|------------|
| Phase 1 | Weeks 1-6 | 15-20h | Launch MVP, daily use | $0 (testing) |
| Phase 2 | Weeks 7-12 | 15-20h | 5 beta customers | $500-1K |
| Phase 3 | Weeks 13-18 | 15-20h | AI features live | $10K |
| Phase 4 | Weeks 19-24 | 20h | Multi-channel platform | $25K |
| Phase 5 | Weeks 25-30 | 20h | CRM integrations | $50K |
| Phase 6 | Weeks 31-36 | 20h+ | 100+ customers | $100K |

**Total Duration:** ~9 months at 15-20 hours/week (part-time)

---

## Current Sprint (Phase 1, Week 1)

### This Week's Focus
- [x] Fix post-call summary modal data display
- [ ] Build call details page with recording playback
- [ ] Implement call history list
- [ ] Add basic contact management
- [ ] Set up inbound calling
- [ ] Add SMS messaging capability

### Blockers
- None currently

### Notes
- Post-call modal now working correctly with all data displaying
- Using query parameters for call details page routing (Twilio Serverless limitation)
- Focusing on call details page next

---

## Key Decisions Made

### Technical Architecture
- ✅ Use Twilio Serverless for MVP (migrate later in Phase 6)
- ✅ Supabase for user management (Phase 2)
- ✅ Twilio Conversational Intelligence for AI features (Phase 3)
- ✅ Cloud-hosted (not self-hosted)
- ✅ Query parameters for routing (vs path parameters due to Twilio limits)

### Business Strategy
- ✅ Target: Small businesses (sales & support)
- ✅ Self-service initially, direct sales later
- ✅ Flat-fee pricing model with add-ons
- ✅ Solo founder, part-time development
- ✅ No budget currently (bootstrap)

---

## Resources & Links

- [Twilio Console](https://www.twilio.com/console)
- [Twilio Conversational Intelligence Docs](https://www.twilio.com/docs/voice/intelligence)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Billing Docs](https://stripe.com/docs/billing)

---

## Version History

- **v0.1** (2025-10-08): Initial roadmap created, Phase 1 in progress
