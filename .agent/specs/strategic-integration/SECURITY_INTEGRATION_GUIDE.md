# Security Integration Implementation Guide

**Created:** February 27, 2026  
**Audience:** Developers  
**Purpose:** Practical guide for integrating security services into features

---

## Quick Start

### 1. Import Security Services

```typescript
// Always import from the feature barrel
import { 
  secureQueryBuilderService,
  PaginationParams,
  inputSanitizationService,
  queryValidationService,
  encryptionService,
  securityAuditService
} from '@server/features/security';
```

### 2. Secure Your Database Queries

**Before (Vulnerable):**
```typescript
// ❌ SQL Injection Risk
const users = await db.query.users.findMany({
  where: eq(users.email, req.query.email)
});
```

**After (Secure):**
```typescript
// ✅ Parameterized Query
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE email = ${email}',
  { email: req.query.email }
);
const users = await db.execute(query.sql, query.params);
```

### 3. Sanitize User Input

**Before (Vulnerable):**
```typescript
// ❌ XSS Risk
const comment = await createComment({
  text: req.body.text
});
```

**After (Secure):**
```typescript
// ✅ Sanitized Input
const sanitizedText = inputSanitizationService.sanitizeHtml(req.body.text);
const comment = await createComment({
  text: sanitizedText
});
```

### 4. Validate Pagination

**Before (Vulnerable):**
```typescript
// ❌ No Validation
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
```

**After (Secure):**
```typescript
// ✅ Validated Pagination
const pagination = PaginationParams.create(req.query.page, req.query.limit);
// pagination.page, pagination.limit, pagination.offset are validated
```

### 5. Encrypt Sensitive Data

**Before (Vulnerable):**
```typescript
// ❌ Plain Text PII
await db.insert(users).values({
  email: req.body.email,
  phone: req.body.phone
});
```

**After (Secure):**
```typescript
// ✅ Encrypted PII
await db.insert(users).values({
  email: req.body.email,
  phone: await encryptionService.encrypt(req.body.phone)
});
```

### 6. Audit Sensitive Operations

**Before (No Audit):**
```typescript
// ❌ No Audit Trail
await deleteUser(userId);
```

**After (Audited):**
```typescript
// ✅ Audited Operation
await securityAuditService.logSecurityEvent({
  type: 'user_deletion',
  user_id: req.user.id,
  target_user_id: userId,
  ip: req.ip,
  description: 'Admin deleted user account'
});
await deleteUser(userId);
```

---

## Feature-Specific Examples

### Bills Feature

```typescript
// File: server/features/bills/application/services/bill.service.ts

import { 
  secureQueryBuilderService,
  PaginationParams,
  inputSanitizationService,
  securityAuditService
} from '@server/features/security';

export class BillService {
  /**
   * Search bills with secure query
   */
  async searchBills(searchTerm: string, page: string, limit: string) {
    // Validate pagination
    const pagination = PaginationParams.create(page, limit);
    
    // Create safe LIKE pattern
    const safePattern = inputSanitizationService.createSafeLikePattern(searchTerm);
    
    // Build secure query
    const query = secureQueryBuilderService.buildParameterizedQuery(
      `SELECT * FROM bills 
       WHERE title ILIKE \${pattern} 
       LIMIT \${limit} OFFSET \${offset}`,
      { 
        pattern: safePattern,
        limit: pagination.limit,
        offset: pagination.offset
      }
    );
    
    // Execute query
    const bills = await db.execute(query.sql, query.params);
    
    return {
      bills,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: bills.length
      }
    };
  }
  
  /**
   * Create bill with audit logging
   */
  async createBill(billData: CreateBillDTO, userId: string) {
    // Sanitize input
    const sanitizedTitle = inputSanitizationService.sanitizeString(billData.title);
    const sanitizedText = inputSanitizationService.sanitizeHtml(billData.text);
    
    // Create bill
    const bill = await db.insert(bills).values({
      title: sanitizedTitle,
      text: sanitizedText,
      created_by: userId
    });
    
    // Audit log
    await securityAuditService.logSecurityEvent({
      type: 'bill_created',
      user_id: userId,
      bill_id: bill.id,
      description: `User created bill: ${sanitizedTitle}`
    });
    
    return bill;
  }
}
```

### Community Feature

```typescript
// File: server/features/community/application/services/comment.service.ts

import { 
  inputSanitizationService,
  queryValidationService,
  securityAuditService
} from '@server/features/security';

export class CommentService {
  /**
   * Create comment with XSS protection
   */
  async createComment(commentData: CreateCommentDTO, userId: string) {
    // Sanitize HTML to prevent XSS
    const sanitizedText = inputSanitizationService.sanitizeHtml(commentData.text);
    
    // Validate input
    const validation = queryValidationService.validateInputs([
      sanitizedText,
      commentData.billId,
      userId
    ]);
    
    if (validation.hasErrors()) {
      throw new Error(validation.getErrorMessage());
    }
    
    // Create comment
    const comment = await db.insert(comments).values({
      text: sanitizedText,
      bill_id: commentData.billId,
      user_id: userId
    });
    
    return comment;
  }
  
  /**
   * Get comments with sanitized output
   */
  async getComments(billId: string, page: string, limit: string) {
    const pagination = PaginationParams.create(page, limit);
    
    const query = secureQueryBuilderService.buildParameterizedQuery(
      `SELECT * FROM comments 
       WHERE bill_id = \${billId} 
       ORDER BY created_at DESC
       LIMIT \${limit} OFFSET \${offset}`,
      { 
        billId,
        limit: pagination.limit,
        offset: pagination.offset
      }
    );
    
    const comments = await db.execute(query.sql, query.params);
    
    // Sanitize output to prevent data leakage
    const sanitizedComments = queryValidationService.sanitizeOutput(comments);
    
    return sanitizedComments;
  }
}
```

### Users Feature

```typescript
// File: server/features/users/application/services/user.service.ts

import { 
  encryptionService,
  securityAuditService,
  dataPrivacyService
} from '@server/features/security';

export class UserService {
  /**
   * Create user with encrypted PII
   */
  async createUser(userData: CreateUserDTO) {
    // Encrypt sensitive data
    const encryptedPhone = await encryptionService.encrypt(userData.phone);
    const encryptedNationalId = await encryptionService.encrypt(userData.nationalId);
    
    // Create user
    const user = await db.insert(users).values({
      email: userData.email,
      phone: encryptedPhone,
      national_id: encryptedNationalId,
      password_hash: await encryptionService.hashPassword(userData.password)
    });
    
    // Audit log
    await securityAuditService.logSecurityEvent({
      type: 'user_created',
      user_id: user.id,
      description: 'New user account created'
    });
    
    return user;
  }
  
  /**
   * Get user with decrypted PII
   */
  async getUser(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!user) return null;
    
    // Decrypt sensitive data
    return {
      ...user,
      phone: await encryptionService.decrypt(user.phone),
      national_id: await encryptionService.decrypt(user.national_id)
    };
  }
  
  /**
   * Anonymize user data for analytics
   */
  async anonymizeUserForAnalytics(userId: string) {
    const user = await this.getUser(userId);
    return dataPrivacyService.anonymizeUserData(user);
  }
}
```

### Admin Feature

```typescript
// File: server/features/admin/application/services/admin.service.ts

import { 
  secureQueryBuilderService,
  PaginationParams,
  securityAuditService
} from '@server/features/security';

export class AdminService {
  /**
   * List users with secure pagination
   */
  async listUsers(page: string, limit: string, search?: string) {
    const pagination = PaginationParams.create(page, limit);
    
    let queryTemplate = 'SELECT * FROM users';
    const params: Record<string, any> = {
      limit: pagination.limit,
      offset: pagination.offset
    };
    
    if (search) {
      const safePattern = inputSanitizationService.createSafeLikePattern(search);
      queryTemplate += ' WHERE email ILIKE ${pattern}';
      params.pattern = safePattern;
    }
    
    queryTemplate += ' LIMIT ${limit} OFFSET ${offset}';
    
    const query = secureQueryBuilderService.buildParameterizedQuery(
      queryTemplate,
      params
    );
    
    const users = await db.execute(query.sql, query.params);
    
    return {
      users,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: users.length
      }
    };
  }
  
  /**
   * Delete user with audit logging
   */
  async deleteUser(userId: string, adminId: string, reason: string) {
    // Audit log BEFORE deletion
    await securityAuditService.logSecurityEvent({
      type: 'user_deletion',
      user_id: adminId,
      target_user_id: userId,
      description: `Admin deleted user. Reason: ${reason}`,
      severity: 'high'
    });
    
    // Delete user
    await db.delete(users).where(eq(users.id, userId));
    
    return { success: true };
  }
  
  /**
   * Update user role with audit logging
   */
  async updateUserRole(userId: string, newRole: string, adminId: string) {
    const oldUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    // Update role
    await db.update(users)
      .set({ role: newRole })
      .where(eq(users.id, userId));
    
    // Audit log
    await securityAuditService.logSecurityEvent({
      type: 'role_change',
      user_id: adminId,
      target_user_id: userId,
      description: `Admin changed user role from ${oldUser.role} to ${newRole}`,
      severity: 'medium'
    });
    
    return { success: true };
  }
}
```

### Recommendation Feature

```typescript
// File: server/features/recommendation/application/services/recommendation.service.ts

import { 
  secureQueryBuilderService,
  PaginationParams,
  dataPrivacyService
} from '@server/features/security';

export class RecommendationService {
  /**
   * Get recommendations with privacy-compliant tracking
   */
  async getRecommendations(userId: string, page: string, limit: string) {
    const pagination = PaginationParams.create(page, limit);
    
    // Build secure query
    const query = secureQueryBuilderService.buildParameterizedQuery(
      `SELECT r.* FROM recommendations r
       JOIN user_preferences up ON r.category = up.category
       WHERE up.user_id = \${userId}
       ORDER BY r.score DESC
       LIMIT \${limit} OFFSET \${offset}`,
      { 
        userId,
        limit: pagination.limit,
        offset: pagination.offset
      }
    );
    
    const recommendations = await db.execute(query.sql, query.params);
    
    // Track view with anonymized user ID
    const anonymizedUserId = dataPrivacyService.anonymizeUserId(userId);
    await this.trackRecommendationView(
      anonymizedUserId,
      recommendations.map(r => r.id)
    );
    
    return {
      recommendations,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: recommendations.length
      }
    };
  }
}
```

### USSD Feature

```typescript
// File: server/features/universal_access/ussd.service.ts

import { 
  encryptionService,
  securityAuditService,
  intrusionDetectionService
} from '@server/features/security';

export class USSDService {
  /**
   * Handle USSD session with security
   */
  async handleSession(
    phoneNumber: string,
    input: string,
    sessionId: string
  ) {
    // Encrypt phone number
    const encryptedPhone = await encryptionService.encrypt(phoneNumber);
    
    // Check for suspicious activity
    const threat = await intrusionDetectionService.detectUSSDThreat({
      phoneNumber: encryptedPhone,
      sessionId,
      input,
      timestamp: new Date()
    });
    
    if (threat.isDetected) {
      // Audit log threat
      await securityAuditService.logSecurityEvent({
        type: 'ussd_threat_detected',
        session_id: sessionId,
        threat_type: threat.type,
        severity: 'high',
        description: `USSD threat detected: ${threat.description}`
      });
      
      return {
        error: 'Session terminated for security reasons',
        code: 'SECURITY_THREAT'
      };
    }
    
    // Process USSD input
    const response = await this.processInput(input, sessionId);
    
    // Audit log transaction
    await securityAuditService.logSecurityEvent({
      type: 'ussd_transaction',
      session_id: sessionId,
      action: response.action,
      description: `USSD action: ${response.action}`
    });
    
    return response;
  }
}
```

### Government Data Feature

```typescript
// File: server/features/government-data/application/services/sync.service.ts

import { 
  encryptionService,
  securityAuditService,
  queryValidationService,
  dataPrivacyService
} from '@server/features/security';

export class GovernmentDataSyncService {
  /**
   * Sync government data with security
   */
  async syncData(apiEndpoint: string, credentials: APICredentials) {
    // Encrypt API credentials before storage
    const encryptedCreds = await encryptionService.encrypt(
      JSON.stringify(credentials)
    );
    
    // Store encrypted credentials
    await this.storeCredentials(apiEndpoint, encryptedCreds);
    
    // Fetch data from government API
    const rawData = await this.fetchFromAPI(apiEndpoint, credentials);
    
    // Validate data
    const validation = queryValidationService.validateInputs([rawData]);
    if (validation.hasErrors()) {
      await securityAuditService.logSecurityEvent({
        type: 'gov_data_validation_failed',
        endpoint: apiEndpoint,
        errors: validation.errors,
        severity: 'high'
      });
      throw new Error(`Data validation failed: ${validation.getErrorMessage()}`);
    }
    
    // Anonymize PII per GDPR
    const anonymizedData = await dataPrivacyService.anonymizeGovernmentData(
      validation.sanitizedParams
    );
    
    // Store data
    await this.storeData(anonymizedData);
    
    // Audit log success
    await securityAuditService.logSecurityEvent({
      type: 'gov_data_sync_complete',
      endpoint: apiEndpoint,
      records_synced: anonymizedData.length,
      description: `Successfully synced ${anonymizedData.length} records`
    });
    
    return {
      success: true,
      recordsSynced: anonymizedData.length
    };
  }
}
```

---

## Common Patterns

### Pattern 1: Secure List Endpoint

```typescript
async listItems(req: Request, res: Response) {
  try {
    // 1. Validate pagination
    const pagination = PaginationParams.create(
      req.query.page as string,
      req.query.limit as string
    );
    
    // 2. Build secure query
    const query = secureQueryBuilderService.buildParameterizedQuery(
      'SELECT * FROM items LIMIT ${limit} OFFSET ${offset}',
      { 
        limit: pagination.limit,
        offset: pagination.offset
      }
    );
    
    // 3. Execute query
    const items = await db.execute(query.sql, query.params);
    
    // 4. Sanitize output
    const sanitizedItems = queryValidationService.sanitizeOutput(items);
    
    // 5. Return response
    res.json({
      items: sanitizedItems,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: items.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Pattern 2: Secure Search Endpoint

```typescript
async searchItems(req: Request, res: Response) {
  try {
    // 1. Validate pagination
    const pagination = PaginationParams.create(
      req.query.page as string,
      req.query.limit as string
    );
    
    // 2. Create safe LIKE pattern
    const searchTerm = req.query.q as string;
    const safePattern = inputSanitizationService.createSafeLikePattern(searchTerm);
    
    // 3. Build secure query
    const query = secureQueryBuilderService.buildParameterizedQuery(
      `SELECT * FROM items 
       WHERE name ILIKE \${pattern} 
       LIMIT \${limit} OFFSET \${offset}`,
      { 
        pattern: safePattern,
        limit: pagination.limit,
        offset: pagination.offset
      }
    );
    
    // 4. Execute query
    const items = await db.execute(query.sql, query.params);
    
    // 5. Sanitize output
    const sanitizedItems = queryValidationService.sanitizeOutput(items);
    
    res.json({
      items: sanitizedItems,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: items.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Pattern 3: Secure Create Endpoint

```typescript
async createItem(req: Request, res: Response) {
  try {
    // 1. Sanitize input
    const sanitizedName = inputSanitizationService.sanitizeString(req.body.name);
    const sanitizedDescription = inputSanitizationService.sanitizeHtml(req.body.description);
    
    // 2. Validate input
    const validation = queryValidationService.validateInputs([
      sanitizedName,
      sanitizedDescription
    ]);
    
    if (validation.hasErrors()) {
      return res.status(400).json({ 
        error: validation.getErrorMessage() 
      });
    }
    
    // 3. Create item
    const item = await db.insert(items).values({
      name: sanitizedName,
      description: sanitizedDescription,
      created_by: req.user.id
    });
    
    // 4. Audit log
    await securityAuditService.logSecurityEvent({
      type: 'item_created',
      user_id: req.user.id,
      item_id: item.id,
      description: `User created item: ${sanitizedName}`
    });
    
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Pattern 4: Secure Update Endpoint

```typescript
async updateItem(req: Request, res: Response) {
  try {
    const itemId = req.params.id;
    
    // 1. Get existing item
    const existingItem = await db.query.items.findFirst({
      where: eq(items.id, itemId)
    });
    
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // 2. Sanitize input
    const sanitizedName = inputSanitizationService.sanitizeString(req.body.name);
    
    // 3. Update item
    await db.update(items)
      .set({ name: sanitizedName })
      .where(eq(items.id, itemId));
    
    // 4. Audit log
    await securityAuditService.logSecurityEvent({
      type: 'item_updated',
      user_id: req.user.id,
      item_id: itemId,
      description: `User updated item from "${existingItem.name}" to "${sanitizedName}"`
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Pattern 5: Secure Delete Endpoint

```typescript
async deleteItem(req: Request, res: Response) {
  try {
    const itemId = req.params.id;
    
    // 1. Audit log BEFORE deletion
    await securityAuditService.logSecurityEvent({
      type: 'item_deleted',
      user_id: req.user.id,
      item_id: itemId,
      description: `User deleted item`,
      severity: 'medium'
    });
    
    // 2. Delete item
    await db.delete(items).where(eq(items.id, itemId));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## Testing Security Integration

### Unit Tests

```typescript
import { 
  secureQueryBuilderService,
  PaginationParams,
  inputSanitizationService
} from '@server/features/security';

describe('BillService Security', () => {
  describe('searchBills', () => {
    it('should sanitize search term', async () => {
      const maliciousInput = "test'; DROP TABLE bills; --";
      const service = new BillService();
      
      // Should not throw SQL injection error
      await expect(
        service.searchBills(maliciousInput, '1', '20')
      ).resolves.not.toThrow();
    });
    
    it('should validate pagination', async () => {
      const service = new BillService();
      
      // Should enforce max limit
      const result = await service.searchBills('test', '1', '200');
      expect(result.pagination.limit).toBe(100); // Max limit
    });
  });
  
  describe('createBill', () => {
    it('should sanitize HTML input', async () => {
      const xssInput = '<script>alert("XSS")</script>';
      const service = new BillService();
      
      const bill = await service.createBill({
        title: 'Test Bill',
        text: xssInput
      }, 'user-123');
      
      // Should remove script tags
      expect(bill.text).not.toContain('<script>');
    });
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import { app } from '@server/app';

describe('Bills API Security', () => {
  describe('GET /api/bills', () => {
    it('should prevent SQL injection', async () => {
      const response = await request(app)
        .get('/api/bills')
        .query({ search: "'; DROP TABLE bills; --" });
      
      expect(response.status).toBe(200);
      // Database should still exist
      const bills = await db.query.bills.findMany();
      expect(bills).toBeDefined();
    });
    
    it('should enforce pagination limits', async () => {
      const response = await request(app)
        .get('/api/bills')
        .query({ page: '1', limit: '200' });
      
      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100); // Max limit
    });
  });
  
  describe('POST /api/bills', () => {
    it('should prevent XSS', async () => {
      const response = await request(app)
        .post('/api/bills')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Bill',
          text: '<script>alert("XSS")</script>'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.text).not.toContain('<script>');
    });
  });
});
```

---

## Checklist for Security Integration

### For Every Feature

- [ ] All database queries use `secureQueryBuilderService`
- [ ] All user inputs sanitized with `inputSanitizationService`
- [ ] All pagination uses `PaginationParams`
- [ ] All PII encrypted with `encryptionService`
- [ ] All sensitive operations logged with `securityAuditService`
- [ ] All API responses sanitized with `queryValidationService.sanitizeOutput()`
- [ ] Unit tests for security functions
- [ ] Integration tests for security vulnerabilities
- [ ] Security code review completed
- [ ] Documentation updated

### For Public Endpoints

- [ ] Rate limiting configured
- [ ] Intrusion detection enabled
- [ ] Input validation comprehensive
- [ ] Error messages don't leak information
- [ ] CORS configured correctly

### For Admin Endpoints

- [ ] Authentication required
- [ ] Authorization checked
- [ ] All actions audit logged
- [ ] Elevated privilege operations monitored
- [ ] Rollback capability tested

---

## Common Mistakes to Avoid

### ❌ DON'T: String Concatenation

```typescript
// NEVER do this
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

### ✅ DO: Parameterized Queries

```typescript
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE email = ${email}',
  { email }
);
```

### ❌ DON'T: Unvalidated Pagination

```typescript
// NEVER do this
const page = parseInt(req.query.page);
const limit = parseInt(req.query.limit);
```

### ✅ DO: Validated Pagination

```typescript
const pagination = PaginationParams.create(req.query.page, req.query.limit);
```

### ❌ DON'T: Unsanitized HTML

```typescript
// NEVER do this
const comment = req.body.text;
```

### ✅ DO: Sanitized HTML

```typescript
const comment = inputSanitizationService.sanitizeHtml(req.body.text);
```

### ❌ DON'T: Plain Text PII

```typescript
// NEVER do this
await db.insert(users).values({ phone: req.body.phone });
```

### ✅ DO: Encrypted PII

```typescript
await db.insert(users).values({
  phone: await encryptionService.encrypt(req.body.phone)
});
```

### ❌ DON'T: No Audit Logging

```typescript
// NEVER do this for sensitive operations
await deleteUser(userId);
```

### ✅ DO: Audit Logged

```typescript
await securityAuditService.logSecurityEvent({
  type: 'user_deletion',
  user_id: req.user.id,
  target_user_id: userId
});
await deleteUser(userId);
```

---

## Getting Help

### Documentation
- [Security Feature README](../security/README.md)
- [Security Architecture](../security/ARCHITECTURE.md)
- [Security Cross-Feature Integration](./SECURITY_CROSS_FEATURE_INTEGRATION.md)

### Code Review
- Tag `@security-team` in pull requests
- Use security checklist in PR template
- Request security review for sensitive changes

### Questions
- Slack: #security-questions
- Email: security@chanuka.org
- Office Hours: Tuesdays 2-4 PM

---

**Document Status:** Active  
**Last Updated:** February 27, 2026  
**Next Review:** March 27, 2026
