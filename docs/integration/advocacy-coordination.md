# Advocacy Coordination

## Overview

Advocacy Coordination enables citizens to organize campaigns, coordinate actions, build coalitions, and track the real-world impact of their advocacy efforts.

## Features

- **Campaign Management**: Create and manage advocacy campaigns around bills
- **Action Coordination**: Assign and track specific advocacy actions
- **Impact Tracking**: Measure and document campaign outcomes
- **Coalition Building**: Find and connect with like-minded advocates
- **Analytics Dashboard**: Track engagement and effectiveness

## How It Works

### 1. Campaigns

Campaigns are organized efforts to influence legislation:

- **Goals**: Define what you want to achieve
- **Timeline**: Set start and end dates
- **Participants**: Invite and manage campaign members
- **Actions**: Create specific tasks for participants
- **Impact**: Track outcomes and measure success

### 2. Actions

Actions are specific tasks that advance campaign goals:

**Action Types:**
- **Contact Representative**: Email or call your MP
- **Attend Hearing**: Participate in committee hearings
- **Submit Comment**: Provide written testimony
- **Share Content**: Spread awareness on social media
- **Organize Meeting**: Host community discussions
- **Petition Signature**: Sign or circulate petitions

**Action Lifecycle:**
1. **Pending**: Action is assigned but not started
2. **In Progress**: User has started the action
3. **Completed**: Action finished with outcome recorded
4. **Skipped**: Action not completed (with reason)

### 3. Impact Tracking

Track real-world outcomes:

- **Bill Amendments**: Changes influenced by campaign
- **Committee Feedback**: Recognition in committee reports
- **Media Attention**: Press coverage of campaign
- **Legislative Response**: Direct responses from legislators
- **Public Awareness**: Measured increase in engagement

## User Guide

### Creating a Campaign

1. Navigate to Advocacy Dashboard
2. Click "Create Campaign"
3. Fill in campaign details:
   - Title and description
   - Associated bill
   - Goals and objectives
   - Timeline
   - Public/private setting
4. Click "Create"

### Joining a Campaign

1. Browse active campaigns
2. Click "View Details" on a campaign
3. Review campaign goals and actions
4. Click "Join Campaign"

### Managing Actions

**As a Participant:**
1. View your assigned actions in "My Actions"
2. Click "Start Action" when ready
3. Follow the action instructions
4. Click "Mark Complete" when finished
5. Provide outcome feedback

**As an Organizer:**
1. Go to campaign detail page
2. Click "Actions" tab
3. Click "Create Action"
4. Assign to participants
5. Track completion status

### Tracking Impact

1. Navigate to campaign detail page
2. Click "Impact" tab
3. View recorded impacts
4. Click "Record Impact" to add new outcomes
5. Provide evidence links and description

## API Reference

### Campaign Management

#### Create Campaign

```http
POST /api/advocacy/campaigns
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "bill_id": "string",
  "goals": ["string"],
  "start_date": "ISO 8601",
  "end_date": "ISO 8601",
  "is_public": boolean
}
```

#### Get Campaigns

```http
GET /api/advocacy/campaigns?status=active&page=1&limit=20
```

#### Join Campaign

```http
POST /api/advocacy/campaigns/:id/join
```

### Action Coordination

#### Create Action

```http
POST /api/advocacy/actions
Content-Type: application/json

{
  "campaign_id": "string",
  "user_id": "string",
  "actionType": "contact_representative",
  "title": "string",
  "description": "string",
  "priority": "high",
  "estimatedTimeMinutes": 15,
  "due_date": "ISO 8601"
}
```

#### Complete Action

```http
POST /api/advocacy/actions/:id/complete
Content-Type: application/json

{
  "outcome": {
    "successful": true,
    "impactNotes": "string"
  },
  "actualTimeMinutes": 20
}
```

### Impact Tracking

#### Record Impact

```http
POST /api/advocacy/campaigns/:id/impact
Content-Type: application/json

{
  "impactType": "media_attention",
  "value": 85,
  "description": "string",
  "evidenceLinks": ["string"]
}
```

#### Get Impact Assessment

```http
GET /api/advocacy/campaigns/:id/impact/assessment
```

See [API Documentation](./api/advocacy-coordination-api.md) for complete reference.

## Technical Details

### Architecture

```
Campaign → Actions → Participants → Impact
   │          │           │           │
   └─ Create  └─ Assign   └─ Execute  └─ Track
   └─ Manage  └─ Monitor  └─ Report   └─ Measure
```

### Components

- **Campaign Service**: Campaign lifecycle management
- **Action Coordinator**: Action assignment and tracking
- **Impact Tracker**: Outcome measurement and attribution
- **Coalition Builder**: Partner discovery and matching
- **Monitoring Integration**: Performance tracking

### Performance

- **API Response**: < 500ms (p95)
- **Campaign Creation**: < 500ms
- **Action Assignment**: < 200ms
- **Dashboard Load**: < 2 seconds

### Data Model

**Campaign:**
```typescript
{
  id: string;
  title: string;
  description: string;
  bill_id: string;
  organizerId: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  goals: string[];
  start_date: Date;
  end_date: Date;
  participantCount: number;
  impactScore: number;
  is_public: boolean;
}
```

**Action:**
```typescript
{
  id: string;
  campaign_id: string;
  user_id: string;
  actionType: ActionType;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTimeMinutes: number;
  due_date?: Date;
}
```

## Configuration

### Feature Flag

```json
{
  "advocacy_coordination": {
    "enabled": true,
    "rolloutPercentage": 100
  }
}
```

### Campaign Limits

```typescript
{
  maxParticipants: 10000,
  maxActionsPerCampaign: 1000,
  maxCampaignsPerUser: 50,
  campaignDurationMax: 365 // days
}
```

## Monitoring

### Metrics

- Total campaigns (active, completed)
- Total actions (pending, completed)
- Average completion rate
- Impact metrics by type
- User engagement rates

### Health Check

```http
GET /api/advocacy/monitoring/health
```

## Best Practices

### Campaign Organization

1. **Clear Goals**: Define specific, measurable objectives
2. **Realistic Timeline**: Allow adequate time for actions
3. **Diverse Actions**: Include various action types
4. **Regular Updates**: Keep participants informed
5. **Celebrate Wins**: Acknowledge achievements

### Action Design

1. **Specific Instructions**: Provide clear, actionable steps
2. **Reasonable Time**: Estimate time accurately
3. **Priority Setting**: Mark urgent actions appropriately
4. **Templates**: Use action templates for consistency
5. **Follow-up**: Track and encourage completion

### Impact Measurement

1. **Document Everything**: Record all outcomes with evidence
2. **Attribution**: Be honest about campaign contribution
3. **Multiple Metrics**: Track various impact types
4. **Long-term View**: Monitor outcomes over time
5. **Share Results**: Communicate impact to participants

## Troubleshooting

### Campaign Not Visible

- Check campaign status (must be 'active')
- Verify is_public setting
- Ensure user has permissions

### Actions Not Appearing

- Verify action assignment
- Check action status filter
- Confirm campaign membership

### Impact Not Recording

- Verify campaign organizer permissions
- Check impact type is valid
- Ensure evidence links are accessible

## Use Cases

### 1. Bill Amendment Campaign

**Goal**: Influence specific amendments to a bill

**Actions:**
- Contact representatives with amendment proposals
- Submit written comments to committee
- Organize stakeholder meetings
- Share amendment rationale on social media

**Impact Tracking:**
- Monitor committee discussions
- Track amendment adoption
- Document legislator responses

### 2. Public Awareness Campaign

**Goal**: Increase public understanding of a bill

**Actions:**
- Share educational content
- Organize community forums
- Petition signatures
- Media outreach

**Impact Tracking:**
- Measure engagement metrics
- Track media coverage
- Monitor public sentiment

### 3. Coalition Building

**Goal**: Unite multiple organizations around shared concerns

**Actions:**
- Identify potential partners
- Coordinate joint statements
- Organize coalition meetings
- Develop unified strategy

**Impact Tracking:**
- Coalition size and diversity
- Coordinated action effectiveness
- Collective impact measurement

## Future Enhancements

- AI-powered action recommendations
- Automated impact detection
- Integration with representative contact systems
- Mobile app for action tracking
- Gamification and rewards
- Advanced coalition matching algorithms

## Support

For assistance:
- Email: advocacy@chanuka.org
- Documentation: https://docs.chanuka.org/advocacy
- Community Forum: https://community.chanuka.org
- GitHub: https://github.com/chanuka/platform/issues
