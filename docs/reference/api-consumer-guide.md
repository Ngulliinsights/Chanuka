# Chanuka Platform API Consumer Guide

## Overview

This guide provides developers with comprehensive instructions for integrating with the Chanuka Platform API. Whether you're building a mobile app, web application, or third-party service, this guide will help you get started with authentication, make your first API calls, and handle responses effectively.

## Prerequisites

- Valid API credentials (obtain from developer portal)
- Understanding of RESTful API concepts
- Programming language of choice (JavaScript, Python, Java, etc.)
- HTTPS support for secure communication

## Authentication

The Chanuka API supports multiple authentication methods. Choose the appropriate method based on your use case.

### Bearer Token Authentication

For most API interactions, use Bearer token authentication:

```javascript
const headers = {
  'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
  'Content-Type': 'application/json'
};
```

### API Key Authentication

For server-to-server communications:

```javascript
const headers = {
  'X-API-Key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};
```

### Obtaining Tokens

1. **Register Application**: Visit the developer portal to register your application
2. **OAuth Flow**: Implement OAuth 2.0 authorization code flow for user data access
3. **API Keys**: Request API keys for service accounts

## Making API Calls

### Base Configuration

```javascript
const API_BASE_URL = 'https://api.chanuka.go.ke/v1';

// Common headers for all requests
const defaultHeaders = {
  'Authorization': 'Bearer YOUR_TOKEN',
  'Content-Type': 'application/json',
  'User-Agent': 'YourApp/1.0'
};
```

### JavaScript/TypeScript Example

```javascript
class ChanukaAPI {
  constructor(token) {
    this.baseURL = 'https://api.chanuka.go.ke/v1';
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`API Error: ${data.error?.message || response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Bills endpoints
  async getBills(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/bills?${queryString}`);
  }

  async getBill(id) {
    return this.request(`/bills/${id}`);
  }

  // User endpoints
  async getCurrentUser() {
    return this.request('/auth/me');
  }
}

// Usage
const api = new ChanukaAPI('your-token-here');

// Get bills with pagination
const bills = await api.getBills({ limit: 20, status: 'introduced' });
console.log(bills.data);

// Get specific bill
const bill = await api.getBill('bill-123');
console.log(bill.data);
```

### Python Example

```python
import requests
from typing import Dict, List, Optional

class ChanukaAPIClient:
    def __init__(self, token: str):
        self.base_url = 'https://api.chanuka.go.ke/v1'
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'User-Agent': 'YourApp-Python/1.0'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)

        if not response.ok:
            error_data = response.json()
            raise Exception(f"API Error: {error_data.get('error', {}).get('message', response.text)}")

        return response.json()

    def get_bills(self, status: Optional[str] = None, limit: int = 20) -> Dict:
        params = {'limit': limit}
        if status:
            params['status'] = status
        return self._request('GET', '/bills', params=params)

    def get_bill(self, bill_id: str) -> Dict:
        return self._request('GET', f'/bills/{bill_id}')

    def create_comment(self, bill_id: str, content: str, anonymous: bool = False) -> Dict:
        data = {
            'content': content,
            'anonymous': anonymous
        }
        return self._request('POST', f'/bills/{bill_id}/comments', json=data)

# Usage
api = ChanukaAPIClient('your-token-here')

# Get bills
bills_response = api.get_bills(status='committee', limit=10)
for bill in bills_response['data']:
    print(f"Bill: {bill['title']}")

# Create comment
comment = api.create_comment('bill-123', 'This bill needs more review.')
print(f"Comment created: {comment['data']['id']}")
```

### Java Example

```java
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

public class ChanukaAPIClient {
    private final String baseUrl = "https://api.chanuka.go.ke/v1";
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String token;

    public ChanukaAPIClient(String token) {
        this.token = token;
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }

    private HttpRequest.Builder baseRequest(String endpoint) {
        return HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + endpoint))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .header("User-Agent", "YourApp-Java/1.0");
    }

    public String getBills(String status, int limit) throws IOException, InterruptedException {
        String params = String.format("?status=%s&limit=%d", status, limit);
        HttpRequest request = baseRequest("/bills" + params).GET().build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("API Error: " + response.body());
        }

        return response.body();
    }

    public String getBill(String billId) throws IOException, InterruptedException {
        HttpRequest request = baseRequest("/bills/" + billId).GET().build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("API Error: " + response.body());
        }

        return response.body();
    }
}

// Usage
ChanukaAPIClient api = new ChanukaAPIClient("your-token-here");

try {
    String billsJson = api.getBills("introduced", 20);
    System.out.println("Bills: " + billsJson);

    String billJson = api.getBill("bill-123");
    System.out.println("Bill: " + billJson);
} catch (Exception e) {
    System.err.println("Error: " + e.getMessage());
}
```

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Error Handling Best Practices

```javascript
async function safeApiCall(apiFunction) {
  try {
    const result = await apiFunction();
    return result;
  } catch (error) {
    // Log error for debugging
    console.error('API Error:', error);

    // Handle specific error types
    if (error.message.includes('VALIDATION_ERROR')) {
      // Show validation errors to user
      showValidationErrors(error.details);
    } else if (error.message.includes('AUTHENTICATION_ERROR')) {
      // Redirect to login
      redirectToLogin();
    } else if (error.message.includes('RATE_LIMITED')) {
      // Show rate limit message
      showRateLimitMessage();
    } else {
      // Generic error handling
      showGenericError();
    }

    throw error; // Re-throw for caller handling
  }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **Health endpoints**: 60 requests per minute

### Handling Rate Limits

```javascript
async function rateLimitedRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 429) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    const waitTime = new Date(resetTime * 1000) - new Date();

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return rateLimitedRequest(endpoint, options);
  }

  return response;
}
```

## Pagination

For endpoints that return lists, use pagination parameters:

```javascript
async function getAllBills() {
  let allBills = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await api.getBills({ offset, limit });
    allBills = allBills.concat(response.data);

    if (!response.meta.hasMore) break;
    offset += limit;
  }

  return allBills;
}
```

## Webhooks

For real-time updates, set up webhooks:

1. Register webhook endpoint in developer portal
2. Specify events to listen for (bill updates, comments, etc.)
3. Implement webhook handler with signature verification

```javascript
app.post('/webhooks/chanuka', (req, res) => {
  const signature = req.headers['x-chanuka-signature'];
  const payload = req.body;

  // Verify signature
  if (!verifySignature(payload, signature)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  switch (payload.event) {
    case 'bill.updated':
      handleBillUpdate(payload.data);
      break;
    case 'comment.created':
      handleNewComment(payload.data);
      break;
  }

  res.sendStatus(200);
});
```

## SDKs and Libraries

Official SDKs are available for easier integration:

- **JavaScript/TypeScript**: `npm install @chanuka/api-client`
- **Python**: `pip install chanuka-api`
- **Java**: Available on Maven Central

## Testing

### Using the Sandbox Environment

```javascript
const SANDBOX_BASE_URL = 'https://api.sandbox.chanuka.go.ke/v1';

// Use test data and tokens for development
const sandboxApi = new ChanukaAPI('sandbox-token');
```

### Mock Data for Testing

```javascript
// Use mock data for unit tests
const mockBill = {
  id: 'bill-test-123',
  title: 'Test Bill',
  status: 'introduced',
  // ... other fields
};
```

## Best Practices

### Security
- Store tokens securely (never in client-side localStorage for production)
- Use HTTPS for all API calls
- Validate webhook signatures
- Implement proper error handling

### Performance
- Cache responses when appropriate
- Use pagination for large datasets
- Implement retry logic with exponential backoff
- Monitor rate limits

### Reliability
- Handle network failures gracefully
- Implement circuit breakers for external calls
- Use idempotent operations where possible
- Log API interactions for debugging

## Support

- **Developer Portal**: https://developers.chanuka.go.ke
- **API Status**: https://status.chanuka.go.ke
- **Community Forum**: https://community.chanuka.go.ke
- **Email Support**: api-support@chanuka.go.ke

## Changelog

- **v1.0.0**: Initial release with core API endpoints
- **v1.1.0**: Added webhook support and enhanced error handling
- **v1.2.0**: Introduced rate limiting and improved pagination

---

*This guide is updated with each API version. Last updated: December 2025*