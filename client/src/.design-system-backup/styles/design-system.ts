/**
 * Chanuka Hybrid Design System Documentation
 *
 * This file documents the hybrid design system that combines:
 * - Custom design system with advanced features
 * - shadcn/ui components for accessibility and consistency
 * - Tailwind CSS for styling and utility classes
 */

export const DESIGN_SYSTEM_OVERVIEW = `
# Chanuka Hybrid Design System

## Overview

 implements a sophisticated hybrid design system that combines the power of a custom design system with shadcn/ui components, all styled with Tailwind CSS. This approach provides the best of both worlds: advanced customization capabilities with battle-tested, accessible components.

## Architecture

### 1. Custom Design System (Base Layer)
- **CSS Variables**: Comprehensive design tokens in \`variables.css\`
- **Component Classes**: Custom CSS classes for complex interactions
- **Advanced Features**: Enhanced validation, error handling, recovery strategies
- **Performance Optimizations**: GPU acceleration, layout containment

### 2. shadcn/ui Components (Component Layer)
- **Accessibility**: WCAG 2.1 AA compliant components
- **Consistency**: Standardized component APIs and behaviors
- **Maintainability**: Well-tested, community-supported components
- **Integration**: Seamless TypeScript and React integration

### 3. Tailwind CSS (Styling Layer)
- **Utility Classes**: Rapid prototyping and responsive design
- **Design Tokens**: CSS custom properties integration
- **Performance**: Optimized purging and tree-shaking
- **Extensibility**: Custom utilities and component variants

## Key Integration Points

### Component Enhancement Strategy
- **Base Components**: Use shadcn/ui as foundation
- **Enhanced Variants**: Add custom functionality via composition
- **Validation Layer**: Integrate with existing validation system
- **Recovery Mechanisms**: Implement error recovery strategies

### Styling Integration
- **CSS Variables**: Shared design tokens between systems
- **Class Composition**: Combine Tailwind utilities with custom classes
- **Theme Support**: Unified light/dark mode implementation
- **Responsive Design**: Mobile-first approach with custom breakpoints

## Benefits

### Developer Experience
- **Rapid Development**: shadcn/ui components + Tailwind utilities
- **Type Safety**: Full TypeScript integration
- **Consistency**: Standardized component APIs
- **Maintainability**: Clear separation of concerns

### User Experience
- **Accessibility**: WCAG compliant components
- **Performance**: Optimized rendering and interactions
- **Consistency**: Unified design language
- **Reliability**: Battle-tested component implementations

### Business Value
- **Scalability**: Modular architecture for growth
- **Maintainability**: Clear upgrade paths and documentation
- **Innovation**: Advanced features without reinventing the wheel
- **Standards Compliance**: Industry best practices
`;

export const MIGRATION_STRATEGY = `
## Migration Strategy

### Phase 1: Foundation (Current State)
- ✅ Custom design system with CSS variables
- ✅ Tailwind CSS configuration with design tokens
- ✅ shadcn/ui components.json configuration
- ✅ Basic component integration

### Phase 2: Component Integration
- [ ] Identify components to migrate to shadcn/ui
- [ ] Create enhanced wrapper components
- [ ] Implement validation and error handling
- [ ] Add recovery mechanisms

### Phase 3: Advanced Features
- [ ] Implement performance optimizations
- [ ] Add accessibility enhancements
- [ ] Create custom component variants
- [ ] Establish testing patterns

### Phase 4: Optimization
- [ ] Bundle size optimization
- [ ] Performance monitoring
- [ ] Documentation completion
- [ ] Team training

## Component Migration Examples

### Button Component Migration

**Before (Custom Only):**
\`\`\`tsx
import React from 'react';
import { cn } from '@/lib/utils';

export const CustomButton = ({ children, variant = 'primary', ...props }) => (
  <button
    className={cn('chanuka-btn', \`chanuka-btn-\${variant}\`)}
    {...props}
  >
    {children}
  </button>
);
\`\`\`

**After (Hybrid Approach):**
\`\`\`tsx
import { Button } from '@client/shared/design-system/primitives/button';
import { cn } from '@/lib/utils';

export const EnhancedButton = ({
  children,
  variant = 'default',
  state,
  onClick,
  ...props
}) => (
  <Button
    variant={variant}
    className={cn('btn-enhanced', state?.loading && 'animate-pulse')}
    onClick={onClick}
    {...props}
  >
    {state?.loading ? 'Loading...' : children}
  </Button>
);
\`\`\`

### Form Component Integration

**Enhanced Form with Validation:**
\`\`\`tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@client/shared/design-system/primitives/form';
import { Input } from '@client/shared/design-system/primitives/input';
import { EnhancedButton } from '@client/shared/design-system/primitives/button';

export const ContactForm = () => {
  return (
    <Form>
      <FormField name="email">
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" placeholder="Enter your email" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <EnhancedButton type="submit" state={{ loading: false }}>
        Submit
      </EnhancedButton>
    </Form>
  );
};
\`\`\`
`;

export const IMPLEMENTATION_GUIDE = `
## Implementation Guide

### 1. Component Usage Patterns

#### Basic shadcn/ui Component
\`\`\`tsx
import { Button } from '@client/shared/design-system/primitives/button';

export const MyComponent = () => (
  <Button variant="default" size="default">
    Click me
  </Button>
);
\`\`\`

#### Enhanced Component with Custom Features
\`\`\`tsx
import { EnhancedButton } from '@client/shared/design-system/primitives/button';

export const MyComponent = () => {
  const [state, setState] = useState({ loading: false });

  const handleClick = async () => {
    setState({ loading: true });
    try {
      await someAsyncOperation();
      setState({ success: true });
    } catch (error) {
      setState({ error: true });
    }
  };

  return (
    <EnhancedButton
      state={state}
      onClick={handleClick}
      loadingText="Processing..."
    >
      Submit
    </EnhancedButton>
  );
};
\`\`\`

### 2. Styling Patterns

#### Using Tailwind Utilities
\`\`\`tsx
import { Card } from '@client/shared/design-system/primitives/card';
import { cn } from '@/lib/utils';

export const StyledCard = ({ className, children }) => (
  <Card className={cn('card-enhanced card-hover', className)}>
    {children}
  </Card>
);
\`\`\`

#### Custom CSS Classes
\`\`\`css
/* client/src/styles/components/custom-cards.css */
.custom-feature-card {
  @apply card-enhanced;
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
  color: hsl(var(--primary-foreground));
}
\`\`\`

### 3. Theme Integration

#### CSS Variables Usage
\`\`\`tsx
// Using design tokens in components
const themeStyles = {
  backgroundColor: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))',
  borderColor: 'hsl(var(--border))',
};
\`\`\`

#### Dark Mode Support
\`\`\`tsx
import { useTheme } from '@/hooks/use-theme';

export const ThemedComponent = () => {
  const { theme } = useTheme();

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      {/* Component content */}
    </div>
  );
};
\`\`\`

### 4. Performance Considerations

#### Bundle Optimization
- Use dynamic imports for heavy components
- Implement code splitting for feature modules
- Leverage Tailwind's purging for unused styles

#### Component Optimization
- Memoize expensive computations
- Use React.lazy for route-based code splitting
- Implement virtual scrolling for large lists

### 5. Testing Patterns

#### Component Testing
\`\`\`tsx
import { render, screen } from '@testing-library/react';
import { EnhancedButton } from '@client/shared/design-system/primitives/button';

describe('EnhancedButton', () => {
  it('renders with loading state', () => {
    render(
      <EnhancedButton state={{ loading: true }}>
        Test Button
      </EnhancedButton>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
\`\`\`

#### Accessibility Testing
\`\`\`tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<EnhancedButton>Test</EnhancedButton>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
\`\`\`
`;

export const BEST_PRACTICES = `
## Best Practices

### Component Development
1. **Start with shadcn/ui**: Use shadcn/ui components as the foundation
2. **Enhance Gradually**: Add custom features through composition, not replacement
3. **Maintain Compatibility**: Ensure enhanced components work with existing code
4. **Document Extensions**: Clearly document custom enhancements

### Styling Guidelines
1. **Use Design Tokens**: Prefer CSS custom properties over hardcoded values
2. **Compose Classes**: Combine Tailwind utilities with custom classes
3. **Mobile-First**: Design for mobile and enhance for larger screens
4. **Performance**: Minimize CSS specificity conflicts

### Accessibility
1. **WCAG Compliance**: Maintain AA compliance across all components
2. **Keyboard Navigation**: Ensure full keyboard accessibility
3. **Screen Readers**: Provide appropriate ARIA labels and descriptions
4. **Focus Management**: Implement proper focus indicators and management

### Performance
1. **Bundle Analysis**: Regularly analyze and optimize bundle sizes
2. **Lazy Loading**: Implement code splitting for better performance
3. **Memoization**: Use React.memo and useMemo appropriately
4. **Virtualization**: Implement virtual scrolling for large datasets

### Testing
1. **Unit Tests**: Test component logic and interactions
2. **Integration Tests**: Test component combinations
3. **E2E Tests**: Test complete user workflows
4. **Accessibility Tests**: Automated accessibility testing

### Maintenance
1. **Version Management**: Keep shadcn/ui and dependencies updated
2. **Breaking Changes**: Plan for and communicate breaking changes
3. **Documentation**: Maintain comprehensive component documentation
4. **Code Reviews**: Implement thorough code review processes
`;

export const COMPONENT_EXAMPLES = `
## Component Integration Examples

### Data Table with Custom Features

\`\`\`tsx
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@client/shared/design-system/primitives/table';
import { EnhancedButton } from '@client/shared/design-system/primitives/button';
import { Badge } from '@client/shared/design-system/primitives/badge';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
}

export const EnhancedDataTable = <T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  loading
}: DataTableProps<T>) => {
  if (loading) {
    return <SkeletonTable columns={columns} />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={index}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
\`\`\`

### Form with Advanced Validation

\`\`\`tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@client/shared/design-system/primitives/form';
import { Input } from '@client/shared/design-system/primitives/input';
import { Textarea } from '@client/shared/design-system/primitives/textarea';
import { EnhancedButton } from '@client/shared/design-system/primitives/button';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters')
});

export const ContactForm = () => {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      message: ''
    }
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // Handle form submission
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Your message..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <EnhancedButton
          type="submit"
          state={{ loading: form.formState.isSubmitting }}
          loadingText="Sending..."
        >
          Send Message
        </EnhancedButton>
      </form>
    </Form>
  );
};
\`\`\`

### Dashboard Card with Status Indicators

\`\`\`tsx
import { Card, CardHeader, CardTitle, CardContent } from '@client/shared/design-system/primitives/card';
import { Badge } from '@client/shared/design-system/primitives/badge';
import { Progress } from '@client/shared/design-system/primitives/progress';
import { cn } from '@/lib/utils';

interface StatusCardProps {
  title: string;
  value: string | number;
  status: 'success' | 'warning' | 'error' | 'info';
  progress?: number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

export const StatusCard = ({
  title,
  value,
  status,
  progress,
  trend
}: StatusCardProps) => {
  return (
    <Card className="card-enhanced">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Badge variant={status} className="status-indicator">
          {status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {progress !== undefined && (
          <Progress value={progress} className="mt-2" />
        )}
        {trend && (
          <p className={cn(
            "text-xs mt-1",
            trend.direction === 'up' ? "text-green-600" : "text-red-600"
          )}>
            {trend.direction === 'up' ? '↗' : '↘'} {Math.abs(trend.value)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
};
\`\`\`
`;