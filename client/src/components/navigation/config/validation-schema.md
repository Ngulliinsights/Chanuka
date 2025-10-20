# Navigation Configuration Validation Schema

## Overview

This document defines the validation schemas for navigation configuration to ensure data integrity and type safety at runtime.

## Zod Validation Schemas

### Core Type Schemas

```typescript
import { z } from 'zod';

// User role enum
export const UserRoleSchema = z.enum(['public', 'citizen', 'expert', 'admin', 'journalist', 'advocate']);

// Navigation section enum
export const NavigationSectionSchema = z.enum(['legislative', 'community', 'tools', 'user', 'admin']);

// Access denial reason enum
export const AccessDenialReasonSchema = z.enum(['unauthenticated', 'insufficient_role', 'admin_required', 'custom_condition']);
```

### Navigation Item Schema

```typescript
export const NavigationItemSchema = z.object({
  id: z.string()
    .min(1, 'ID is required')
    .max(50, 'ID must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID must contain only letters, numbers, hyphens, and underscores'),

  label: z.string()
    .min(1, 'Label is required')
    .max(100, 'Label must be less than 100 characters'),

  href: z.string()
    .url('Href must be a valid URL')
    .refine(href => href.startsWith('/'), 'Href must be a relative path starting with /'),

  icon: z.any(), // React component - validated at runtime

  section: NavigationSectionSchema,

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),

  badge: z.number()
    .int('Badge must be an integer')
    .min(0, 'Badge must be non-negative')
    .optional(),

  allowedRoles: z.array(UserRoleSchema)
    .min(1, 'At least one role must be specified')
    .optional(),

  requiresAuth: z.boolean().optional(),

  adminOnly: z.boolean().optional(),

  condition: z.function()
    .args(UserRoleSchema, z.any())
    .returns(z.boolean())
    .optional(),

  priority: z.number()
    .int('Priority must be an integer')
    .min(0, 'Priority must be non-negative')
    .max(100, 'Priority must be less than or equal to 100')
    .optional(),
}).strict('NavigationItem contains unexpected properties');
```

### Page Relationship Schemas

```typescript
export const RelatedPageSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),

  title: z.string().min(1, 'Title is required'),

  path: z.string()
    .min(1, 'Path is required')
    .refine(path => path.startsWith('/'), 'Path must start with /'),

  description: z.string().min(1, 'Description is required'),

  category: NavigationSectionSchema,

  type: z.enum(['parent', 'child', 'sibling', 'related']).optional(),

  weight: z.number()
    .int('Weight must be an integer')
    .min(1, 'Weight must be at least 1')
    .max(10, 'Weight must be at most 10'),

  context: z.string().min(1, 'Context is required'),

  relevanceScore: z.number()
    .min(0, 'Relevance score must be non-negative')
    .max(10, 'Relevance score must be at most 10'),
}).strict();

export const PageRelationshipSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),

  relatedPages: z.record(
    z.string(),
    z.object({
      type: z.enum(['parent', 'child', 'sibling', 'related']),
      weight: z.number().int().min(1).max(10),
      context: z.string().min(1),
    })
  ),
}).strict();
```

### Navigation State Schemas

```typescript
export const BreadcrumbItemSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  path: z.string().min(1, 'Path is required'),
  isActive: z.boolean(),
}).strict();

export const NavigationPreferencesSchema = z.object({
  defaultLandingPage: z.string()
    .min(1, 'Default landing page is required')
    .refine(path => path.startsWith('/'), 'Default landing page must start with /'),

  favoritePages: z.array(z.string()),

  recentlyVisited: z.array(z.object({
    path: z.string().min(1),
    title: z.string().min(1),
    visitedAt: z.date(),
    visitCount: z.number().int().min(0),
  })),

  compactMode: z.boolean(),
}).strict();

export const NavigationStateSchema = z.object({
  currentPath: z.string().min(1, 'Current path is required'),
  previousPath: z.string().optional(),
  breadcrumbs: z.array(BreadcrumbItemSchema),
  relatedPages: z.array(RelatedPageSchema),
  currentSection: NavigationSectionSchema,
  sidebarOpen: z.boolean(),
  mobileMenuOpen: z.boolean(),
  userRole: UserRoleSchema,
  preferences: NavigationPreferencesSchema,
}).strict();
```

## Configuration Schemas

### Main Navigation Configuration

```typescript
export const NavigationConfigSchema = z.object({
  sections: z.record(z.string()), // Section titles

  sectionOrder: z.array(NavigationSectionSchema)
    .length(5, 'Section order must contain exactly 5 sections')
    .refine(order => {
      const requiredSections = ['legislative', 'community', 'tools', 'user', 'admin'];
      return requiredSections.every(section => order.includes(section as NavigationSection));
    }, 'Section order must include all required sections'),

  navigationItems: z.array(NavigationItemSchema)
    .min(1, 'At least one navigation item is required'),

  pageRelationships: z.record(z.string(), z.array(PageRelationshipSchema)).optional(),
}).strict();
```

### Extended Configuration with Validation Rules

```typescript
export const ExtendedNavigationConfigSchema = NavigationConfigSchema.extend({
  // Additional validation rules
  navigationItems: z.array(NavigationItemSchema)
    .refine(items => {
      // Check for duplicate IDs
      const ids = items.map(item => item.id);
      return ids.length === new Set(ids).size;
    }, 'Navigation items must have unique IDs')

    .refine(items => {
      // Check for duplicate hrefs
      const hrefs = items.map(item => item.href);
      return hrefs.length === new Set(hrefs).size;
    }, 'Navigation items must have unique hrefs')

    .refine(items => {
      // Validate priority uniqueness within sections
      const sectionPriorities = new Map<string, Set<number>>();
      for (const item of items) {
        const section = item.section;
        const priority = item.priority || 0;

        if (!sectionPriorities.has(section)) {
          sectionPriorities.set(section, new Set());
        }

        const priorities = sectionPriorities.get(section)!;
        if (priorities.has(priority)) {
          return false; // Duplicate priority in section
        }
        priorities.add(priority);
      }
      return true;
    }, 'Navigation items must have unique priorities within their sections'),
});
```

## Runtime Validation Functions

### Schema Validators

```typescript
export const validateNavigationItem = (data: unknown): NavigationItem => {
  const result = NavigationItemSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError('Invalid NavigationItem', result.error);
  }
  return result.data;
};

export const validateNavigationConfig = (data: unknown): NavigationConfig => {
  const result = ExtendedNavigationConfigSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError('Invalid NavigationConfig', result.error);
  }
  return result.data;
};

export const validatePageRelationship = (data: unknown): PageRelationship => {
  const result = PageRelationshipSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError('Invalid PageRelationship', result.error);
  }
  return result.data;
};
```

### Type Guards

```typescript
export const isNavigationItem = (value: unknown): value is NavigationItem => {
  return NavigationItemSchema.safeParse(value).success;
};

export const isUserRole = (value: unknown): value is UserRole => {
  return UserRoleSchema.safeParse(value).success;
};

export const isNavigationSection = (value: unknown): value is NavigationSection => {
  return NavigationSectionSchema.safeParse(value).success;
};
```

### Partial Validation

```typescript
export const validatePartialNavigationItem = (data: unknown): Partial<NavigationItem> => {
  // Allow partial validation for updates
  const result = NavigationItemSchema.partial().safeParse(data);
  if (!result.success) {
    throw new ValidationError('Invalid partial NavigationItem', result.error);
  }
  return result.data;
};
```

## Error Handling

### Custom Validation Error

```typescript
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly zodError: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  get fieldErrors(): Record<string, string[]> {
    return this.zodError.flatten().fieldErrors;
  }

  get formErrors(): string[] {
    return this.zodError.flatten().formErrors;
  }
}
```

### Error Formatting

```typescript
export const formatValidationError = (error: ValidationError): string => {
  const fieldErrors = Object.entries(error.fieldErrors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('; ');

  const formErrors = error.formErrors.join('; ');

  return [formErrors, fieldErrors].filter(Boolean).join('; ');
};
```

## Configuration Loading with Validation

### Safe Configuration Loader

```typescript
export const loadNavigationConfig = async (configPath: string): Promise<NavigationConfig> => {
  try {
    const config = await import(configPath);
    return validateNavigationConfig(config.default || config);
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error('Navigation configuration validation failed:', {
        errors: formatValidationError(error),
        configPath
      });
      throw error;
    }
    throw new Error(`Failed to load navigation config from ${configPath}: ${error.message}`);
  }
};
```

### Configuration Merger with Validation

```typescript
export const mergeNavigationConfigs = (
  baseConfig: NavigationConfig,
  overrideConfig: Partial<NavigationConfig>
): NavigationConfig => {
  const merged = { ...baseConfig, ...overrideConfig };

  // Validate merged configuration
  return validateNavigationConfig(merged);
};
```

## Testing Validation

### Unit Tests for Schemas

```typescript
describe('NavigationItemSchema', () => {
  it('should validate a valid navigation item', () => {
    const validItem = {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: HomeIcon,
      section: 'legislative',
      priority: 1,
    };

    expect(() => validateNavigationItem(validItem)).not.toThrow();
  });

  it('should reject invalid navigation item', () => {
    const invalidItem = {
      id: '',
      label: '',
      href: 'invalid-url',
      section: 'invalid-section',
    };

    expect(() => validateNavigationItem(invalidItem)).toThrow(ValidationError);
  });

  it('should validate unique IDs', () => {
    const config = {
      sections: { legislative: 'Legislative' },
      sectionOrder: ['legislative', 'community', 'tools', 'user', 'admin'],
      navigationItems: [
        { id: 'duplicate', label: 'Item 1', href: '/1', icon: HomeIcon, section: 'legislative' },
        { id: 'duplicate', label: 'Item 2', href: '/2', icon: HomeIcon, section: 'legislative' },
      ],
    };

    expect(() => validateNavigationConfig(config)).toThrow();
  });
});
```

### Integration Tests

```typescript
describe('Configuration Loading', () => {
  it('should load and validate configuration file', async () => {
    const config = await loadNavigationConfig('./navigation-config.json');

    expect(config).toHaveProperty('navigationItems');
    expect(config).toHaveProperty('sectionOrder');
    expect(config.navigationItems).toHaveLength.greaterThan(0);
  });

  it('should handle invalid configuration gracefully', async () => {
    await expect(loadNavigationConfig('./invalid-config.json'))
      .rejects.toThrow(ValidationError);
  });
});
```

## Performance Considerations

### Schema Compilation

```typescript
// Pre-compile schemas for better performance
const compiledNavigationItemSchema = NavigationItemSchema;
const compiledNavigationConfigSchema = ExtendedNavigationConfigSchema;

// Use compiled schemas in hot paths
export const fastValidateNavigationItem = (data: unknown): boolean => {
  return compiledNavigationItemSchema.safeParse(data).success;
};
```

### Validation Caching

```typescript
const validationCache = new Map<string, boolean>();

export const cachedValidateNavigationItem = (data: unknown): boolean => {
  const key = JSON.stringify(data);
  if (validationCache.has(key)) {
    return validationCache.get(key)!;
  }

  const result = NavigationItemSchema.safeParse(data).success;
  validationCache.set(key, result);
  return result;
};
```

## Migration and Backwards Compatibility

### Legacy Format Support

```typescript
export const migrateLegacyConfig = (legacyConfig: any): NavigationConfig => {
  // Convert legacy format to new format
  const migrated = {
    ...legacyConfig,
    navigationItems: legacyConfig.navigationItems.map(migrateLegacyItem),
  };

  return validateNavigationConfig(migrated);
};

const migrateLegacyItem = (legacyItem: any): NavigationItem => {
  return {
    ...legacyItem,
    // Apply any necessary transformations
    section: legacyItem.section === 'system' ? 'admin' : legacyItem.section,
  };
};
```

This validation schema provides comprehensive runtime type checking and data integrity for the navigation configuration system.