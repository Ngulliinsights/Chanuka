-- MWANGA Stack Database Schema
-- Migration for ML/AI infrastructure supporting zero-training-first architecture
-- Date: 2026-03-06

-- ============================================================================
-- ML Interaction Logs (for engagement model training)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ml_interactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
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
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
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
  UNIQUE(node_type, entity_id)
  
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
  UNIQUE(source_node_id, target_node_id, relationship_type)
  
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
  access_count INTEGER DEFAULT 1
  
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
  access_count INTEGER DEFAULT 1
  
);

COMMENT ON TABLE constitutional_analysis_cache IS 'Cache for constitutional analysis to avoid redundant RAG queries';

-- ============================================================================
-- Trojan Bill Detection Results
-- ============================================================================

CREATE TABLE IF NOT EXISTS trojan_bill_detections (
  id SERIAL PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  
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
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  
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
  
  UNIQUE(model_name, model_version)
);

COMMENT ON TABLE ml_model_metadata IS 'Tracks ML model versions and performance metrics';

-- ============================================================================
-- Conflict Detection Results Cache
-- ============================================================================

CREATE TABLE IF NOT EXISTS conflict_detection_cache (
  id SERIAL PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
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
  last_accessed TIMESTAMP NOT NULL DEFAULT NOW()
  
);

COMMENT ON TABLE conflict_detection_cache IS 'Cache for conflict-of-interest detection results';

-- ============================================================================
-- Engagement Predictions (for A/B testing and monitoring)
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagement_predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  
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
  outcome_recorded_at TIMESTAMP
  
);

COMMENT ON TABLE engagement_predictions IS 'Tracks engagement predictions for model evaluation';

-- ============================================================================
-- Bill Summarization Cache (optional - for performance optimization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bill_summarization_cache (
  id SERIAL PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  bill_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of bill text
  
  -- Summarization parameters
  summarization_type VARCHAR(50) NOT NULL, -- 'executive', 'section_by_section', 'plain_language', 'impact_focused'
  target_audience VARCHAR(50), -- 'general_public', 'activists', 'legal_experts', 'media'
  language VARCHAR(20), -- 'english', 'swahili', 'both'
  
  -- Summary results
  executive_summary TEXT NOT NULL,
  key_provisions JSONB NOT NULL, -- Array of key provisions
  plain_language_version TEXT,
  swahili_summary TEXT,
  impact_analysis JSONB,
  key_terms JSONB,
  action_items JSONB,
  
  -- Metadata
  word_count JSONB NOT NULL, -- {original, summary, compressionRatio}
  readability_score JSONB NOT NULL, -- {original, summary, improvement}
  tier_used VARCHAR(20) NOT NULL, -- 'tier1', 'tier2', 'tier3'
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMP NOT NULL DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  
  UNIQUE(bill_hash, summarization_type, target_audience, language)
);

COMMENT ON TABLE bill_summarization_cache IS 'Cache for bill summarization results to avoid redundant processing';

-- ============================================================================
-- Content Classification Cache (optional - for performance optimization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_classification_cache (
  id SERIAL PRIMARY KEY,
  content_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of content
  
  -- Content metadata
  content_source VARCHAR(50) NOT NULL, -- 'bill', 'comment', 'news', 'social_media', 'official_statement'
  
  -- Classification results
  classifications JSONB NOT NULL, -- Full classification results object
  
  -- Analysis metadata
  tier_used VARCHAR(20) NOT NULL, -- 'tier1', 'tier2', 'tier3'
  tasks_performed JSONB NOT NULL, -- Array of classification tasks performed
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMP NOT NULL DEFAULT NOW(),
  access_count INTEGER DEFAULT 1
  
);

COMMENT ON TABLE content_classification_cache IS 'Cache for content classification results to avoid redundant processing';

-- ============================================================================
-- Transparency Assessment Cache (optional - for performance optimization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transparency_assessment_cache (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- 'bill', 'sponsor', 'process', 'institution'
  entity_id VARCHAR(255) NOT NULL,
  assessment_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of assessment data
  
  -- Assessment results
  overall_score FLOAT NOT NULL CHECK (overall_score >= 0.0 AND overall_score <= 100.0),
  grade VARCHAR(1) NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  confidence FLOAT NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  
  -- Dimension scores
  dimensions JSONB NOT NULL, -- {accessibility, completeness, timeliness, participation, accountability}
  
  -- Analysis details
  strengths JSONB NOT NULL, -- Array of strengths
  weaknesses JSONB NOT NULL, -- Array of weaknesses
  recommendations JSONB NOT NULL, -- Array of recommendations
  benchmarking JSONB NOT NULL, -- Benchmarking data
  
  -- Metadata
  tier_used VARCHAR(20) NOT NULL, -- 'tier1', 'tier2', 'tier3'
  narrative TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMP NOT NULL DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  
  UNIQUE(entity_type, entity_id, assessment_hash)
);

COMMENT ON TABLE transparency_assessment_cache IS 'Cache for transparency assessment results to avoid redundant processing';

-- ============================================================================

-- ============================================================================
-- Indexes (created separately for PostgreSQL compatibility)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ml_interactions_user_id ON ml_interactions (user_id);
CREATE INDEX IF NOT EXISTS idx_ml_interactions_bill_id ON ml_interactions (bill_id);
CREATE INDEX IF NOT EXISTS idx_ml_interactions_timestamp ON ml_interactions (timestamp);
CREATE INDEX IF NOT EXISTS idx_ml_interactions_engaged ON ml_interactions (engaged);
CREATE INDEX IF NOT EXISTS idx_conflict_nodes_type ON conflict_graph_nodes (node_type);
CREATE INDEX IF NOT EXISTS idx_conflict_nodes_entity_id ON conflict_graph_nodes (entity_id);
CREATE INDEX IF NOT EXISTS idx_conflict_nodes_name ON conflict_graph_nodes (entity_name);
CREATE INDEX IF NOT EXISTS idx_conflict_edges_source ON conflict_graph_edges (source_node_id);
CREATE INDEX IF NOT EXISTS idx_conflict_edges_target ON conflict_graph_edges (target_node_id);
CREATE INDEX IF NOT EXISTS idx_conflict_edges_type ON conflict_graph_edges (relationship_type);
CREATE INDEX IF NOT EXISTS idx_conflict_edges_both ON conflict_graph_edges (source_node_id, target_node_id);
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_type ON vector_embeddings (document_type);
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_doc_id ON vector_embeddings (document_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_cache_hash ON sentiment_cache (text_hash);
CREATE INDEX IF NOT EXISTS idx_sentiment_cache_created ON sentiment_cache (created_at);
CREATE INDEX IF NOT EXISTS idx_constitutional_cache_hash ON constitutional_analysis_cache (bill_section_hash);
CREATE INDEX IF NOT EXISTS idx_constitutional_cache_risk ON constitutional_analysis_cache (risk_level);
CREATE INDEX IF NOT EXISTS idx_trojan_detections_bill_id ON trojan_bill_detections (bill_id);
CREATE INDEX IF NOT EXISTS idx_trojan_detections_risk_level ON trojan_bill_detections (risk_level);
CREATE INDEX IF NOT EXISTS idx_trojan_detections_score ON trojan_bill_detections (overall_risk_score);
CREATE INDEX IF NOT EXISTS idx_ml_models_name ON ml_model_metadata (model_name);
CREATE INDEX IF NOT EXISTS idx_ml_models_active ON ml_model_metadata (is_active);
CREATE INDEX IF NOT EXISTS idx_conflict_cache_bill_id ON conflict_detection_cache (bill_id);
CREATE INDEX IF NOT EXISTS idx_conflict_cache_sponsor ON conflict_detection_cache (sponsor_id);
CREATE INDEX IF NOT EXISTS idx_conflict_cache_has_conflict ON conflict_detection_cache (has_conflict);
CREATE INDEX IF NOT EXISTS idx_engagement_predictions_user ON engagement_predictions (user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_predictions_bill ON engagement_predictions (bill_id);
CREATE INDEX IF NOT EXISTS idx_engagement_predictions_predicted_at ON engagement_predictions (predicted_at);
CREATE INDEX IF NOT EXISTS idx_bill_summary_cache_bill_id ON bill_summarization_cache (bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_summary_cache_hash ON bill_summarization_cache (bill_hash);
CREATE INDEX IF NOT EXISTS idx_bill_summary_cache_type ON bill_summarization_cache (summarization_type);
CREATE INDEX IF NOT EXISTS idx_content_classification_hash ON content_classification_cache (content_hash);
CREATE INDEX IF NOT EXISTS idx_content_classification_source ON content_classification_cache (content_source);
CREATE INDEX IF NOT EXISTS idx_content_classification_created ON content_classification_cache (created_at);
CREATE INDEX IF NOT EXISTS idx_transparency_cache_entity ON transparency_assessment_cache (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_transparency_cache_hash ON transparency_assessment_cache (assessment_hash);
CREATE INDEX IF NOT EXISTS idx_transparency_cache_score ON transparency_assessment_cache (overall_score);
CREATE INDEX IF NOT EXISTS idx_transparency_cache_grade ON transparency_assessment_cache (grade);

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

CREATE TRIGGER update_bill_summary_cache_updated_at BEFORE UPDATE ON bill_summarization_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_classification_cache_updated_at BEFORE UPDATE ON content_classification_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transparency_cache_updated_at BEFORE UPDATE ON transparency_assessment_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
