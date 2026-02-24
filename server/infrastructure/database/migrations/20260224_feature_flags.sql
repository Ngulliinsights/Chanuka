-- ============================================================================
-- FEATURE FLAGS MIGRATION
-- ============================================================================
-- Creates tables for feature flag management, evaluation tracking, and metrics

-- ============================================================================
-- FEATURE FLAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Rollout configuration
  rollout_percentage INTEGER NOT NULL DEFAULT 0,
  
  -- User targeting (JSONB)
  user_targeting JSONB,
  
  -- A/B testing configuration (JSONB)
  ab_test_config JSONB,
  
  -- Dependencies (JSONB array)
  dependencies JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  metadata JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID,
  
  -- Constraints
  CONSTRAINT feature_flags_name_unique UNIQUE (name),
  CONSTRAINT feature_flags_rollout_percentage_check CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled 
  ON feature_flags (enabled, name) 
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_feature_flags_rollout 
  ON feature_flags (rollout_percentage, enabled);

-- ============================================================================
-- FEATURE FLAG EVALUATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flag_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id UUID,
  
  -- Evaluation result
  enabled BOOLEAN NOT NULL,
  variant VARCHAR(50),
  
  -- Context
  evaluation_context JSONB,
  
  -- Timestamp
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_flag_user 
  ON feature_flag_evaluations (flag_id, user_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_flag_time 
  ON feature_flag_evaluations (flag_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_variant 
  ON feature_flag_evaluations (flag_id, variant, evaluated_at DESC) 
  WHERE variant IS NOT NULL;

-- ============================================================================
-- FEATURE FLAG METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flag_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  
  -- Metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  enabled_requests INTEGER NOT NULL DEFAULT 0,
  disabled_requests INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  
  -- Performance
  avg_response_time NUMERIC(10, 2),
  
  -- Time window
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT feature_flag_metrics_flag_window_unique UNIQUE (flag_id, window_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flag_metrics_flag_time 
  ON feature_flag_metrics (flag_id, window_start DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE feature_flags IS 'Feature flag configurations for gradual rollouts and A/B testing';
COMMENT ON TABLE feature_flag_evaluations IS 'Tracks feature flag evaluations for analytics';
COMMENT ON TABLE feature_flag_metrics IS 'Aggregated metrics for feature flag performance';

COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Percentage of users who see the feature (0-100)';
COMMENT ON COLUMN feature_flags.user_targeting IS 'User targeting rules (include/exclude lists, attributes)';
COMMENT ON COLUMN feature_flags.ab_test_config IS 'A/B test configuration (variants, distribution, metrics)';
COMMENT ON COLUMN feature_flags.dependencies IS 'Array of feature flag names this flag depends on';

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- Insert default feature flags for strategic integration features
INSERT INTO feature_flags (name, description, enabled, rollout_percentage) VALUES
  ('pretext_detection', 'Pretext detection feature for trojan bill analysis', false, 0),
  ('recommendation_engine', 'Personalized recommendation engine', false, 0),
  ('argument_intelligence', 'Argument clustering and sentiment analysis', false, 0),
  ('constitutional_intelligence', 'Constitutional analysis and rights impact assessment', false, 0),
  ('ussd_access', 'USSD access for feature phones', false, 0),
  ('advocacy_coordination', 'Campaign management and advocacy coordination', false, 0),
  ('government_data_sync', 'Real-time government data synchronization', false, 0),
  ('graph_database', 'Graph database analytics and network visualization', false, 0),
  ('ml_predictions', 'ML-powered predictions and insights', false, 0),
  ('market_intelligence', 'Market intelligence and economic impact analysis', false, 0)
ON CONFLICT (name) DO NOTHING;
