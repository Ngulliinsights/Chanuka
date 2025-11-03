// ============================================================================
// UNIVERSAL ACCESS SCHEMA TESTS
// ============================================================================
// Tests for accessibility features, offline capabilities, and inclusive design

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testDb, testPool, testUtils, generateTestData } from './setup';
import {
  accessibility_features,
  user_accessibility_preferences,
  offline_content_cache,
  offline_sync_queue,
  alternative_formats,
  assistive_technology_compatibility,
  accessibility_audits,
  accessibility_feedback,
  inclusive_design_metrics
} from '../universal_access';
import { bills, users } from '../foundation';
import { eq, and, or, sql, count, avg } from 'drizzle-orm';

describe('Universal Access Schema Tests', () => {
  beforeAll(async () => {
    await testUtils.setupDatabase();
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    await testUtils.clearSchema('foundation');
    await testUtils.clearSchema('universal_access');
  });

  describe('Accessibility Features', () => {
    it('should track accessibility features across the platform', async () => {
      const featureData = {
        feature_name: 'Screen Reader Compatibility',
        feature_category: 'assistive_technology',
        feature_type: 'screen_reader_support',
        implementation_details: {
          aria_labels: true,
          semantic_html: true,
          alt_text_required: true,
          focus_management: true,
          live_regions: true
        },
        target_disabilities: ['visual_impairment', 'blindness'],
        compatibility: {
          nvda: 'full',
          jaws: 'full',
          voiceover: 'full',
          talkback: 'partial'
        },
        testing_status: 'verified',
        test_results: {
          nvda_score: 95,
          jaws_score: 92,
          voiceover_score: 88,
          talkback_score: 75
        },
        implementation_date: new Date('2024-01-15'),
        last_updated: new Date('2024-03-01'),
        compliance_standards: ['WCAG_2.1_AA', 'Section_508'],
        user_impact_score: 9.2,
        is_active: true
      };

      const [feature] = await testDb
        .insert(accessibility_features)
        .values(featureData)
        .returning();

      expect(feature).toBeDefined();
      expect(feature.feature_name).toBe('Screen Reader Compatibility');
      expect(feature.feature_category).toBe('assistive_technology');
      expect(feature.target_disabilities).toContain('visual_impairment');
      expect(feature.compatibility.nvda).toBe('full');
      expect(feature.test_results.nvda_score).toBe(95);
      expect(feature.compliance_standards).toContain('WCAG_2.1_AA');
      expect(feature.user_impact_score).toBe(9.2);
      expect(feature.is_active).toBe(true);
    });

    it('should query features by category and target disability', async () => {
      const featuresData = [
        {
          feature_name: 'High Contrast Mode',
          feature_category: 'visual_accessibility',
          feature_type: 'contrast_enhancement',
          target_disabilities: ['low_vision', 'color_blindness'],
          is_active: true
        },
        {
          feature_name: 'Keyboard Navigation',
          feature_category: 'motor_accessibility',
          feature_type: 'keyboard_navigation',
          target_disabilities: ['motor_impairment'],
          is_active: true
        },
        {
          feature_name: 'Text Scaling',
          feature_category: 'visual_accessibility',
          feature_type: 'text_scaling',
          target_disabilities: ['low_vision', 'elderly'],
          is_active: true
        },
        {
          feature_name: 'Voice Control',
          feature_category: 'motor_accessibility',
          feature_type: 'voice_control',
          target_disabilities: ['motor_impairment', 'speech_impairment'],
          is_active: false
        }
      ];

      await testDb.insert(accessibility_features).values(featuresData);

      const visualAccessibilityFeatures = await testDb
        .select()
        .from(accessibility_features)
        .where(and(
          eq(accessibility_features.feature_category, 'visual_accessibility'),
          eq(accessibility_features.is_active, true)
        ));

      expect(visualAccessibilityFeatures).toHaveLength(2);
      expect(visualAccessibilityFeatures.every(f => 
        f.feature_category === 'visual_accessibility' && f.is_active === true
      )).toBe(true);

      const lowVisionFeatures = await testDb
        .select()
        .from(accessibility_features)
        .where(sql`${accessibility_features.target_disabilities} @> ARRAY['low_vision']::text[]`);

      expect(lowVisionFeatures).toHaveLength(2);
      expect(lowVisionFeatures.every(f => f.target_disabilities.includes('low_vision'))).toBe(true);
    });
  });

  describe('User Accessibility Preferences', () => {
    it('should store user accessibility preferences', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const preferencesData = {
        user_id: user.id,
        visual_preferences: {
          font_size: 18,
          high_contrast: true,
          color_scheme: 'dark',
          text_spacing: 'expanded',
          motion_reduction: true,
          focus_indicators: 'enhanced'
        },
        auditory_preferences: {
          audio_descriptions: true,
          transcripts_preferred: true,
          volume_preference: 0.8,
          speech_rate: 'normal'
        },
        motor_preferences: {
          keyboard_only: false,
          voice_control: false,
          switch_access: true,
          extended_timeouts: true,
          reduced_motion: true
        },
        cognitive_preferences: {
          simplified_interface: false,
          clear_navigation: true,
          error_prevention: true,
          consistent_layout: true,
          minimal_distractions: true
        },
        assistive_technology: {
          screen_reader: 'nvda',
          braille_display: false,
          eye_tracker: false,
          head_pointer: false,
          sip_and_puff: false
        },
        language_preferences: {
          primary_language: 'english',
          content_language: 'simple_english',
          sign_language: 'kenyan_sign_language'
        },
        notification_preferences: {
          visual_alerts: true,
          haptic_feedback: true,
          audio_alerts: false,
          persistent_alerts: true
        },
        custom_settings: {
          custom_css: 'user-defined-accessibility.css',
          custom_shortcuts: true,
          personalized_layout: true
        },
        created_at: new Date('2024-02-01'),
        updated_at: new Date('2024-03-15'),
        last_used_features: ['high_contrast', 'font_scaling', 'keyboard_navigation']
      };

      const [preferences] = await testDb
        .insert(user_accessibility_preferences)
        .values(preferencesData)
        .returning();

      expect(preferences.user_id).toBe(user.id);
      expect(preferences.visual_preferences.font_size).toBe(18);
      expect(preferences.visual_preferences.high_contrast).toBe(true);
      expect(preferences.auditory_preferences.audio_descriptions).toBe(true);
      expect(preferences.motor_preferences.switch_access).toBe(true);
      expect(preferences.cognitive_preferences.clear_navigation).toBe(true);
      expect(preferences.assistive_technology.screen_reader).toBe('nvda');
      expect(preferences.last_used_features).toContain('high_contrast');
    });
  });

  describe('Offline Content Cache', () => {
    it('should cache content for offline access', async () => {
      const testBill = generateTestData.bill();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const cacheData = {
        user_id: user.id,
        content_type: 'bill',
        content_id: bill.id,
        content_data: {
          bill_title: bill.title,
          bill_summary: bill.summary,
          full_text: bill.full_text,
          sponsor_info: 'Sponsor details...',
          status: bill.status,
          affected_counties: bill.affected_counties
        },
        metadata: {
          version: '1.0',
          cache_date: new Date('2024-03-15'),
          original_url: `/bills/${bill.id}`,
          content_hash: 'sha256:abc123...',
          size_bytes: 15000
        },
        sync_status: 'synced',
        last_accessed: new Date('2024-03-20'),
        access_count: 25,
        offline_modifications: [],
        priority_level: 'high',
        expiration_date: new Date('2024-06-15'),
        device_info: {
          device_type: 'mobile',
          operating_system: 'android',
          app_version: '2.1.0'
        }
      };

      const [cacheEntry] = await testDb
        .insert(offline_content_cache)
        .values(cacheData)
        .returning();

      expect(cacheEntry.user_id).toBe(user.id);
      expect(cacheEntry.content_type).toBe('bill');
      expect(cacheEntry.content_id).toBe(bill.id);
      expect(cacheEntry.content_data.bill_title).toBe(bill.title);
      expect(cacheEntry.metadata.version).toBe('1.0');
      expect(cacheEntry.sync_status).toBe('synced');
      expect(cacheEntry.access_count).toBe(25);
      expect(cacheEntry.priority_level).toBe('high');
    });

    it('should manage sync queue for offline modifications', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const syncData = {
        user_id: user.id,
        operation_type: 'comment_create',
        entity_type: 'bill',
        entity_id: 'bill-123',
        operation_data: {
          comment_text: 'This is my comment made offline',
          position: 'support',
          user_county: 'nairobi'
        },
        original_timestamp: new Date('2024-03-15T10:30:00Z'),
        queue_timestamp: new Date('2024-03-15T10:30:00Z'),
        sync_attempts: 0,
        last_attempt: null,
        sync_status: 'pending',
        error_message: null,
        conflict_resolution: null,
        device_info: {
          device_id: 'device-123',
          app_version: '2.1.0',
          offline_duration_hours: 48
        },
        priority: 'normal'
      };

      const [syncEntry] = await testDb
        .insert(offline_sync_queue)
        .values(syncData)
        .returning();

      expect(syncEntry.user_id).toBe(user.id);
      expect(syncEntry.operation_type).toBe('comment_create');
      expect(syncEntry.entity_type).toBe('bill');
      expect(syncEntry.operation_data.comment_text).toBe('This is my comment made offline');
      expect(syncEntry.sync_status).toBe('pending');
      expect(syncEntry.sync_attempts).toBe(0);
    });
  });

  describe('Alternative Formats', () => {
    it('should provide alternative formats for content', async () => {
      const testBill = generateTestData.bill();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const formatData = {
        content_type: 'bill',
        content_id: bill.id,
        format_type: 'audio',
        format_details: {
          audio_format: 'mp3',
          duration_minutes: 45,
          narrator: 'professional_voice_artist',
          quality: 'high',
          sample_rate: 44100
        },
        file_metadata: {
          file_size_mb: 25.5,
          file_hash: 'sha256:def456...',
          upload_date: new Date('2024-03-10'),
          version: '1.0'
        },
        accessibility_features: {
          adjustable_speed: true,
          chapter_markers: true,
          text_synchronization: true,
          multiple_voices: false
        },
        target_disabilities: ['visual_impairment', 'dyslexia', 'learning_disabilities'],
        generation_method: 'ai_text_to_speech',
        quality_score: 8.5,
        user_feedback: {
          average_rating: 4.2,
          total_ratings: 150,
          common_feedback: ['Clear narration', 'Good pace']
        },
        availability: 'public',
        download_url: '/api/bills/bill-123/audio',
        streaming_url: '/stream/bills/bill-123/audio',
        created_by: 'accessibility_system',
        created_at: new Date('2024-03-10'),
        last_updated: new Date('2024-03-15'),
        expiration_date: null,
        is_active: true
      };

      const [format] = await testDb
        .insert(alternative_formats)
        .values(formatData)
        .returning();

      expect(format.content_type).toBe('bill');
      expect(format.content_id).toBe(bill.id);
      expect(format.format_type).toBe('audio');
      expect(format.format_details.audio_format).toBe('mp3');
      expect(format.duration_minutes).toBe(45);
      expect(format.target_disabilities).toContain('visual_impairment');
      expect(format.quality_score).toBe(8.5);
      expect(format.user_feedback.average_rating).toBe(4.2);
      expect(format.is_active).toBe(true);
    });

    it('should support multiple format types', async () => {
      const testBill = generateTestData.bill();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const formatsData = [
        {
          content_type: 'bill',
          content_id: bill.id,
          format_type: 'braille',
          format_details: { braille_grade: 'grade_2', pages: 45 },
          target_disabilities: ['blindness'],
          is_active: true
        },
        {
          content_type: 'bill',
          content_id: bill.id,
          format_type: 'large_print',
          format_details: { font_size: 18, font_type: 'arial', pages: 25 },
          target_disabilities: ['low_vision', 'elderly'],
          is_active: true
        },
        {
          content_type: 'bill',
          content_id: bill.id,
          format_type: 'easy_read',
          format_details: { reading_level: 'grade_6', illustrations: true },
          target_disabilities: ['learning_disabilities', 'cognitive_impairment'],
          is_active: true
        },
        {
          content_type: 'bill',
          content_id: bill.id,
          format_type: 'sign_language_video',
          format_details: { language: 'kenyan_sign_language', duration: 30 },
          target_disabilities: ['hearing_impairment'],
          is_active: true
        }
      ];

      const insertedFormats = await testDb.insert(alternative_formats).values(formatsData).returning();

      expect(insertedFormats).toHaveLength(4);
      
      const billFormats = await testDb
        .select()
        .from(alternative_formats)
        .where(eq(alternative_formats.content_id, bill.id));

      expect(billFormats).toHaveLength(4);
      expect(billFormats.map(f => f.format_type)).toContain('braille');
      expect(billFormats.map(f => f.format_type)).toContain('large_print');
      expect(billFormats.map(f => f.format_type)).toContain('easy_read');
      expect(billFormats.map(f => f.format_type)).toContain('sign_language_video');
    });
  });

  describe('Assistive Technology Compatibility', () => {
    it('should track compatibility with assistive technologies', async () => {
      const compatibilityData = {
        technology_name: 'JAWS Screen Reader',
        technology_type: 'screen_reader',
        manufacturer: 'Freedom Scientific',
        version_tested: '2024.2402.2',
        platform: 'windows',
        browser_compatibility: {
          chrome: { version: '122+', status: 'compatible' },
          firefox: { version: '123+', status: 'compatible' },
          edge: { version: '122+', status: 'compatible' },
          safari: { version: 'N/A', status: 'not_tested' }
        },
        feature_support: {
          aria_labels: 'full',
          live_regions: 'full',
          keyboard_navigation: 'full',
          form_labels: 'full',
          heading_navigation: 'full',
          link_navigation: 'full',
          table_navigation: 'partial',
          image_descriptions: 'full'
        },
        known_issues: [
          'Tables with complex layouts may not be fully accessible',
          'Dynamic content updates require proper ARIA live regions'
        ],
        workarounds: [
          'Use simple table structures',
          'Implement ARIA live regions for dynamic content'
        ],
        testing_date: new Date('2024-03-01'),
        tester_credentials: 'CPACC Certified Professional',
        compatibility_score: 8.7,
        recommendation: 'recommended',
        last_updated: new Date('2024-03-15'),
        is_active: true
      };

      const [compatibility] = await testDb
        .insert(assistive_technology_compatibility)
        .values(compatibilityData)
        .returning();

      expect(compatibility.technology_name).toBe('JAWS Screen Reader');
      expect(compatibility.technology_type).toBe('screen_reader');
      expect(compatibility.browser_compatibility.chrome.status).toBe('compatible');
      expect(compatibility.feature_support.aria_labels).toBe('full');
      expect(compatibility.compatibility_score).toBe(8.7);
      expect(compatibility.recommendation).toBe('recommended');
    });

    it('should query compatibility by technology type and platform', async () => {
      const compatibilityData = [
        {
          technology_name: 'NVDA',
          technology_type: 'screen_reader',
          platform: 'windows',
          compatibility_score: 9.1,
          is_active: true
        },
        {
          technology_name: 'VoiceOver',
          technology_type: 'screen_reader',
          platform: 'macos',
          compatibility_score: 8.8,
          is_active: true
        },
        {
          technology_name: 'Dragon NaturallySpeaking',
          technology_type: 'voice_recognition',
          platform: 'windows',
          compatibility_score: 7.5,
          is_active: true
        },
        {
          technology_name: 'ZoomText',
          technology_type: 'magnification',
          platform: 'windows',
          compatibility_score: 8.2,
          is_active: true
        }
      ];

      await testDb.insert(assistive_technology_compatibility).values(compatibilityData);

      const screenReaders = await testDb
        .select()
        .from(assistive_technology_compatibility)
        .where(and(
          eq(assistive_technology_compatibility.technology_type, 'screen_reader'),
          eq(assistive_technology_compatibility.is_active, true)
        ));

      expect(screenReaders).toHaveLength(2);
      expect(screenReaders.every(c => c.technology_type === 'screen_reader')).toBe(true);

      const windowsTechnologies = await testDb
        .select()
        .from(assistive_technology_compatibility)
        .where(and(
          eq(assistive_technology_compatibility.platform, 'windows'),
          eq(assistive_technology_compatibility.is_active, true)
        ));

      expect(windowsTechnologies).toHaveLength(3);
    });
  });

  describe('Accessibility Audits', () => {
    it('should track accessibility audit results', async () => {
      const auditData = {
        audit_type: 'comprehensive_accessibility_review',
        scope: 'full_platform',
        audited_components: ['homepage', 'bill_pages', 'search', 'user_dashboard'],
        audit_methodology: 'WCAG_2.1_AA_compliance',
        auditor_info: {
          name: 'Jane Smith',
          credentials: 'CPACC, CPWA',
          organization: 'Accessibility Consulting Kenya',
          audit_date: new Date('2024-03-01')
        },
        findings: {
          total_issues: 45,
          critical_issues: 3,
          high_priority_issues: 12,
          medium_priority_issues: 20,
          low_priority_issues: 10
        },
        detailed_findings: [
          {
            component: 'bill_pages',
            issue_type: 'missing_alt_text',
            severity: 'high',
            description: 'Bill sponsor photos missing alt text',
            wcag_criterion: '1.1.1',
            impact_on_users: 'Screen reader users cannot identify sponsors'
          },
          {
            component: 'search',
            issue_type: 'keyboard_navigation',
            severity: 'critical',
            description: 'Search filters not accessible via keyboard',
            wcag_criterion: '2.1.1',
            impact_on_users: 'Keyboard-only users cannot filter search results'
          }
        ],
        recommendations: [
          'Add alt text to all images',
          'Implement keyboard navigation for all interactive elements',
          'Add ARIA labels to form controls'
        ],
        remediation_plan: {
          phase_1: { issues: 15, timeline: '2 weeks' },
          phase_2: { issues: 20, timeline: '4 weeks' },
          phase_3: { issues: 10, timeline: '6 weeks' }
        },
        overall_compliance_score: 72,
        compliance_level: 'partial',
        audit_report_url: '/reports/accessibility_audit_2024_03.pdf',
        next_audit_date: new Date('2024-09-01'),
        status: 'remediation_in_progress'
      };

      const [audit] = await testDb
        .insert(accessibility_audits)
        .values(auditData)
        .returning();

      expect(audit.audit_type).toBe('comprehensive_accessibility_review');
      expect(audit.scope).toBe('full_platform');
      expect(audit.findings.total_issues).toBe(45);
      expect(audit.findings.critical_issues).toBe(3);
      expect(audit.overall_compliance_score).toBe(72);
      expect(audit.compliance_level).toBe('partial');
      expect(audit.status).toBe('remediation_in_progress');
    });

    it('should track accessibility feedback from users', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const feedbackData = {
        user_id: user.id,
        feedback_type: 'barrier_report',
        page_url: '/bills/bill-123',
        component: 'bill_text_section',
        issue_category: 'screen_reader_compatibility',
        severity: 'high',
        description: 'The bill text is not properly structured with headings, making it difficult to navigate with a screen reader',
        expected_behavior: 'Bill should have proper heading structure (H1, H2, H3) for easy navigation',
        current_behavior: 'All text appears as paragraphs without proper heading hierarchy',
        assistive_technology_used: 'NVDA',
        browser: 'firefox',
        operating_system: 'windows',
        device_type: 'desktop',
        screenshots: ['screenshot1.png', 'screenshot2.png'],
        suggested_solution: 'Add proper heading tags to structure the bill content',
        user_contact_consent: true,
        follow_up_required: true,
        feedback_date: new Date('2024-03-15'),
        status: 'new',
        assigned_to: 'accessibility_team',
        priority: 'high'
      };

      const [feedback] = await testDb
        .insert(accessibility_feedback)
        .values(feedbackData)
        .returning();

      expect(feedback.user_id).toBe(user.id);
      expect(feedback.feedback_type).toBe('barrier_report');
      expect(feedback.issue_category).toBe('screen_reader_compatibility');
      expect(feedback.severity).toBe('high');
      expect(feedback.assistive_technology_used).toBe('NVDA');
      expect(feedback.status).toBe('new');
      expect(feedback.priority).toBe('high');
    });
  });

  describe('Inclusive Design Metrics', () => {
    it('should track inclusive design implementation metrics', async () => {
      const metricsData = {
        measurement_date: new Date('2024-03-15'),
        reporting_period: 'Q1_2024',
        user_diversity_metrics: {
          users_with_disabilities: 1250,
          disability_types: {
            visual_impairment: 350,
            hearing_impairment: 200,
            motor_impairment: 150,
            cognitive_impairment: 100,
            multiple_disabilities: 450
          },
          assistive_technology_usage: {
            screen_readers: 280,
            magnifiers: 120,
            voice_control: 85,
            switch_access: 45,
            braille_displays: 25
          }
        },
        accessibility_usage_metrics: {
          feature_usage_frequency: {
            high_contrast: 450,
            font_scaling: 320,
            keyboard_navigation: 280,
            audio_descriptions: 180,
            text_to_speech: 220
          },
          user_satisfaction_scores: {
            overall: 8.2,
            screen_reader_users: 7.8,
            keyboard_only_users: 8.5,
            low_vision_users: 8.1
          }
        },
        content_accessibility_metrics: {
          bills_with_alt_formats: 85,
          percentage_of_bills: 72,
          average_readability_score: 6.8,
          audio_format_availability: 68,
          easy_read_availability: 45,
          sign_language_availability: 12
        },
        technical_compliance_metrics: {
          wcag_compliance: {
            level_a: 98,
            level_aa: 85,
            level_aaa: 45
          },
          automated_test_score: 88,
          manual_audit_score: 82,
          assistive_tech_compatibility_score: 8.4
        },
        inclusive_design_score: 7.8,
        benchmark_comparison: {
          industry_average: 6.5,
          government_sector_average: 7.2,
          our_ranking: 'top_20_percent'
        },
        improvement_areas: [
          'Sign language video production',
          'Cognitive accessibility features',
          'Mobile accessibility'
        ],
        success_indicators: [
          'WCAG AA compliance achieved',
          'Alternative formats for 70% of content',
          'Positive user feedback'
        ],
        next_quarter_goals: [
          'Increase sign language content to 25%',
          'Improve cognitive accessibility features',
          'Launch mobile accessibility improvements'
        ]
      };

      const [metrics] = await testDb
        .insert(inclusive_design_metrics)
        .values(metricsData)
        .returning();

      expect(metrics.measurement_date).toEqual(new Date('2024-03-15'));
      expect(metrics.user_diversity_metrics.users_with_disabilities).toBe(1250);
      expect(metrics.user_diversity_metrics.disability_types.visual_impairment).toBe(350);
      expect(metrics.accessibility_usage_metrics.user_satisfaction_scores.overall).toBe(8.2);
      expect(metrics.content_accessibility_metrics.percentage_of_bills).toBe(72);
      expect(metrics.technical_compliance_metrics.wcag_compliance.level_aa).toBe(85);
      expect(metrics.inclusive_design_score).toBe(7.8);
      expect(metrics.benchmark_comparison.our_ranking).toBe('top_20_percent');
    });
  });

  describe('Complex Accessibility Analysis Queries', () => {
    it('should perform comprehensive accessibility analysis', async () => {
      // Create test data
      const testBill = generateTestData.bill();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      // Create accessibility features
      const featuresData = [
        {
          feature_name: 'Screen Reader Support',
          feature_category: 'assistive_technology',
          user_impact_score: 9.0,
          is_active: true
        },
        {
          feature_name: 'High Contrast Mode',
          feature_category: 'visual_accessibility',
          user_impact_score: 8.5,
          is_active: true
        },
        {
          feature_name: 'Keyboard Navigation',
          feature_category: 'motor_accessibility',
          user_impact_score: 8.8,
          is_active: true
        }
      ];
      const insertedFeatures = await testDb.insert(accessibility_features).values(featuresData).returning();

      // Create user preferences
      const preferencesData = {
        user_id: user.id,
        visual_preferences: { high_contrast: true, font_size: 18 },
        assistive_technology: { screen_reader: 'nvda' }
      };
      await testDb.insert(user_accessibility_preferences).values(preferencesData);

      // Create alternative formats
      const formatData = {
        content_type: 'bill',
        content_id: bill.id,
        format_type: 'audio',
        target_disabilities: ['visual_impairment'],
        quality_score: 8.5,
        is_active: true
      };
      await testDb.insert(alternative_formats).values(formatData);

      // Create accessibility feedback
      const feedbackData = {
        user_id: user.id,
        issue_category: 'screen_reader_compatibility',
        severity: 'high',
        status: 'resolved'
      };
      await testDb.insert(accessibility_feedback).values(feedbackData);

      // Complex query for comprehensive analysis
      const accessibilityAnalysis = await testDb
        .select({
          totalFeatures: count(accessibility_features.id),
          activeFeatures: count(sql`CASE WHEN ${accessibility_features.is_active} = true THEN 1 END`),
          avgImpactScore: avg(accessibility_features.user_impact_score),
          totalAlternativeFormats: count(alternative_formats.id),
          totalFeedback: count(accessibility_feedback.id),
          resolvedFeedback: count(sql`CASE WHEN ${accessibility_feedback.status} = 'resolved' THEN 1 END`),
          usersWithPreferences: count(user_accessibility_preferences.id)
        })
        .from(accessibility_features)
        .leftJoin(alternative_formats, eq(accessibility_features.id, alternative_formats.id))
        .leftJoin(accessibility_feedback, eq(accessibility_features.id, accessibility_feedback.id))
        .leftJoin(user_accessibility_preferences, eq(accessibility_features.id, user_accessibility_preferences.id))
        .where(eq(accessibility_features.is_active, true));

      expect(accessibilityAnalysis).toHaveLength(1);
      expect(parseInt(accessibilityAnalysis[0].totalFeatures.count as string)).toBe(3);
      expect(parseInt(accessibilityAnalysis[0].activeFeatures.count as string)).toBe(3);
      expect(parseFloat(accessibilityAnalysis[0].avgImpactScore.avg as string)).toBeGreaterThan(8.0);
    });
  });

  describe('Performance Tests', () => {
    it('should efficiently handle accessibility feature queries', async () => {
      // Create multiple accessibility features
      const featuresData = Array.from({ length: 100 }, (_, i) => ({
        feature_name: `Feature ${i}`,
        feature_category: i % 5 === 0 ? 'visual_accessibility' :
                         i % 5 === 1 ? 'auditory_accessibility' :
                         i % 5 === 2 ? 'motor_accessibility' :
                         i % 5 === 3 ? 'cognitive_accessibility' : 'assistive_technology',
        user_impact_score: Math.random() * 10,
        is_active: true
      }));

      const startTime = Date.now();
      await testDb.insert(accessibility_features).values(featuresData);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(5000); // Should insert 100 features quickly

      // Query performance test
      const queryStartTime = Date.now();
      const highImpactFeatures = await testDb
        .select()
        .from(accessibility_features)
        .where(and(
          eq(accessibility_features.feature_category, 'visual_accessibility'),
          sql`${accessibility_features.user_impact_score} > 8.0`
        ));
      const queryTime = Date.now() - queryStartTime;

      expect(queryTime).toBeLessThan(100); // Should query quickly with indexes
    });
  });
});