# SAFEGUARDS SYSTEM - VISUAL ARCHITECTURE & QUICK REFERENCE

## COMPONENT INTERACTION DIAGRAM

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          USER REQUEST FLOW                                  │
└──────────────────────────────────────────────────────────────────────────┬─┘
                                                                             │
                                                    ┌─────────────────────────▼─
                                                    │ SAFEGUARDS MIDDLEWARE
                                                    │ (All requests pass through)
                                                    │
                                                    ├─► Check Rate Limit
                                                    │   ├─ userId dimension
                                                    │   ├─ IP dimension
                                                    │   ├─ Device fingerprint
                                                    │   └─ Action type
                                                    │
                                                    ├─► 429 Too Many Requests?
                                                    │   └─► Block + Log
                                                    │
                                                    └─► Continue to Handler
                                                         │
        ┌────────────────────────────────────────────────▼──────────────────┐
        │                    REQUEST HANDLER                                 │
        │  (Content creation, voting, comments, etc)                         │
        │                                                                    │
        ├─► Create in Database                                              │
        │                                                                    │
        ├─► Check if Should Queue for Moderation?                           │
        │   ├─ AI content analysis                                          │
        │   ├─ Pattern matching (slurs, misinformation)                     │
        │   ├─ User reputation (low rep = auto-queue)                       │
        │   └─ Community flags                                              │
        │                                                                    │
        └─► Queue Item Added to Moderation Pipeline                         │
             │                                                               │
             ├─► MODERATION QUEUE TABLE                                     │
             │   ├─ Status: pending                                         │
             │   ├─ Priority: calculated based on severity                  │
             │   ├─ Assigned to: unassigned (initially)                     │
             │   └─ SLA: hours based on priority level                      │
             │                                                               │
             ├─► MODERATOR REVIEW (Human step)                              │
             │   ├─ Read content + context                                  │
             │   ├─ View flags from community                               │
             │   └─ Make decision                                           │
             │                                                               │
             ├─► MODERATION DECISION RECORDED                               │
             │   ├─ Decision: approve/reject/warn/suspend/ban               │
             │   ├─ Reasoning: documented for transparency                  │
             │   ├─ Reputation: author penalty applied                      │
             │   └─ Status: resolved                                        │
             │                                                               │
             └─► APPEAL AVAILABLE                                           │
                 ├─ User can file appeal                                    │
                 ├─ Appeal goes to Review Board                             │
                 └─ Board can overturn decision                             │

            ┌──────────────────────────────────────────────────────────┐
            │              CIB DETECTION (Parallel)                     │
            │  Runs on every user action via background job            │
            │                                                           │
            ├─ Record behavior profile:                                │
            │  ├─ Posting time patterns                               │
            │  ├─ Content style signature                             │
            │  ├─ Device fingerprint                                  │
            │  ├─ IP geolocation                                      │
            │  └─ Interaction graph                                   │
            │                                                           │
            ├─ Detect anomalies:                                       │
            │  ├─ Same content from 10 users at exact time?            │
            │  ├─ All voting on same comment?                         │
            │  ├─ Same device jumping continents?                     │
            │  └─ New account with expert-level content?              │
            │                                                           │
            └─ Escalate to CIB_DETECTIONS table if confidence > 0.7    │
```

---

## DATABASE SCHEMA OVERVIEW

```
RATE LIMITING LAYER
├── rate_limits (tracking table)
│   ├─ PK: id
│   ├─ FK: user_id → users
│   ├─ user_id: UUID (nullable)
│   ├─ ip_address: VARCHAR
│   ├─ device_fingerprint: VARCHAR
│   ├─ action_type: ENUM [login, comment_post, vote, search...]
│   ├─ attempt_count: INTEGER
│   ├─ window_start: TIMESTAMP
│   ├─ is_blocked: BOOLEAN
│   ├─ blocked_until: TIMESTAMP
│   └─ Indexes: user+action+time, ip+action+time, fingerprint+action
│
└── rate_limit_config (policy table)
    ├─ PK: id
    ├─ action_type: ENUM (unique)
    ├─ default_limit: INTEGER
    ├─ verified_user_limit: INTEGER
    ├─ new_user_limit: INTEGER
    ├─ ussd_limit: INTEGER (accessibility)
    ├─ window_minutes: INTEGER
    └─ escalation_multiplier: DECIMAL

CONTENT MODERATION LAYER
├── content_flags (user reports)
│   ├─ PK: id
│   ├─ FK: flagger_user_id → users
│   ├─ FK: reviewed_by → users
│   ├─ content_type: VARCHAR (polymorphic)
│   ├─ content_id: UUID (polymorphic FK)
│   ├─ flag_reason: ENUM [hate_speech, tribal_slur, misinformation...]
│   ├─ confidence_level: DECIMAL (0-1)
│   ├─ is_reviewed: BOOLEAN
│   └─ was_correct: BOOLEAN (feedback)
│
├── moderation_queue (workflow)
│   ├─ PK: id
│   ├─ FK: content_type → content_flags
│   ├─ FK: assigned_to → users
│   ├─ trigger_reason: VARCHAR
│   ├─ flag_count: INTEGER
│   ├─ priority: INTEGER (1-5, lower = more urgent)
│   ├─ status: VARCHAR [pending, assigned, resolved, appealed]
│   ├─ resolved_at: TIMESTAMP
│   └─ Unique: one queue item per content (except resolved)
│
├── moderation_decisions (outcomes)
│   ├─ PK: id
│   ├─ FK: queue_item_id → moderation_queue
│   ├─ FK: moderator_id → users
│   ├─ FK: user_affected → users
│   ├─ decision: ENUM [approve, reject, warn, suspend, ban...]
│   ├─ reason: TEXT (transparent reasoning)
│   ├─ reputation_penalty: DECIMAL
│   ├─ suspension_hours: INTEGER
│   └─ created_at: TIMESTAMP
│
├── moderation_appeals (user recourse)
│   ├─ PK: id
│   ├─ FK: decision_id → moderation_decisions
│   ├─ FK: appellant_user_id → users
│   ├─ FK: assigned_to_board_member → users
│   ├─ appeal_reason: TEXT
│   ├─ appeal_deadline: TIMESTAMP
│   ├─ board_decision: ENUM
│   ├─ decision_reason: TEXT
│   └─ is_public: BOOLEAN
│
└── expert_moderator_eligibility (quality control)
    ├─ PK: id
    ├─ FK: expert_id → expert_credentials
    ├─ can_moderate_content: BOOLEAN
    ├─ moderation_domains: JSONB ['legal', 'policy', 'health']
    ├─ is_suspended: BOOLEAN
    ├─ moderation_quality_score: DECIMAL
    └─ max_overturn_rate: DECIMAL (auto-suspend trigger)

BEHAVIORAL ANALYTICS LAYER
├── cib_detections (confirmed coordination)
│   ├─ PK: id
│   ├─ FK: investigated_by → users
│   ├─ pattern_type: ENUM [temporal_clustering, content_similarity...]
│   ├─ confidence_score: DECIMAL (0-1)
│   ├─ suspected_accounts: JSONB [user_ids]
│   ├─ shared_infrastructure: JSONB {ip_addresses, device_fingerprints}
│   ├─ status: VARCHAR [detected, investigating, confirmed, false_positive]
│   ├─ accounts_suspended: JSONB [user_ids]
│   ├─ public_disclosure: BOOLEAN
│   └─ disclosure_summary: TEXT (transparency)
│
├── behavioral_anomalies (pre-CIB detection)
│   ├─ PK: id
│   ├─ FK: escalated_to_cib → cib_detections
│   ├─ anomaly_type: VARCHAR
│   ├─ affected_users: JSONB
│   ├─ anomaly_score: DECIMAL (statistical deviation)
│   ├─ is_escalated: BOOLEAN
│   └─ false_positive: BOOLEAN
│
└── suspicious_activity_logs (real-time monitoring)
    ├─ PK: id
    ├─ FK: user_id → users
    ├─ activity_type: VARCHAR
    ├─ severity_level: INTEGER (1-5)
    ├─ auto_action_taken: VARCHAR
    ├─ requires_manual_review: BOOLEAN
    └─ created_at: TIMESTAMP (high cardinality, cleanup job)

REPUTATION & IDENTITY LAYER
├── reputation_scores (trust metrics)
│   ├─ PK: id
│   ├─ FK: user_id → users (unique)
│   ├─ total_score: DECIMAL
│   ├─ legal_expertise_score: DECIMAL
│   ├─ policy_expertise_score: DECIMAL
│   ├─ community_trust_score: DECIMAL
│   ├─ quality_contributions: INTEGER
│   ├─ successful_flags: INTEGER
│   ├─ false_flags: INTEGER
│   ├─ last_contribution_date: TIMESTAMP
│   ├─ decay_rate: DECIMAL (10% per month default)
│   ├─ last_decay_applied: TIMESTAMP
│   ├─ moderation_weight: DECIMAL
│   └─ can_submit_expert_analysis: BOOLEAN
│
├── reputation_history (transparent ledger)
│   ├─ PK: id
│   ├─ FK: user_id → users
│   ├─ change_amount: DECIMAL
│   ├─ score_before: DECIMAL
│   ├─ score_after: DECIMAL
│   ├─ source: ENUM [quality_comment, verified_factcheck, flag_penalty...]
│   ├─ source_entity_id: UUID (comment_id, flag_id, etc)
│   ├─ is_decay: BOOLEAN (was this from inactivity?)
│   └─ created_at: TIMESTAMP
│
├── identity_verification (Kenya-specific IPRS integration)
│   ├─ PK: id
│   ├─ FK: user_id → users (unique)
│   ├─ verification_method: ENUM [huduma_number, phone_otp, email...]
│   ├─ huduma_number_hash: VARCHAR (SHA256, hashed for privacy)
│   ├─ iprs_verification_status: ENUM [pending, verified, failed...]
│   ├─ iprs_reference_number: VARCHAR (transaction ID)
│   ├─ iprs_expiry_date: TIMESTAMP (IDs expire)
│   ├─ verification_level: INTEGER (0-4)
│   ├─ requires_manual_review: BOOLEAN
│   └─ flagged_for_suspicious_activity: BOOLEAN
│
└── device_fingerprints (device tracking for anomalies)
    ├─ PK: id
    ├─ FK: user_id → users (nullable, for unauth users)
    ├─ fingerprint_hash: VARCHAR (not components, for privacy)
    ├─ user_agent: TEXT
    ├─ screen_resolution: VARCHAR
    ├─ timezone: VARCHAR
    ├─ platform: VARCHAR
    ├─ ip_address: VARCHAR
    ├─ geolocation: JSONB {country, county, city}
    ├─ first_seen: TIMESTAMP
    ├─ last_seen: TIMESTAMP
    ├─ times_seen: INTEGER
    ├─ is_trusted: BOOLEAN
    ├─ is_suspicious: BOOLEAN
    └─ suspicion_reason: TEXT
```

---

## BACKGROUND JOBS EXECUTION TIMELINE

```
DAILY SCHEDULE
├─ 12:00 AM  → Reputation Decay Job
│             └─ Apply 10% decay to inactive users
│             └─ Record in reputation_history for transparency
│
├─ 01:00 AM  → Identity Verification Expiry Check
│             └─ Find IPRS verifications expiring in 30 days
│             └─ Send notifications to users
│
├─ 02:00 AM  → Rate Limit Cleanup
│             └─ Delete expired rate limit records (>30 days)
│             └─ Keep critical logs for audit
│
├─ 04:00 AM  → Device Fingerprint Audit (WEEKLY MONDAY)
│             └─ Check for dormant device reactivation
│             └─ Detect geolocation anomalies
│
├─ 05:00 AM  → Compliance Audit (WEEKLY SUNDAY)
│             └─ Generate safeguard metrics for transparency
│             └─ Make public if enabled
│
├─ 03:00 AM  → Suspicious Activity Cleanup (WEEKLY SUNDAY)
│             └─ Archive logs older than 90 days
│             └─ Keep high severity for longer
│
EVERY 6 HOURS
├─ 12:00, 06:00, 12:00, 18:00
│  → Moderation SLA Monitoring
│    └─ Find overdue items (past deadline)
│    └─ Alert managers
│    └─ Escalate if >24 hours late
│
EVERY 8 HOURS
├─ 00:00, 08:00, 16:00
│  → CIB Detection Validation
│    └─ Auto-confirm high confidence (>85%)
│    └─ Mark false positives (<30%)
│    └─ Trigger mitigation for confirmed patterns
│
TWICE DAILY
├─ 06:00 AM, 06:00 PM
│  → Behavioral Anomaly Analysis
│    └─ Analyze 24-hour activity patterns
│    └─ Detect concentration spikes
│    └─ Escalate to CIB if pattern emerges
```

---

## POLICY EXAMPLES

### Rate Limiting Policy
```
ACTION: comment_post
├─ Default users: 10 comments/hour
├─ New users (0-7 days): 5 comments/hour
├─ Verified users: 20 comments/hour
├─ USSD users: 10 comments/hour (more lenient for accessibility)
└─ Block escalation: 1 hour → 2 hours → 4 hours → 8 hours → 24 hours (max)

ACTION: login_attempt
├─ Default: 5 attempts/hour
├─ Verified: 10 attempts/hour
└─ Block: 1 hour (prevents brute force)

EMERGENCY MODE ACTIVE:
└─ Multiply all limits by 0.5 (50% of normal)
   ├─ Moderation priority boost: +1 to all priorities
   ├─ Auto-flag all content: true
   └─ Lock new account creation: true
```

### Moderation Priority
```
PRIORITY 1 (Critical - 1 hour SLA)
├─ Ethnic slurs / Tribal slurs
├─ Death threats / Imminent violence
├─ Child safety concerns
└─ Moderation: REMOVE + SUSPEND + ESCALATE TO BOARD

PRIORITY 2 (High - 4 hour SLA)
├─ Hate speech (non-imminent)
├─ Misinformation (proven false)
├─ Harassment / Doxxing
└─ Moderation: REMOVE + WARN or SUSPEND

PRIORITY 3 (Medium - 8 hour SLA)
├─ Spam / Duplicate content
├─ Off-topic but not harmful
├─ Low-quality contributions
└─ Moderation: WARN or REMOVE

PRIORITY 4 (Low - 24 hour SLA)
├─ Minor formatting issues
├─ Questionable content (needs review)
└─ Moderation: APPROVE or REQUEST EDIT

PRIORITY 5 (Backlog)
├─ Legitimate content (should be approved)
└─ Review when resources available
```

### Reputation System
```
REPUTATION GAINS
├─ Quality comment (+5 points)
├─ Verified fact-check (+10 points)
├─ Expert analysis (+15 points)
├─ Successful flag (+3 points per overturn)
└─ Community validation (+2 points)

REPUTATION PENALTIES
├─ False flag (-5 points)
├─ Content removed (-10 points)
├─ Moderation warning (-15 points)
└─ Account suspension (-50 points)

REPUTATION DECAY
├─ 10% per month of inactivity
├─ Minimum score: 0 (non-negative)
├─ Applied automatically via daily job
└─ Prevents reputation hoarding

REPUTATION UNLOCKS
├─ Score ≥10: Can flag content
├─ Score ≥25: Votes count heavier
├─ Score ≥50: Can submit expert analysis
├─ Score ≥75: Moderator eligibility
└─ Score <5: Content auto-quarantined for review
```

---

## SERVICE METHOD QUICK REFERENCE

### RateLimitService
```typescript
await rateLimitService.checkRateLimit(context)
  → {allowed: boolean, remainingAttempts?: number, resetTime?: Date}

await rateLimitService.recordAttempt(context, success)
  → void

await rateLimitService.cleanupExpiredRecords()
  → number (records deleted)
```

### ModerationService
```typescript
await moderationService.queueForModeration(context)
  → {success: boolean, queueItemId?: string}

await moderationService.assignModerator(queueItemId, moderatorId)
  → boolean

await moderationService.makeDecision(context)
  → {success: boolean, decisionId?: string}

await moderationService.fileAppeal(context)
  → {success: boolean, appealId?: string}

await moderationService.updateModeratorPerformance(
  moderatorId, periodStart, periodEnd
)
  → void

await moderationService.markSlaViolations()
  → number (items marked)
```

### CIBDetectionService
```typescript
await cibDetectionService.detectSuspiciousPattern(context)
  → {success: boolean, patternId?: string}

await cibDetectionService.recordUserBehavior(context)
  → {success: boolean, profileId?: string}

await cibDetectionService.detectCoordinatedCluster(context)
  → {success: boolean, clusterId?: string}

await cibDetectionService.recordAnomalyEvent(context)
  → {success: boolean, anomalyId?: string}
```

---

## ENUM REFERENCE

### rateLimitActionEnum
```
'login_attempt'    // Auth attempts
'comment_post'     // New comments
'bill_vote'        // Voting
'flag_content'     // Content moderation
'expert_review'    // Expert submissions
'api_call'         // API endpoints
'search_query'     // Search operations
'profile_update'   // Profile changes
'message_send'     // Messaging
```

### moderationActionEnum
```
'approve'          // Content OK
'reject'           // Remove content
'flag_for_review'  // More info needed
'remove'           // Content violates
'warn_user'        // Warning issued
'suspend_user'     // Temp suspension
'ban_user'         // Permanent ban
'require_edit'     // User must edit
'escalate'         // To Ethics Board
```

### flagReasonEnum
```
'hate_speech'           // General hate
'tribal_slur'           // Kenya: Tribal slurs
'misinformation'        // False claims
'spam'                  // Spam content
'harassment'            // Personal attacks
'violence_threat'       // Violence threats
'personal_info'         // Doxxing
'off_topic'             // Wrong place
'duplicate_content'     // Already posted
'manipulation'          // Coordinated voting
'other'                 // Unspecified
```

### cibPatternEnum
```
'temporal_clustering'    // Same time posting
'content_similarity'     // Identical text
'network_isolation'      // Only interact each other
'single_issue_focus'     // Only one bill
'rapid_activation'       // Dormant then active
'coordinated_voting'     // Synchronized votes
'template_structure'     // Same sentence patterns
'shared_infrastructure'  // Same IP/device
```

---

## DEPLOYMENT READINESS MATRIX

| Component | Code Ready | Tested | Documented | Ready Deploy |
|-----------|-----------|--------|------------|--------------|
| Schema | ✅ | ✅ | ✅ | ✅ YES |
| Rate Limit Service | ✅ | 🔄 | ✅ | ✅ YES |
| Moderation Service | ✅ | 🔄 | ✅ | ✅ YES |
| CIB Detection Service | ✅ | 🔄 | ✅ | ✅ YES |
| Safeguard Jobs | ✅ | 📋 | ✅ | ✅ YES |
| Middleware Integration | 📋 | 📋 | ✅ | 🔄 PARTIAL |
| Admin UI | 📋 | 📋 | ✅ | 📋 DESIGN READY |
| Public Dashboard | 📋 | 📋 | ✅ | 📋 DESIGN READY |

Legend: ✅ = Done, 🔄 = In Progress, 📋 = Designed/Ready, ❌ = Not Started

---

## NEXT ACTIONS

1. **This Week**: Run database migration, test schema
2. **Next Week**: Deploy safeguard-jobs.ts to production
3. **Following Week**: Implement 6 high-priority refinement tables
4. **Month 2**: Create admin dashboard for safeguard management
5. **Month 3**: Launch public transparency dashboard

---

**For detailed implementation steps, see**: `SAFEGUARDS_INTEGRATION_GUIDE.md`  
**For architecture decisions, see**: `SAFEGUARDS_IMPLEMENTATION_COMPLETE.md`  
**For missing features, see**: `SAFEGUARDS_MISSING_FUNCTIONALITY.md`
