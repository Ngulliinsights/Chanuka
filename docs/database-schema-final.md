# Chanuka Platform - Final Database Schema

## Overview

This document outlines the final, normalized database schema for the Chanuka Legislative Transparency Platform after addressing naming inconsistencies, missing tables, and migration issues.

## Schema Design Principles

1. **Consistent Naming**: All table names use plural form (e.g., `bills`, `users`, `sponsors`)
2. **Standardized Timestamps**: All timestamps use `TIMESTAMP WITH TIME ZONE`
3. **Proper Relationships**: Foreign keys with appropriate cascade rules
4. **Performance Optimized**: Strategic indexes for common query patterns
5. **Data Integrity**: Check constraints for enum-like fields

## Core Tables

### Users & Authentication

#### `users`
Primary user accounts table
```sql
- id: UUID PRIMARY KEY (auto-generated)
- email: TEXT NOT NULL UNIQUE
- password_hash: TEXT NOT NULL
- first_name: TEXT
- last_name: TEXT  
- name: TEXT NOT NULL
- role: TEXT NOT NULL DEFAULT 'citizen' 
  CHECK (role IN ('citizen', 'expert', 'moderator', 'admin', 'sponsor'))
- verification_status: TEXT NOT NULL DEFAULT 'pending'
  CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'))
- preferences: JSONB DEFAULT '{}'
- is_active: BOOLEAN DEFAULT true
- last_login_at: TIMESTAMP WITH TIME ZONE
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `user_profiles`
Extended user profile information
```sql
- id: SERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- bio: TEXT
- expertise: TEXT[] DEFAULT '{}'
- location: TEXT
- organization: TEXT
- verification_documents: JSONB DEFAULT '[]'
- reputation_score: INTEGER DEFAULT 0
- is_public: BOOLEAN DEFAULT true
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `user_verification_requests`
User verification workflow
```sql
- id: SERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- verification_type: TEXT NOT NULL DEFAULT 'identity'
- status: TEXT NOT NULL DEFAULT 'pending'
- documents: JSONB DEFAULT '[]'
- reviewer_id: UUID REFERENCES users(id)
- reviewed_at: TIMESTAMP WITH TIME ZONE
- notes: TEXT
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Bills & Legislation

#### `bills`
Core bills/legislation table
```sql
- id: SERIAL PRIMARY KEY
- title: TEXT NOT NULL
- description: TEXT
- content: TEXT
- summary: TEXT
- status: TEXT NOT NULL DEFAULT 'introduced'
  CHECK (status IN ('draft', 'introduced', 'committee', 'passed', 'enacted', 'failed', 'withdrawn'))
- bill_number: TEXT
- sponsor_id: INTEGER REFERENCES sponsors(id)
- category: TEXT
- tags: TEXT[] DEFAULT '{}'
- view_count: INTEGER DEFAULT 0
- share_count: INTEGER DEFAULT 0
- comment_count: INTEGER DEFAULT 0
- engagement_score: NUMERIC DEFAULT 0
- complexity_score: INTEGER
- constitutional_concerns: JSONB DEFAULT '[]'
- stakeholder_analysis: JSONB DEFAULT '{}'
- introduced_date: TIMESTAMP WITH TIME ZONE
- last_action_date: TIMESTAMP WITH TIME ZONE
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- search_vector: TSVECTOR
```

#### `bill_versions`
Track bill changes over time
```sql
- id: SERIAL PRIMARY KEY
- bill_id: INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE
- version_number: INTEGER NOT NULL DEFAULT 1
- title: TEXT NOT NULL
- content: TEXT NOT NULL
- summary: TEXT
- changes_summary: TEXT
- created_by: UUID REFERENCES users(id)
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- UNIQUE(bill_id, version_number)
```

#### `bill_comments`
User comments on bills
```sql
- id: SERIAL PRIMARY KEY
- bill_id: INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE
- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- content: TEXT NOT NULL
- comment_type: TEXT NOT NULL DEFAULT 'general'
  CHECK (comment_type IN ('general', 'expert', 'concern', 'support', 'question'))
- is_verified: BOOLEAN DEFAULT false
- parent_comment_id: INTEGER REFERENCES bill_comments(id)
- upvotes: INTEGER DEFAULT 0
- downvotes: INTEGER DEFAULT 0
- is_deleted: BOOLEAN DEFAULT false
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `bill_engagement`
User engagement tracking
```sql
- id: SERIAL PRIMARY KEY
- bill_id: INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE
- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- view_count: INTEGER DEFAULT 0
- comment_count: INTEGER DEFAULT 0
- share_count: INTEGER DEFAULT 0
- engagement_score: NUMERIC DEFAULT 0
- last_engaged: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- UNIQUE(bill_id, user_id)
```

### Sponsors & Transparency

#### `sponsors`
Legislative sponsors/politicians
```sql
- id: SERIAL PRIMARY KEY
- name: TEXT NOT NULL
- role: TEXT NOT NULL
- party: TEXT
- constituency: TEXT
- email: TEXT
- phone: TEXT
- bio: TEXT
- photo_url: TEXT
- conflict_level: TEXT
- financial_exposure: NUMERIC DEFAULT 0
- voting_alignment: NUMERIC DEFAULT 0
- transparency_score: NUMERIC DEFAULT 0
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `bill_sponsorships`
Bill-sponsor relationships
```sql
- id: SERIAL PRIMARY KEY
- bill_id: INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE
- sponsor_id: INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE
- sponsorship_type: TEXT NOT NULL
  CHECK (sponsorship_type IN ('primary', 'co-sponsor', 'supporter'))
- sponsorship_date: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- UNIQUE(bill_id, sponsor_id, sponsorship_type)
```

#### `bill_co_sponsors`
Dedicated co-sponsor tracking
```sql
- id: SERIAL PRIMARY KEY
- bill_id: INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE
- sponsor_id: INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE
- support_level: TEXT DEFAULT 'full'
- date_added: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- is_active: BOOLEAN DEFAULT true
- UNIQUE(bill_id, sponsor_id)
```

#### `sponsor_transparency`
Sponsor disclosure information
```sql
- id: SERIAL PRIMARY KEY
- sponsor_id: INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE
- disclosure_type: TEXT NOT NULL
- description: TEXT NOT NULL
- amount: NUMERIC
- source: TEXT
- date_reported: TIMESTAMP WITH TIME ZONE
- is_verified: BOOLEAN DEFAULT false
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `sponsor_financial_disclosures`
Detailed financial disclosures
```sql
- id: SERIAL PRIMARY KEY
- sponsor_id: INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE
- disclosure_year: INTEGER NOT NULL
- asset_type: TEXT NOT NULL
- asset_description: TEXT NOT NULL
- estimated_value_min: NUMERIC(12,2)
- estimated_value_max: NUMERIC(12,2)
- income_source: TEXT
- is_verified: BOOLEAN DEFAULT false
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Notifications & Preferences

#### `notifications`
User notifications
```sql
- id: SERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- type: TEXT NOT NULL
- title: TEXT NOT NULL
- message: TEXT NOT NULL
- related_bill_id: INTEGER REFERENCES bills(id)
- is_read: BOOLEAN DEFAULT false
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `user_notification_preferences`
User notification settings
```sql
- id: SERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- notification_type: TEXT NOT NULL
- channel: TEXT NOT NULL -- 'email', 'in_app', 'sms', 'push'
- is_enabled: BOOLEAN DEFAULT true
- frequency: TEXT DEFAULT 'immediate' -- 'immediate', 'daily', 'weekly', 'never'
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- UNIQUE(user_id, notification_type, channel)
```

#### `user_bill_tracking_preference`
Bill tracking preferences
```sql
- id: SERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- bill_id: INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE
- tracking_types: TEXT[] DEFAULT ARRAY['status_changes', 'new_comments']
- alert_frequency: TEXT DEFAULT 'immediate'
- alert_channels: TEXT[] DEFAULT ARRAY['in_app', 'email']
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- UNIQUE(user_id, bill_id)
```

### System & Configuration

#### `system_configurations`
Application configuration
```sql
- id: SERIAL PRIMARY KEY
- config_key: TEXT NOT NULL UNIQUE
- config_value: JSONB NOT NULL
- description: TEXT
- is_public: BOOLEAN DEFAULT false
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

## Key Indexes

### Performance Indexes
```sql
-- Bills
CREATE INDEX idx_bills_status_created ON bills(status, created_at DESC);
CREATE INDEX idx_bills_category_status ON bills(category, status);
CREATE INDEX idx_bills_engagement_score ON bills(engagement_score DESC);

-- Comments
CREATE INDEX idx_bill_comments_bill_user ON bill_comments(bill_id, user_id);
CREATE INDEX idx_bill_comments_created ON bill_comments(created_at DESC);

-- Engagement
CREATE INDEX idx_bill_engagement_user_score ON bill_engagement(user_id, engagement_score DESC);
CREATE INDEX idx_bill_engagement_last_engaged ON bill_engagement(last_engaged DESC);

-- Users
CREATE INDEX idx_users_role_active ON users(role, is_active);
CREATE INDEX idx_users_verification_status ON users(verification_status);

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

## Views

### `bill_summary_view`
Comprehensive bill information with sponsor details
```sql
SELECT 
  b.id, b.title, b.description, b.status, b.bill_number,
  b.category, b.view_count, b.engagement_score,
  s.name as primary_sponsor_name,
  s.party as primary_sponsor_party,
  COUNT(DISTINCT bs.id) as co_sponsor_count,
  COUNT(DISTINCT bc.id) as total_comments
FROM bills b
LEFT JOIN sponsors s ON b.sponsor_id = s.id
LEFT JOIN bill_sponsorships bs ON b.id = bs.bill_id
LEFT JOIN bill_comments bc ON b.id = bc.bill_id
GROUP BY b.id, s.id;
```

### `user_engagement_summary`
User activity and engagement metrics
```sql
SELECT 
  u.id, u.name, u.role, u.verification_status,
  COUNT(DISTINCT be.bill_id) as bills_engaged,
  COUNT(DISTINCT bc.id) as comments_posted,
  AVG(be.engagement_score) as avg_engagement_score,
  up.reputation_score
FROM users u
LEFT JOIN bill_engagement be ON u.id = be.user_id
LEFT JOIN bill_comments bc ON u.id = bc.user_id
LEFT JOIN user_profiles up ON u.id = up.user_id
GROUP BY u.id, up.reputation_score;
```

## Triggers

### Automatic Updates
- `update_bill_engagement_score()`: Updates bill engagement scores when comments are added
- `update_bill_comment_count()`: Maintains accurate comment counts on bills
- `update_updated_at_column()`: Updates `updated_at` timestamps automatically

## Migration Strategy

### Phase 1: Schema Normalization
1. ✅ Standardize table naming (plural forms)
2. ✅ Unify timestamp types to `TIMESTAMP WITH TIME ZONE`
3. ✅ Add missing foreign key constraints

### Phase 2: Missing Tables
1. ✅ Add `user_verification_requests`
2. ✅ Add `bill_versions` for change tracking
3. ✅ Add `bill_co_sponsors` for detailed sponsorship
4. ✅ Add `sponsor_financial_disclosures`
5. ✅ Add `user_notification_preferences`
6. ✅ Add `system_configurations`

### Phase 3: Performance Optimization
1. ✅ Add strategic indexes
2. ✅ Create materialized views for analytics
3. ✅ Add triggers for automatic updates

### Phase 4: Data Integrity
1. ✅ Add check constraints for enum fields
2. ✅ Add unique constraints where appropriate
3. ✅ Ensure proper cascade rules

## Configuration Values

Default system configurations:
- `app.name`: "Chanuka Legislative Transparency Platform"
- `features.comments_enabled`: true
- `features.notifications_enabled`: true
- `limits.max_comments_per_user_per_day`: 50
- `limits.max_bills_tracked_per_user`: 100
- `moderation.auto_flag_threshold`: 0.8

## Next Steps

1. **Run Migration**: Execute `0020_comprehensive_schema_normalization.sql`
2. **Update Application Code**: Update models to match new schema
3. **Test Thoroughly**: Verify all functionality works with new schema
4. **Monitor Performance**: Check query performance with new indexes
5. **Data Migration**: Migrate any existing data to new structure

This schema provides a solid foundation for the Chanuka platform with proper normalization, performance optimization, and data integrity constraints.