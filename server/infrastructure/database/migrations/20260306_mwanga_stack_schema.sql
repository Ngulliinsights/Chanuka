-- MWANGA Stack Database Schema
-- Migration for ML/AI infrastructure supporting zero-training-first architecture
-- Date: 2026-03-06

-- ============================================================================
-- ML Interaction Logs (for engagement model training)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ml_interactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'view', 'comment', 'share', 'vote', 'bookmark'
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Feature engineering fields
  topic_match_score FLOAT DEFAULT 0.0,
  hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day < 24),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week < 7),
  urgency_level INTEGER CHECK (urgency_level >= 0 AND urgency_level <= 5),
  content_length INTEGER,
  user_history_count INTEGER DEFAULT 0,
  trending_score FLOAT DEFAULT 0.0,
  
  -- Outcome
  engaged BOOLEAN NOT NULL, -- Did user take meaningful action?
  engagement_duration_seconds INTEGER,
  
  -- Metadata
  session_id VARCHAR(255),
  device_type VARCHAR(50),
  metadata JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes for fast querying during training
  INDEX idx_ml_interactions_user_id (user_id),
  INDEX idx_ml_interactions_bill_id (bill_id),
  INDEX idx_ml_interactions_timestamp (timestamp),
  INDEX idx_ml_interactions_engaged (engaged)
);

COMMENT ON TABLE ml_interactions IS 'Logs user interactions for engagement prediction model training';

-- ============================================================================
-- Conflict Graph Nodes (for NetworkX conflict detection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conflict_graph_nodes (
  id SERIAL PRIMARY KEY,
  node_type VARCHAR(50) NOT NULL, -- 'sponsor', 'company', 'industry', 'bill', 'person'
  entity_id VARCHAR(255) NOT NULL, -- External ID (MP ID, company registration, etc.)
  entity_name VARCHAR(500) NOT NULL,
  
  -- Node attributes
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_verified TIMESTAMP,
  
  -- Unique constraint on type + entity_id
  UNIQUE(node_type, entity_id),
  
  -- Indexes
  INDEX idx_conflict_nodes_type (node_type),
  INDEX idx_conflict_nodes_entity_id (entity_id),
  INDEX idx_conflict_nodes_name (entity_name)
);

COMMENT ON TABLE conflict_graph_nodes IS 'Nodes in the conflict-of-interest relationship graph';

-- ============================================================================
-- Conflict Graph Edges (relationships between nodes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conflict_graph_edges (
  id SERIAL PRIMARY KEY,
  source_node_id INTEGER NOT NULL REFERENCES conflict_graph_nodes(id) ON DELETE CASCADE,
  target_node_id INTEGER NOT NULL REFERENCES conflict_graph_nodes(id) ON DELETE CASCADE,
  
  relationship_type VARCHAR(100) NOT NULL, -- 'owns', 'employed_by', 'sponsors', 'regulates', 'benefits_from'
  
  -- Relationship strength and confidence
  strength FLOAT DEFAULT 1.0 CHECK (strength >= 0.0 AND strength <= 1.0),
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  
  -- Source of relationship data
  source_document VARCHAR(500), -- e.g., "Financial Disclosure 2025"
  source_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  
  -- Temporal validity
  valid_from DATE,
  valid_until DATE,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate edges
  UNIQUE(source_node_id, target_node_id, relationship_type),
  
  -- Indexes for fast graph traversal
  INDEX idx_conflict_edges_source (source_node_id),
  INDEX idx_conflict_edges_target (target_node_id),
  INDEX idx_conflict_edges_type (relationship_type),
  INDEX idx_conflict_edges_both (source_node_id, target_node_id)
);

COMMENT ON TABLE conflict_graph_edges IS 'Edges (relationships) in the conflict-of-interest graph';

-- ============================================================================
-- Vector Embeddings (optional - if using pgvector instead of ChromaDB)
-- ============================================================================

-- Note: Requires pgvector extension
-- CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS vector_embeddings (
  id SERIAL PRIMARY KEY,
  document_type VARCHAR(50) NOT NULL, -- 'constitution', 'precedent', 'bill', 'law'
  document_id VARCHAR(255) NOT NULL,
  
  -- Document content
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  
  -- Vector embedding (384 dimensions for all-MiniLM-L6-v2)
  -- Uncomment if using pgvector:
  -- embedding vector(384) NOT NULL,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Source information
  source_title VARCHAR(500),
  source_url TEXT,
  source_section VARCHAR(255), -- e.g., "Article 43(1)(a)"
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_vector_embeddings_type (document_type),
  INDEX idx_vector_embeddings_doc_id (document_id),
  UNIQUE(document_type, document_id, chunk_index)
  
  -- Vector similarity index (if using pgvector):
  -- INDEX idx_vector_embeddings_embedding ON vector_embeddings USING ivfflat (embedding vector_cosine_ops)
);

COMMENT ON TABLE vector_embeddings IS 'Vector embeddings for semantic search (alternative to ChromaDB)';

-- ============================================================================
-- Sentiment Analysis Cache (to avoid re-analyzing same text)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sentiment_cache (
  id SERIAL PRIMARY KEY,
  text_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of input text
  
  -- Sentiment results
  sentiment VARCHAR(20) NOT NULL, -- 'positive', 'negative', 'neutral'
  confidence FLOAT NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  scores JSONB NOT NULL, -- {positive: 0.1, neutral: 0.2, negative: 0.7}
  
  -- Analysis metadata
  tier_used VARCHAR(20) NOT NULL, -- 'vader', 'roberta', 'ollama'
  language VARCHAR(10), -- 'en', 'sw', 'mixed'
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMP NOT NULL DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  
  -- Indexes
  INDEX idx_sentiment_cache_hash (text_hash),
  INDEX idx_sentiment_cache_created (created_at)
);

COMMENT ON TABLE sentiment_cache IS 'Cache for sentiment analysis results to avoid redundant processing';

-- ============================================================================
-- Constitutional Analysis Cache
-- ============================================================================

CREATE TABLE IF NOT EXISTS constitutional_analysis_cache (
  id SERIAL PRIMARY KEY,
  bill_section_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of bill section
  
  -- Analysis results
  relevant_articles JSONB NOT NULL, -- Array of {article: "43(1)(a)", similarity: 0.95, text: "..."}
  analysis_summary TEXT,
  risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  risk_score FLOAT CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
  
  -- Analysis metadata
  tier_used VARCHAR(20) NOT NULL, -- 'keyword', 'rag', 'ollama'
  model_version VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMP NOT NULL DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  
  -- Indexes
  INDEX idx_constitutional_cache_hash (bill_section_hash),
  INDEX idx_constitutional_cache_risk (risk_level)
);

COMMENT ON TABLE constitutional_analysis_cache IS 'Cache for constitutional analysis to avoid redundant RAG queries';

-- ============================================================================
-- Trojan Bill Detection Results
-- ============================================================================

CREATE TABLE IF NOT EXISTS trojan_bill_detections (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  
  -- Detection scores
  overall_risk_score FLOAT NOT NULL CHECK (overall_risk_score >= 0.0 AND overall_risk_score <= 1.0),
  risk_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  -- Individual risk factors
  structural_anomaly_score FLOAT,
  urgency_manipulation_score FLOAT,
  consultation_adequacy_score FLOAT,
  schedule_density_score FLOAT,
  amendment_complexity_score FLOAT,
  
  -- Findings
  findings JSONB NOT NULL, -- Array of {type: "...", severity: "...", description: "..."}
  
  -- Analysis metadata
  tier_used VARCHAR(20) NOT NULL, -- 'rules', 'spacy', 'ollama'
  analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_trojan_detections_bill_id (bill_id),
  INDEX idx_trojan_detections_risk_level (risk_level),
  INDEX idx_trojan_detections_score (overall_risk_score)
);

COMMENT ON TABLE trojan_bill_detections IS 'Results of trojan bill detection analysis';

-- ============================================================================
-- ML Model Metadata (for tracking model versions and performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ml_model_metadata (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL, -- 'engagement_predictor', 'sentiment_analyzer', etc.
  model_version VARCHAR(50) NOT NULL,
  
  -- Model details
  model_type VARCHAR(50) NOT NULL, -- 'sklearn_gbm', 'ollama_llama3.2', 'huggingface_roberta'
  model_path TEXT, -- File path or model identifier
  
  -- Training metadata
  trained_at TIMESTAMP,
  training_samples INTEGER,
  training_duration_seconds INTEGER,
  
  -- Performance metrics
  accuracy FLOAT,
  precision_score FLOAT,
  recall FLOAT,
  f1_score FLOAT,
  metrics JSONB, -- Additional metrics
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_ml_models_name (model_name),
  INDEX idx_ml_models_active (is_active),
  UNIQUE(model_name, model_version)
);

COMMENT ON TABLE ml_model_metadata IS 'Tracks ML model versions and performance metrics';

-- ============================================================================
-- Conflict Detection Results Cache
-- ============================================================================

CREATE TABLE IF NOT EXISTS conflict_detection_cache (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  sponsor_id INTEGER, -- Reference to MP/sponsor
  
  -- Detection results
  has_conflict BOOLEAN NOT NULL,
  conflict_type VARCHAR(50), -- 'direct', 'indirect', 'potential'
  confidence FLOAT CHECK (confidence >= 0.0 AND confidence <= 1.0),
  
  -- Conflict details
  conflict_path JSONB, -- Graph path: [{node: "MP X", type: "sponsor"}, {node: "Company Y", type: "owns"}, ...]
  narrative TEXT, -- Plain-English explanation generated by Ollama
  
  -- Analysis metadata
  tier_used VARCHAR(20) NOT NULL, -- 'direct', 'graph', 'ollama'
  analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_conflict_cache_bill_id (bill_id),
  INDEX idx_conflict_cache_sponsor (sponsor_id),
  INDEX idx_conflict_cache_has_conflict (has_conflict)
);

COMMENT ON TABLE conflict_detection_cache IS 'Cache for conflict-of-interest detection results';

-- ============================================================================
-- Engagement Predictions (for A/B testing and monitoring)
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagement_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
  
  -- Prediction
  predicted_engagement_score FLOAT NOT NULL CHECK (predicted_engagement_score >= 0.0 AND predicted_engagement_score <= 1.0),
  prediction_tier VARCHAR(20) NOT NULL, -- 'rules', 'model'
  
  -- Features used
  features JSONB NOT NULL,
  
  -- Actual outcome (filled in later)
  actual_engaged BOOLEAN,
  prediction_correct BOOLEAN,
  
  -- Timestamps
  predicted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  outcome_recorded_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_engagement_predictions_user (user_id),
  INDEX idx_engagement_predictions_bill (bill_id),
  INDEX idx_engagement_predictions_predicted_at (predicted_at)
);

COMMENT ON TABLE engagement_predictions IS 'Tracks engagement predictions for model evaluation';

-- ============================================================================
-- Trigger to update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_conflict_nodes_updated_at BEFORE UPDATE ON conflict_graph_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conflict_edges_updated_at BEFORE UPDATE ON conflict_graph_edges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vector_embeddings_updated_at BEFORE UPDATE ON vector_embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constitutional_cache_updated_at BEFORE UPDATE ON constitutional_analysis_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trojan_detections_updated_at BEFORE UPDATE ON trojan_bill_detections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_model_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
