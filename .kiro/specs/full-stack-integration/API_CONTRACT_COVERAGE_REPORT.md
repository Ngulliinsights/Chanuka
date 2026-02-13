================================================================================
API CONTRACT COVERAGE VERIFICATION REPORT
================================================================================

SUMMARY
--------------------------------------------------------------------------------
Total Endpoints: 332
Endpoints with Contracts: 162 (49%)
Total Contracts: 7
Contracts with Validation: 7
Contracts with Tests: 3

ENDPOINTS WITHOUT CONTRACTS
--------------------------------------------------------------------------------
❌ POST /monitoring/start
   File: server\routes\regulatory-monitoring.ts:80
❌ POST /monitoring/stop
   File: server\routes\regulatory-monitoring.ts:103
❌ GET /impact/:regulationId
   File: server\routes\regulatory-monitoring.ts:130
❌ GET /impact/batch
   File: server\routes\regulatory-monitoring.ts:173
❌ GET /opportunities/:regulationId
   File: server\routes\regulatory-monitoring.ts:235
❌ GET /opportunities/batch
   File: server\routes\regulatory-monitoring.ts:280
❌ POST /alerts
   File: server\routes\regulatory-monitoring.ts:341
❌ GET /health
   File: server\infrastructure\observability\external-api-management.ts:123
❌ GET /health/:source
   File: server\infrastructure\observability\external-api-management.ts:148
❌ GET /usage/:source
   File: server\infrastructure\observability\external-api-management.ts:170
❌ GET /cache/stats
   File: server\infrastructure\observability\external-api-management.ts:188
❌ DELETE /cache
   File: server\infrastructure\observability\external-api-management.ts:199
❌ GET /quota
   File: server\infrastructure\observability\external-api-management.ts:217
❌ GET /costs
   File: server\infrastructure\observability\external-api-management.ts:241
❌ GET /performance
   File: server\infrastructure\observability\external-api-management.ts:276
❌ GET /errors
   File: server\infrastructure\observability\external-api-management.ts:327
❌ POST /test/:source
   File: server\infrastructure\observability\external-api-management.ts:366
❌ GET /dashboard
   File: server\infrastructure\observability\external-api-management.ts:396
❌ GET /
   File: server\infrastructure\notifications\notification-routes.ts:50
❌ POST /
   File: server\infrastructure\notifications\notification-routes.ts:92
❌ DELETE /:id
   File: server\infrastructure\notifications\notification-routes.ts:169
❌ GET /dashboard
   File: server\infrastructure\migration\migration-api.ts:24
❌ GET /status
   File: server\infrastructure\migration\migration-api.ts:45
❌ GET /phases/:phaseId
   File: server\infrastructure\migration\migration-api.ts:73
❌ GET /components/:componentName
   File: server\infrastructure\migration\migration-api.ts:109
❌ GET /feature-flags
   File: server\infrastructure\migration\migration-api.ts:138
❌ PUT /feature-flags/:flagName
   File: server\infrastructure\migration\migration-api.ts:166
❌ POST /rollback/:componentName
   File: server\infrastructure\migration\migration-api.ts:215
❌ GET /rollbacks
   File: server\infrastructure\migration\migration-api.ts:251
❌ POST /validation/:componentName
   File: server\infrastructure\migration\migration-api.ts:273
❌ GET /alerts
   File: server\infrastructure\migration\migration-api.ts:314
❌ POST /alerts/:alertId/resolve
   File: server\infrastructure\migration\migration-api.ts:344
❌ POST /start
   File: server\infrastructure\migration\migration-api.ts:366
❌ POST /pause/:phaseId
   File: server\infrastructure\migration\migration-api.ts:388
❌ POST /resume/:phaseId
   File: server\infrastructure\migration\migration-api.ts:418
❌ POST /emergency-stop
   File: server\infrastructure\migration\migration-api.ts:448
❌ GET /
   File: server\features\sponsors\sponsors.routes.ts:59
❌ GET /:id
   File: server\features\sponsors\sponsors.routes.ts:102
❌ POST /
   File: server\features\sponsors\sponsors.routes.ts:135
❌ PUT /:id
   File: server\features\sponsors\sponsors.routes.ts:175
❌ DELETE /:id
   File: server\features\sponsors\sponsors.routes.ts:216
❌ GET /:id/affiliations
   File: server\features\sponsors\sponsors.routes.ts:253
❌ POST /:id/affiliations
   File: server\features\sponsors\sponsors.routes.ts:277
❌ PUT /:id/affiliations/:affiliationId
   File: server\features\sponsors\sponsors.routes.ts:319
❌ DELETE /:id/affiliations/:affiliationId
   File: server\features\sponsors\sponsors.routes.ts:364
❌ GET /:id/transparency
   File: server\features\sponsors\sponsors.routes.ts:407
❌ POST /:id/transparency
   File: server\features\sponsors\sponsors.routes.ts:430
❌ PUT /:id/transparency/:transparencyId
   File: server\features\sponsors\sponsors.routes.ts:471
❌ POST /:id/transparency/:transparencyId/verify
   File: server\features\sponsors\sponsors.routes.ts:515
❌ GET /:id/conflicts
   File: server\features\sponsors\sponsors.routes.ts:552
❌ GET /:id/risk-profile
   File: server\features\sponsors\sponsors.routes.ts:575
❌ GET /:id/conflict-trends
   File: server\features\sponsors\sponsors.routes.ts:598
❌ GET /conflicts/all
   File: server\features\sponsors\sponsors.routes.ts:632
❌ GET /conflicts/network
   File: server\features\sponsors\sponsors.routes.ts:675
❌ GET /:id/sponsored-bills
   File: server\features\sponsors\sponsors.routes.ts:703
❌ GET /meta/parties
   File: server\features\sponsors\sponsors.routes.ts:744
❌ GET /meta/constituencies
   File: server\features\sponsors\sponsors.routes.ts:765
❌ GET /meta/stats
   File: server\features\sponsors\sponsors.routes.ts:786
❌ GET /
   File: server\features\search\SearchController.ts:36
❌ GET /personalized
   File: server\features\recommendation\RecommendationController.ts:13
❌ GET /similar/:bill_id
   File: server\features\recommendation\RecommendationController.ts:20
❌ GET /trending
   File: server\features\recommendation\RecommendationController.ts:26
❌ GET /collaborative
   File: server\features\recommendation\RecommendationController.ts:33
❌ POST /track-engagement
   File: server\features\recommendation\RecommendationController.ts:40
❌ GET /preferences
   File: server\features\privacy\privacy-routes.ts:99
❌ PATCH /preferences
   File: server\features\privacy\privacy-routes.ts:121
❌ POST /data-export
   File: server\features\privacy\privacy-routes.ts:167
❌ POST /data-deletion
   File: server\features\privacy\privacy-routes.ts:230
❌ GET /gdpr-report
   File: server\features\privacy\privacy-routes.ts:282
❌ GET /retention-policies
   File: server\features\privacy\privacy-routes.ts:318
❌ POST /cleanup
   File: server\features\privacy\privacy-routes.ts:340
❌ PATCH /retention-policies
   File: server\features\privacy\privacy-routes.ts:386
❌ GET /dashboard
   File: server\features\privacy\privacy-routes.ts:449
❌ POST /withdraw-consent
   File: server\features\privacy\privacy-routes.ts:490
❌ GET /
   File: server\features\notifications\notification-router.ts:55
❌ POST /
   File: server\features\notifications\notification-router.ts:104
❌ DELETE /:id
   File: server\features\notifications\notification-router.ts:310
❌ GET /report
   File: server\features\coverage\coverage-routes.ts:10
❌ GET /server
   File: server\features\coverage\coverage-routes.ts:62
❌ GET /client
   File: server\features\coverage\coverage-routes.ts:111
❌ GET /integration
   File: server\features\coverage\coverage-routes.ts:159
❌ GET /gaps
   File: server\features\coverage\coverage-routes.ts:207
❌ POST /analyze
   File: server\features\coverage\coverage-routes.ts:277
❌ POST /analyze
   File: server\features\constitutional-analysis\constitutional-analysis-router.ts:49
❌ GET /provisions/:articleNumber
   File: server\features\constitutional-analysis\constitutional-analysis-router.ts:237
❌ GET /expert-review/queue
   File: server\features\constitutional-analysis\constitutional-analysis-router.ts:341
❌ GET /statistics
   File: server\features\constitutional-analysis\constitutional-analysis-router.ts:376
❌ GET /health
   File: server\features\constitutional-analysis\constitutional-analysis-router.ts:434
❌ GET /comments/:id/replies
   File: server\features\community\community.ts:176
❌ GET /comments/:bill_id/stats
   File: server\features\community\community.ts:322
❌ GET /comments/:bill_id/trending
   File: server\features\community\community.ts:357
❌ POST /comments/:id/vote
   File: server\features\community\community.ts:398
❌ POST /comments/:id/flag
   File: server\features\community\community.ts:460
❌ POST /comments/:id/highlight
   File: server\features\community\community.ts:526
❌ POST /polls
   File: server\features\community\community.ts:552
❌ POST /comments/:id/poll-vote
   File: server\features\community\community.ts:592
❌ GET /participation/stats
   File: server\features\community\community.ts:634
❌ GET /engagement/recent
   File: server\features\community\community.ts:684
❌ GET /:id
   File: server\features\bills\BILLS_MIGRATION_ADAPTER.ts:103
❌ GET /:id
   File: server\features\bills\BILLS_MIGRATION_ADAPTER.ts:120
❌ GET /
   File: server\features\bills\bills-router.ts:65
❌ GET /:id
   File: server\features\bills\bills-router.ts:147
❌ POST /
   File: server\features\bills\bills-router.ts:186
❌ GET /
   File: server\features\bills\bills-router-migrated.ts:86
❌ GET /:id
   File: server\features\bills\bills-router-migrated.ts:149
❌ POST /
   File: server\features\bills\bills-router-migrated.ts:184
❌ POST /process
   File: server\features\argument-intelligence\routes.ts:12
❌ POST /cluster/:billId
   File: server\features\argument-intelligence\routes.ts:62
❌ POST /process-comment
   File: server\features\argument-intelligence\argument-intelligence-router.ts:55
❌ POST /extract-structure
   File: server\features\argument-intelligence\argument-intelligence-router.ts:100
❌ POST /synthesize-bill/:bill_id
   File: server\features\argument-intelligence\argument-intelligence-router.ts:154
❌ GET /argument-map/:bill_id
   File: server\features\argument-intelligence\argument-intelligence-router.ts:184
❌ POST /cluster-arguments
   File: server\features\argument-intelligence\argument-intelligence-router.ts:218
❌ POST /find-similar
   File: server\features\argument-intelligence\argument-intelligence-router.ts:253
❌ POST /find-coalitions
   File: server\features\argument-intelligence\argument-intelligence-router.ts:300
❌ GET /coalition-opportunities/:bill_id
   File: server\features\argument-intelligence\argument-intelligence-router.ts:338
❌ POST /validate-evidence
   File: server\features\argument-intelligence\argument-intelligence-router.ts:380
❌ GET /evidence-assessment/:bill_id
   File: server\features\argument-intelligence\argument-intelligence-router.ts:415
❌ POST /generate-brief
   File: server\features\argument-intelligence\argument-intelligence-router.ts:453
❌ POST /generate-public-summary
   File: server\features\argument-intelligence\argument-intelligence-router.ts:506
❌ POST /balance-voices
   File: server\features\argument-intelligence\argument-intelligence-router.ts:548
❌ POST /detect-astroturfing
   File: server\features\argument-intelligence\argument-intelligence-router.ts:587
❌ GET /arguments/:bill_id
   File: server\features\argument-intelligence\argument-intelligence-router.ts:629
❌ GET /statistics/:bill_id
   File: server\features\argument-intelligence\argument-intelligence-router.ts:727
❌ GET /briefs/:bill_id
   File: server\features\argument-intelligence\argument-intelligence-router.ts:759
❌ GET /brief/:briefId
   File: server\features\argument-intelligence\argument-intelligence-router.ts:793
❌ GET /health
   File: server\features\argument-intelligence\argument-intelligence-router.ts:832
❌ GET /bills/:bill_id/comprehensive
   File: server\features\analysis\analysis.routes.ts:18
❌ POST /bills/:bill_id/comprehensive/run
   File: server\features\analysis\analysis.routes.ts:71
❌ GET /bills/:bill_id/history
   File: server\features\analysis\analysis.routes.ts:143
❌ GET /health
   File: server\features\analysis\analysis.routes.ts:223
❌ POST /
   File: server\features\alert-preferences\unified-alert-routes.ts:117
❌ GET /
   File: server\features\alert-preferences\unified-alert-routes.ts:142
❌ GET /:preferenceId
   File: server\features\alert-preferences\unified-alert-routes.ts:165
❌ PATCH /:preferenceId
   File: server\features\alert-preferences\unified-alert-routes.ts:202
❌ DELETE /:preferenceId
   File: server\features\alert-preferences\unified-alert-routes.ts:229
❌ POST /:preferenceId/verify-channel
   File: server\features\alert-preferences\unified-alert-routes.ts:258
❌ POST /process-alert
   File: server\features\alert-preferences\unified-alert-routes.ts:310
❌ POST /:preferenceId/process-batch
   File: server\features\alert-preferences\unified-alert-routes.ts:341
❌ GET /logs/delivery
   File: server\features\alert-preferences\unified-alert-routes.ts:378
❌ GET /analytics/stats
   File: server\features\alert-preferences\unified-alert-routes.ts:407
❌ POST /test/filtering
   File: server\features\alert-preferences\unified-alert-routes.ts:432
❌ POST /:preferenceId/test-channel
   File: server\features\alert-preferences\unified-alert-routes.ts:512
❌ GET /service/stats
   File: server\features\alert-preferences\unified-alert-routes.ts:606
❌ GET /service/health
   File: server\features\alert-preferences\unified-alert-routes.ts:639
❌ POST /bulk/update
   File: server\features\alert-preferences\unified-alert-routes.ts:676
❌ POST /bulk/enable
   File: server\features\alert-preferences\unified-alert-routes.ts:730
❌ GET /backup/export
   File: server\features\alert-preferences\unified-alert-routes.ts:785
❌ POST /backup/import
   File: server\features\alert-preferences\unified-alert-routes.ts:812
❌ POST /register
   File: server\infrastructure\core\auth\auth.ts:49
❌ POST /verify-email
   File: server\infrastructure\core\auth\auth.ts:77
❌ POST /login
   File: server\infrastructure\core\auth\auth.ts:113
❌ POST /logout
   File: server\infrastructure\core\auth\auth.ts:155
❌ POST /refresh
   File: server\infrastructure\core\auth\auth.ts:175
❌ GET /verify
   File: server\infrastructure\core\auth\auth.ts:216
❌ POST /forgot-password
   File: server\infrastructure\core\auth\auth.ts:247
❌ POST /reset-password
   File: server\infrastructure\core\auth\auth.ts:282
❌ POST /2fa/setup
   File: server\infrastructure\core\auth\auth.ts:323
❌ POST /2fa/enable
   File: server\infrastructure\core\auth\auth.ts:369
❌ POST /2fa/disable
   File: server\infrastructure\core\auth\auth.ts:414
❌ POST /2fa/verify
   File: server\infrastructure\core\auth\auth.ts:459
❌ POST /2fa/login
   File: server\infrastructure\core\auth\auth.ts:504
❌ POST /oauth/callback
   File: server\infrastructure\core\auth\auth.ts:554
❌ GET /sessions
   File: server\infrastructure\core\auth\auth.ts:597
❌ DELETE /sessions/:sessionId
   File: server\infrastructure\core\auth\auth.ts:633
❌ DELETE /sessions
   File: server\infrastructure\core\auth\auth.ts:687
❌ POST /sessions/extend
   File: server\infrastructure\core\auth\auth.ts:730
❌ GET /security/events
   File: server\infrastructure\core\auth\auth.ts:769
❌ GET /security/suspicious-activity
   File: server\infrastructure\core\auth\auth.ts:806
❌ GET /:user_id
   File: server\features\users\application\profile.ts:570

CONTRACTS WITHOUT TESTS
--------------------------------------------------------------------------------
❌ search
   File: shared\types\api\contracts\search.contract.ts
   Missing: Test file for search
❌ notification
   File: shared\types\api\contracts\notification.contract.ts
   Missing: Test file for notification
❌ analytics
   File: shared\types\api\contracts\analytics.contract.ts
   Missing: Test file for analytics
❌ admin
   File: shared\types\api\contracts\admin.contract.ts
   Missing: Test file for admin

================================================================================
❌ VERIFICATION FAILED: Some contracts are missing coverage

Required actions:
  - Create contracts for 170 endpoints
  - Add tests for 4 contracts
================================================================================