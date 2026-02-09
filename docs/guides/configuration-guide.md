# Configuration Guide

This guide explains how the Chanuka Platform's configuration files work together to ensure consistency and avoid conflicts.

## Configuration Architecture

### File Structure
```
├── tailwind.config.js          # Root config (tool detection)
├── postcss.config.js           # Root PostCSS config
├── client/
│   ├── tailwind.config.ts      # Main Tailwind config
│   ├── postcss.config.js       # Client PostCSS config
│   └── src/styles/
│       └── chanuka-design-system.css  # CSS variables & components
```

### Design Principles

1. **Single Source of Truth**: `client/tailwind.config.ts` is the authoritative config
2. **Consistent Variables**: CSS variables use `--color-*` prefix with legacy fallbacks
3. **Tool Compatibility**: Root configs ensure build tools can detect Tailwind
4. **Environment Separation**: Client configs are isolated from root workspace

## CSS Variable System

### Primary Variables (Source of Truth)
```css
:root {
  --color-background: 0 0% 100%;
  --color-foreground: 222.2 84% 4.9%;
  --color-primary: 221.2 83.2% 53.3%;
  /* ... */
}
```

### Legacy Compatibility
```css
:root {
  --background: var(--color-background);
  --foreground: var(--color-foreground);
  --primary: var(--color-primary);
  /* ... */
}
```

### Tailwind Integration
```typescript
// client/tailwind.config.ts
colors: {
  background: "hsl(var(--color-background))",
  foreground: "hsl(var(--color-foreground))",
  primary: {
    DEFAULT: "hsl(var(--color-primary))",
    foreground: "hsl(var(--color-primary-foreground))",
  },
}
```

## Configuration Validation

Run the validation script to check for inconsistencies:

```bash
node scripts/validate-config.js
```

This checks:
- Tailwind config delegation
- PostCSS config consistency  
- CSS variable naming
- Environment placeholder values

## Common Issues & Solutions

### Issue: CSS Variables Not Working
**Cause**: Mismatch between CSS variable names and Tailwind config
**Solution**: Ensure CSS uses `--color-*` prefix and Tailwind references them correctly

### Issue: Build Tools Can't Find Config
**Cause**: Root configs not properly delegating to client configs
**Solution**: Use presets or explicit config paths in root files

### Issue: Dark Mode Not Working
**Cause**: Dark mode variables not defined or inconsistent naming
**Solution**: Ensure `.dark` class overrides all `--color-*` variables

### Issue: PostCSS Processing Errors
**Cause**: Conflicting PostCSS configurations
**Solution**: Ensure both root and client PostCSS configs point to correct Tailwind config

## Best Practices

1. **Always validate** after config changes: `npm run validate:config`
2. **Use semantic naming** for CSS variables (e.g., `--color-primary` not `--blue`)
3. **Maintain legacy compatibility** when updating variable names
4. **Test both light and dark modes** after changes
5. **Document custom variables** in this guide

## Adding New Colors

1. Add to CSS variables in `chanuka-design-system.css`:
```css
:root {
  --color-new-semantic: 120 100% 50%;
}

.dark {
  --color-new-semantic: 120 100% 30%;
}
```

2. Add to Tailwind config:
```typescript
colors: {
  "new-semantic": "hsl(var(--color-new-semantic))",
}
```

3. Run validation: `node scripts/validate-config.js`

## Troubleshooting

### Config Not Loading
1. Check file paths in PostCSS configs
2. Verify Tailwind config syntax
3. Ensure all imports are valid

### Styles Not Applying
1. Check CSS variable definitions
2. Verify Tailwind class generation
3. Inspect browser dev tools for CSS custom properties

### Build Failures
1. Run validation script
2. Check for syntax errors in configs
3. Verify all dependencies are installed

## Environment-Specific Configuration

### Development
- Uses placeholder values for external services
- Enables debug features and hot reload
- Disables analytics and service workers

### Production
- Requires real API keys and service URLs
- Enables performance monitoring
- Activates security features

See `.env.example` for required environment variables.