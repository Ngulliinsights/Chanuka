# Task 1.1.2: Shared Type Usage Investigation Findings

## Investigation Date
2026-02-18

## Summary
**CRITICAL FINDING**: The shared types from `base-client.ts` ARE actively used by other code in the codebase. These types MUST be extracted before deleting `base-client.ts`.

## Detailed Findings

### 1. RequestInterceptor Type
**Status**: ✅ ACTIVELY USED - EXTRACTION REQUIRED

**Usage Locations**:
- `client/src/core/api/client.ts` - Used by UnifiedApiClientImpl (globalApiClient)
  - Line 154: `private requestInterceptors: RequestInterceptor[] = [];`
  - Line 840: `addRequestInterceptor(interceptor: RequestInterceptor): void`
  - Line 920: `createAuthRequestInterceptor` function return type
  
- `client/src/core/api/interceptors.ts` - Multiple interceptor implementations
  - Line 20: Local type definition (duplicate)
  - Line 308: `headerInterceptor: RequestInterceptor`
  - Line 349: `loggingInterceptor: RequestInterceptor`
  - Line 371: `timeoutInterceptor` return type
  - Line 399: `sanitizationInterceptor: RequestInterceptor`
  - Line 426: `compressionInterceptor: RequestInterceptor`
  - Line 445: `circuitBreakerInterceptor: RequestInterceptor`
  - Line 660: `requestInterceptors: RequestInterceptor[]` array
  - Line 840: `addRequestInterceptor` function parameter
  - Line 868: `removeRequestInterceptor` function parameter

- `client/src/core/api/circuit-breaker-client.ts`
  - Line 12: Imports `processRequestInterceptors` which uses the type

- `client/src/core/api/serialization-interceptors.ts`
  - Line 36: Imports from base-client
  - Line 43: `serializationRequestInterceptor: RequestInterceptor`

- `client/src/core/api/types/common.ts`
  - Line 172: Has its own definition (duplicate)

- `client/src/core/api/types/config.ts`
  - Line 136: Used in `ClientInterceptors` interface

**Recommendation**: Extract to `client/src/core/api/types/interceptors.ts`

---

### 2. ResponseInterceptor Type
**Status**: ✅ ACTIVELY USED - EXTRACTION REQUIRED

**Usage Locations**:
- `client/src/core/api/client.ts` - Used by UnifiedApiClientImpl (globalApiClient)
  - Line 156: `private responseInterceptors: ResponseInterceptor[] = [];`
  - Imported from types/common

- `client/src/core/api/interceptors.ts` - Multiple interceptor implementations
  - Line 23: Local type definition (duplicate)
  - Line 483: `responseLoggingInterceptor: ResponseInterceptor`
  - Line 505: `errorResponseInterceptor: ResponseInterceptor`
  - Line 545: `cacheHeaderInterceptor: ResponseInterceptor`
  - Line 572: `circuitBreakerResponseInterceptor: ResponseInterceptor`
  - Line 676: `responseInterceptors: ResponseInterceptor[]` array
  - Line 729: `processResponseInterceptors` function
  - Line 779: `conditionalResponseInterceptor` function
  - Line 817: `combineResponseInterceptors` function
  - Line 855: `addResponseInterceptor` function parameter
  - Line 880: `removeResponseInterceptor` function parameter

- `client/src/core/api/serialization-interceptors.ts`
  - Line 36: Imports from base-client
  - Line 74: `deserializationResponseInterceptor: ResponseInterceptor`
  - Line 165: `installSerializationInterceptors` function parameter

- `client/src/core/api/types/common.ts`
  - Line 173: Has its own definition (duplicate)

- `client/src/core/api/types/config.ts`
  - Line 137: Used in `ClientInterceptors` interface

**Recommendation**: Extract to `client/src/core/api/types/interceptors.ts`

---

### 3. ErrorInterceptor Type
**Status**: ✅ ACTIVELY USED - EXTRACTION REQUIRED

**Usage Locations**:
- `client/src/core/api/base-client.ts`
  - Line 80: Type definition
  - Line 122: `protected errorInterceptors: ErrorInterceptor[] = [];`
  - Line 161: `addErrorInterceptor(interceptor: ErrorInterceptor): void`
  - Line 253: Used in error handling loop

- `client/src/core/api/authenticated-client.ts`
  - Line 70: `this.addErrorInterceptor(...)` - Uses the type indirectly

- `client/src/core/api/index.ts`
  - Line 21: Exported from barrel

**Recommendation**: Extract to `client/src/core/api/types/interceptors.ts`

---

### 4. BaseClientRequest Type
**Status**: ✅ ACTIVELY USED - EXTRACTION REQUIRED

**Usage Locations**:
- `client/src/core/api/client.ts` - Used by UnifiedApiClientImpl (globalApiClient)
  - Line 13: Imported as `BaseApiRequest` (alias)
  - Line 315: Used in `applyRequestInterceptors` function
  - Line 922: Used in `createAuthRequestInterceptor` function

- `client/src/core/api/authenticated-client.ts`
  - Line 17: Imported
  - Line 105: `authenticatedRequest<T>(request: BaseClientRequest)` method parameter

- `client/src/core/api/authentication.ts`
  - Line 12: Imported
  - Line 28: `intercept(request: BaseClientRequest): Promise<BaseClientRequest>` method

- `client/src/core/api/safe-client.ts`
  - Line 10: Imported
  - Line 34: `safeRequest<T>(request: BaseClientRequest)` method parameter
  - Line 113: `deduplicatedRequest<T>(request: BaseClientRequest)` method parameter
  - Line 146: `safeDeduplicatedRequest<T>(request: BaseClientRequest)` method parameter
  - Line 166: `batchRequests<T>(requests: BaseClientRequest[])` method parameter
  - Line 175: `batchRequestsWithLimit<T>(requests: BaseClientRequest[], ...)` method parameter
  - Line 193: `requestWithTimeout<T>(request: BaseClientRequest, ...)` method parameter
  - Line 223: `requestWithFallback<T>(request: BaseClientRequest, ...)` method parameter
  - Line 256: `retryRequest<T>(request: BaseClientRequest, ...)` method parameter
  - Line 335: `getRequestKey(request: BaseClientRequest)` method parameter

- `client/src/core/api/serialization-interceptors.ts`
  - Line 36: Imported
  - Line 43: `serializationRequestInterceptor` function parameter

**Recommendation**: Extract to `client/src/core/api/types/request.ts` or `types/common.ts`

---

### 5. BaseClientResponse Type
**Status**: ✅ ACTIVELY USED - EXTRACTION REQUIRED

**Usage Locations**:
- `client/src/core/api/safe-client.ts`
  - Line 10: Imported
  - Line 17: Used in `SafeApiResult<T>` type definition
  - Line 113: `deduplicatedRequest<T>` return type
  - Line 125: Used in request queue type

- `client/src/core/api/serialization-interceptors.ts`
  - Line 36: Imported
  - Line 75: `deserializationResponseInterceptor` function parameter and return type

**Recommendation**: Extract to `client/src/core/api/types/response.ts` or `types/common.ts`

---

## Type Duplication Issues

### Duplicate Definitions Found:
1. **RequestInterceptor** - Defined in 3 places:
   - `base-client.ts` (line 66)
   - `interceptors.ts` (line 20) - local definition
   - `types/common.ts` (line 172)

2. **ResponseInterceptor** - Defined in 3 places:
   - `base-client.ts` (line 74)
   - `interceptors.ts` (line 23) - local definition
   - `types/common.ts` (line 173)

3. **ErrorInterceptor** - Defined in 1 place:
   - `base-client.ts` (line 80)

---

## Extraction Strategy

### Step 1: Create Shared Type Files
Create `client/src/core/api/types/interceptors.ts` with all interceptor types:

```typescript
// client/src/core/api/types/interceptors.ts

/**
 * Request interceptor interface
 * Allows modification of requests before they are sent
 */
export interface RequestInterceptor {
  (request: BaseClientRequest): Promise<BaseClientRequest> | BaseClientRequest;
}

/**
 * Response interceptor interface
 * Allows modification of responses after they are received
 */
export interface ResponseInterceptor {
  <T>(response: BaseClientResponse<T>): Promise<BaseClientResponse<T>> | BaseClientResponse<T>;
}

/**
 * Error interceptor interface
 * Allows handling and transformation of errors
 */
export interface ErrorInterceptor {
  (error: ApiError): Promise<ApiError> | ApiError | never;
}
```

### Step 2: Create Request/Response Type Files
Move `BaseClientRequest` and `BaseClientResponse` to `client/src/core/api/types/common.ts` (already exists, consolidate):

```typescript
// client/src/core/api/types/common.ts

/**
 * API request configuration
 */
export interface BaseClientRequest {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: RequestBody;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

/**
 * Standardized API response
 */
export interface BaseClientResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
}
```

### Step 3: Update Barrel Exports
Update `client/src/core/api/types/index.ts`:

```typescript
export * from './interceptors';
export * from './common';
export * from './config';
// ... other exports
```

### Step 4: Update All Import Statements
Update imports in all files that currently import from `base-client.ts`:
- `client.ts`
- `authenticated-client.ts`
- `authentication.ts`
- `safe-client.ts`
- `serialization-interceptors.ts`
- `interceptors.ts`
- `circuit-breaker-client.ts`

### Step 5: Remove Duplicate Definitions
Remove local type definitions in:
- `interceptors.ts` (lines 20-23)
- Consolidate with `types/common.ts` definitions

---

## Conclusion

**EXTRACTION IS MANDATORY**: All five types investigated are actively used by:
1. **globalApiClient** (UnifiedApiClientImpl) - The canonical API client
2. **interceptors.ts** - Core interceptor infrastructure
3. **serialization-interceptors.ts** - Serialization layer
4. **safe-client.ts** - Safe wrapper (to be deleted, but uses types)
5. **authenticated-client.ts** - Authenticated wrapper (to be deleted, but uses types)

**Action Required**: Before proceeding with Task 1.1.6 (Delete unused client files), Task 1.1.5 (Extract shared types) MUST be completed.

**Files to Create**:
- `client/src/core/api/types/interceptors.ts` (new)

**Files to Update**:
- `client/src/core/api/types/common.ts` (consolidate request/response types)
- `client/src/core/api/types/index.ts` (add exports)
- All files importing from `base-client.ts` (update imports)

**Files to Clean**:
- `client/src/core/api/interceptors.ts` (remove duplicate type definitions)
