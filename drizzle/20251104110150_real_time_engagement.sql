-- Live Engagement Metrics
CREATE UNLOGGED TABLE engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- 'view', 'comment', 'vote', 'share', 'save'
  entity_type VARCHAR(50) NOT NULL, -- 'bill', 'comment', 'analysis'
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(255), -- Track anonymous sessions
  engagement_duration INTEGER, -- Seconds engaged
  engagement_depth VARCHAR(20), -- 'superficial', 'moderate', 'deep'
  event_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Partition by month for performance
CREATE TABLE engagement_events_2025_01 PARTITION OF engagement_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- Continue partitioning strategy...

CREATE INDEX idx_engagement_entity ON engagement_events(entity_type, entity_id);
CREATE INDEX idx_engagement_user ON engagement_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_engagement_time ON engagement_events(created_at);

CREATE UNLOGGED TABLE live_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(50) NOT NULL, -- 'bill_views', 'comment_count', 'sentiment_score'
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_metadata JSONB,
  calculated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- For TTL-based cleanup
  UNIQUE(metric_type, entity_type, entity_id)
);

CREATE INDEX idx_metrics_cache_entity ON live_metrics_cache(entity_type, entity_id);
CREATE INDEX idx_metrics_cache_expires ON live_metrics_cache(expires_at);

-- Gamification
CREATE TABLE civic_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_name VARCHAR(100) NOT NULL,
  achievement_category VARCHAR(50), -- 'participation', 'quality', 'impact', 'expertise'
  achievement_tier VARCHAR(20), -- 'bronze', 'silver', 'gold', 'platinum'
  points_value INTEGER NOT NULL,
  requirements JSONB NOT NULL, -- Criteria for earning achievement
  icon_url VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  achievement_id UUID REFERENCES civic_achievements(id) NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW(),
  earning_context JSONB, -- What action earned it
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE civic_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL UNIQUE,
  total_score INTEGER DEFAULT 0,
  participation_score INTEGER DEFAULT 0,
  quality_score INTEGER DEFAULT 0,
  impact_score INTEGER DEFAULT 0,
  expertise_score INTEGER DEFAULT 0,
  current_rank INTEGER,
  score_history JSONB, -- Track score over time
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_civic_scores_total ON civic_scores(total_score DESC);
CREATE INDEX idx_civic_scores_user ON civic_scores(user_id);

CREATE UNLOGGED TABLE real_time_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  notification_type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  priority VARCHAR(20) DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  is_delivered BOOLEAN DEFAULT false,
  delivery_channel VARCHAR(50),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  expires_at TIMESTAMP,
  notification_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON real_time_notifications(user_id);
CREATE INDEX idx_notifications_type ON real_time_notifications(notification_type);
CREATE INDEX idx_notifications_priority ON real_time_notifications(priority);
CREATE INDEX idx_notifications_read ON real_time_notifications(is_read);
CREATE INDEX idx_notifications_delivered ON real_time_notifications(is_delivered);
CREATE INDEX idx_notifications_created ON real_time_notifications(created_at);
CREATE INDEX idx_notifications_expires ON real_time_notifications(expires_at);

CREATE TABLE engagement_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_type VARCHAR(50) NOT NULL,
  category VARCHAR(50),
  user_id UUID REFERENCES users(id) NOT NULL,
  score DECIMAL(10,2) NOT NULL,
  rank INTEGER NOT NULL,
  previous_rank INTEGER,
  rank_change INTEGER,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leaderboards_type ON engagement_leaderboards(leaderboard_type);
CREATE INDEX idx_leaderboards_category ON engagement_leaderboards(category);
CREATE INDEX idx_leaderboards_user ON engagement_leaderboards(user_id);
CREATE INDEX idx_leaderboards_score ON engagement_leaderboards(score);
CREATE INDEX idx_leaderboards_rank ON engagement_leaderboards(rank);
CREATE INDEX idx_leaderboards_period ON engagement_leaderboards(period_start, period_end);
CREATE UNIQUE INDEX unique_user_leaderboard_period ON engagement_leaderboards(user_id, leaderboard_type, category, period_start);

CREATE TABLE engagement_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analytics_type VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(255),
  analytics_data JSONB NOT NULL,
  calculated_metrics JSONB,
  timeframe VARCHAR(20),
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_type ON engagement_analytics(analytics_type);
CREATE INDEX idx_analytics_entity ON engagement_analytics(entity_type, entity_id);
CREATE INDEX idx_analytics_user ON engagement_analytics(user_id);
CREATE INDEX idx_analytics_session ON engagement_analytics(session_id);
CREATE INDEX idx_analytics_timeframe ON engagement_analytics(timeframe);
CREATE INDEX idx_analytics_calculated ON engagement_analytics(calculated_at);