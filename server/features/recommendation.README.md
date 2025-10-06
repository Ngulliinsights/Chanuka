# Recommendation System for LegalEase

This recommendation system provides personalized bill suggestions to users based on their interests, engagement patterns, and collaborative filtering. It helps users discover relevant legislative content and increases engagement with the platform.

## Features

### Personalized Recommendations

Provides bill recommendations tailored to each user based on their interests and past engagement patterns. The system analyzes user interactions with bills and suggests similar content that might be of interest.

### Similar Bills

Identifies bills that are similar to a specific bill based on tags, content, and user engagement patterns. This feature helps users explore related legislation when viewing a particular bill.

### Trending Bills

Highlights bills that are currently receiving high engagement across the platform. The trending algorithm considers recent comments, shares, and views to identify popular content.

### Collaborative Recommendations

Leverages the collective wisdom of users by recommending bills that similar users have engaged with. This approach helps discover relevant content that might not be directly matched by interest tags.

### Engagement Tracking

Tracks and analyzes user interactions with bills, including views, comments, and shares. This data is used to improve recommendation quality and understand user preferences.

## Implementation

### Database Schema

The recommendation system relies on the following database tables:

- `bill_engagement`: Tracks user interactions with bills
- `user_interests`: Stores user interest tags
- `bills`: Contains bill information
- `bill_tags`: Maps tags to bills
- `bill_comments`: Stores user comments on bills
- `social_shares`: Tracks bill sharing activity

### Recommendation Algorithms

#### Content-Based Filtering

Recommends bills based on matching user interests with bill tags. This approach works well for users with clearly defined interests.

#### Collaborative Filtering

Recommends bills based on the engagement patterns of similar users. This approach helps discover content that might not be directly matched by interest tags.

#### Trending Analysis

Identifies popular bills based on recent engagement metrics. This approach ensures users stay informed about currently relevant legislation.

### Scoring System

Each recommendation includes a score that indicates its relevance to the user. The scoring system considers multiple factors:

- Match with user interests
- Engagement level of similar users
- Overall popularity
- Recency of engagement
- Bill status (active bills are prioritized)

## API Endpoints

### GET /api/recommendations/personalized

Returns personalized bill recommendations for the authenticated user.

**Query Parameters:**

- `limit` (optional): Maximum number of recommendations to return (default: 10)

### GET /api/recommendations/similar/:billId

Returns bills similar to the specified bill.

**Path Parameters:**

- `billId`: ID of the bill to find similar bills for

**Query Parameters:**

- `limit` (optional): Maximum number of similar bills to return (default: 5)

### GET /api/recommendations/trending

Returns trending bills based on recent engagement.

**Query Parameters:**

- `days` (optional): Number of days to consider for trending calculation (default: 7)
- `limit` (optional): Maximum number of trending bills to return (default: 10)

### GET /api/recommendations/collaborative

Returns recommendations based on similar users' engagement patterns.

**Query Parameters:**

- `limit` (optional): Maximum number of recommendations to return (default: 10)

### POST /api/recommendations/track-engagement

Tracks user engagement with a bill.

**Request Body:**

```json
{
  "billId": 123,
  "engagementType": "view" // "view", "comment", or "share"
}
```

## Usage

### Integration with Frontend

The recommendation system can be integrated with the frontend application to display personalized recommendations on the user dashboard, similar bills on bill detail pages, and trending bills on the home page.

```typescript
// Example: Fetching personalized recommendations
async function getPersonalizedRecommendations() {
  const response = await fetch('/api/recommendations/personalized');
  const data = await response.json();
  return data.data;
}

// Example: Tracking user engagement
async function trackBillView(billId) {
  await fetch('/api/recommendations/track-engagement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      billId,
      engagementType: 'view',
    }),
  });
}
```

### Improving Recommendation Quality

The quality of recommendations improves as users interact with the system. To enhance recommendation quality:

1. Encourage users to select interests during onboarding
2. Track all relevant user interactions with bills
3. Regularly analyze engagement patterns to refine algorithms
4. Consider implementing A/B testing for recommendation strategies

## Future Enhancements

1. **Machine Learning Models**: Implement more sophisticated ML models for better prediction of user interests
2. **Content Analysis**: Analyze bill text to identify similarities beyond tags
3. **Personalization Settings**: Allow users to customize their recommendation preferences
4. **Feedback Loop**: Implement explicit feedback mechanisms for recommendations
5. **Seasonal Adjustments**: Adjust recommendations based on legislative sessions and timelines
