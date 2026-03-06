# Electoral Accountability Engine

**Last Updated:** March 6, 2026  
**Status:** ✅ Production Ready (MVP)  
**Priority:** Primary Feature

> **Consolidation Note:** This document replaces 8 previous electoral accountability documents.  
> See [docs/archive/electoral-accountability-fragments/](../archive/electoral-accountability-fragments/) for historical versions.

---

## Overview

The Electoral Accountability Engine is Chanuka's primary distinguishing feature — converting legislative transparency into measurable electoral consequence. Unlike platforms that measure engagement (sessions, comments), Chanuka measures outcomes: MPs who changed votes, bills challenged successfully, candidates who lost seats after voting records became campaign material.

**Core Thesis:** Information is only as powerful as the mechanism that converts it into political cost.

---

## Implementation Status

### Backend: 100% Complete ✅

- 5 database tables with 20+ optimized indexes
- Complete domain logic with gap calculation
- Repository layer with CRUD operations
- 6 RESTful API endpoints
- Authentication middleware (JWT ready)
- Data import scripts (CSV/JSON)
- Automated gap calculation
- 0 TypeScript errors

### Frontend: 100% MVP Complete ✅

- 5 core UI components
- React Query hooks with intelligent caching
- Type-safe API service layer
- WCAG AA compliant
- Responsive design
- 0 TypeScript errors

---

## Architecture

### Database Schema

**Location:** `server/infrastructure/schema/electoral_accountability.ts`

#### 1. voting_records
Maps every MP vote to their constituency with electoral context.

**Key Fields:**
- `bill_id`, `sponsor_id`, `vote` (yes/no/abstain/absent)
- `constituency`, `county`, `ward`
- `alignment_with_constituency` (0-100)
- `days_until_next_election`
- `hansard_reference`, `video_timestamp`

#### 2. constituency_sentiment
Ward-level community voice aggregated by constituency.

**Key Fields:**
- `bill_id`, `constituency`, `county`
- `support_count`, `oppose_count`, `neutral_count`
- `sentiment_score` (-100 to +100)
- `confidence_level`, `sample_size_adequate`
- `demographic_distribution` (JSONB)

#### 3. representative_gap_analysis
The "accountability distance" metric between constituent wants and MP votes.

**Key Fields:**
- `voting_record_id`, `constituency_sentiment_id`
- `alignment_gap` (0-100)
- `gap_severity` (low/medium/high/critical)
- `electoral_risk_score` (0-100)
- `is_misaligned`, `constituent_position`, `representative_vote`

#### 4. electoral_pre