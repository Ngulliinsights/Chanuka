# Step-by-Step Fix Guide

## Choose Your Path

- **Path A**: Relative Imports (Recommended - 30 minutes)
- **Path B**: Subpath Imports (Modern - 1 hour)
- **Path C**: Manual Fix (If scripts don't work)

---

## Path A: Relative Imports (RECOMMENDED) ⚡

### Step 1: Backup Current State
```bash
git checkout -b fix/server-module-resolution
git add -A
git commit -m "Backup before fixing module resolution"
```

### Step 2: Run Conversion Script
```bash
tsx scripts/convert-server-imports.ts
```

Expected output:
```
🔄 Converting @server/* imports to relative imports...

📊 Found 40 @server/* imports

✅ Conversion complete:
   - Before: 40 @server/* imports
   - After: 0 @server/* imports
   - Converted: 40 imports

💾 Updated server/index.ts

🎉 Done! Try running: npm run dev
```

### Step 3: Stop Current Server (if running)
```bash
# Find and kill process on port 4200
# Windows:
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:4200 | xargs kill -9
```

### Step 4: Start Server
```bash
cd server
npm run dev
```

Expected output:
```
✅ Server running on http://localhost:4200
✅ Performance monitoring initialized
✅ WebSocket service initialized
✅ Notification scheduler initialized
...
```

### Step 5: Test Endpoints
```bash
# Test health endpoint
curl http://localhost:4200/api/health

# Test bills endpoint
curl http://localhost:4200/api/bills?page=1&limit=10

# Test frontend health
curl http://localhost:4200/api/frontend-health
```

### Step 6: Verify Frontend Connection
1. Open browser to `http://localhost:5173`
2. Check browser console for errors
3. Verify bills page loads data
4. Check network tab for successful API calls

### Step 7: Commit Changes
```bash
git add server/index.ts
git commit -m "fix: convert @server/* imports to relative paths for ESM compatibility"
```

### Done! ✅

---

## Path B: Subpath Imports (MODERN) 🚀

### Step 1: Backup Current State
```bash
git checkout -b fix/server-module-resolution-subpath
git add -A
git commit -m "Backup before implementing subpath imports"
```

### Step 2: Update server/package.json

Add the `imports` field:

```json
{
  "name": "@chanuka/server",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "imports": {
    "#config": "./config/index.js",
    "#config/*": "./config/*.js",
    "#infrastructure": "./infrastructure/index.js",
    "#infrastructure/*": "./infrastructure/*/index.js",
    "#features/*": "./features/*/index.js",
    "#middleware": "./middleware/index.js",
    "#middleware/*": "./middleware/*.js",
    "#utils/*": "./utils/*.js",
    "#vite": "./vite.js"
  },
  "scripts": {
    ...
  }
}
```

### Step 3: Update server/index.ts Imports

Replace `@server/*` with `#` prefix:

```typescript
// Before
import { config } from '@server/config/index';
import { router as authRouter } from '@server/infrastructure/auth/auth';
import { logger } from '@server/infrastructure/observability';

// After
import { config } from '#config';
import { router as authRouter } from '#infrastructure/auth/auth';
import { logger } from '#infrastructure/observability';
```

### Step 4: Create Conversion Script (Optional)

```typescript
// scripts/convert-to-subpath-imports.ts
import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('server/index.ts', 'utf-8');

const converted = content
  .replace(/@server\/config/g, '#config')
  .replace(/@server\/infrastructure/g, '#infrastructure')
  .replace(/@server\/features/g, '#features')
  .replace(/@server\/middleware/g, '#middleware')
  .replace(/@server\/utils/g, '#utils')
  .replace(/@server\/vite/g, '#vite');

writeFileSync('server/index.ts', converted, 'utf-8');
console.log('✅ Converted to subpath imports');
```

Run it:
```bash
tsx scripts/convert-to-subpath-imports.ts
```

### Step 5: Update TypeScript Config

Add to `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "#config": ["./config/index.ts"],
      "#config/*": ["./config/*.ts"],
      "#infrastructure": ["./infrastructure/index.ts"],
      "#infrastructure/*": ["./infrastructure/*/index.ts"],
      "#features/*": ["./features/*/index.ts"],
      "#middleware": ["./middleware/index.ts"],
      "#middleware/*": ["./middleware/*.ts"],
      "#utils/*": ["./utils/*.ts"],
      "#vite": ["./vite.ts"]
    }
  }
}
```

### Step 6: Test Server
```bash
cd server
npm run dev
```

### Step 7: Verify and Commit
```bash
# Test endpoints
curl http://localhost:4200/api/health

# Commit changes
git add server/package.json server/index.ts server/tsconfig.json
git commit -m "feat: implement Node.js subpath imports for module resolution"
```

### Done! ✅

---

## Path C: Manual Fix (FALLBACK) 🔧

If the scripts don't work, manually update imports:

### Step 1: Open server/index.ts

### Step 2: Find and Replace

Use your editor's find/replace:

1. Find: `from '@server/config`
   Replace: `from './config`

2. Find: `from '@server/infrastructure`
   Replace: `from './infrastructure`

3. Find: `from '@server/features`
   Replace: `from './features`

4. Find: `from '@server/middleware`
   Replace: `from './middleware`

5. Find: `from '@server/utils`
   Replace: `from './utils`

6. Find: `from '@server/vite`
   Replace: `from './vite`

### Step 3: Add .js Extensions (if needed)

ESM requires explicit extensions:

```typescript
// If you get errors, add .js:
import { config } from './config/index.js';
import { logger } from './infrastructure/observability/index.js';
```

### Step 4: Test and Fix Errors

```bash
npm run dev
```

If you get errors like "Cannot find module", check:
- File exists at the path
- Extension is correct (.js for runtime)
- Path is relative (starts with ./ or ../)

### Done! ✅

---

## Troubleshooting

### Error: "Cannot find module './config/index.js'"

**Solution**: Check if the file exists and has the right extension:
```bash
ls server/config/index.ts  # Should exist
```

If it's `.ts`, Node.js needs `.js` in the import (it will find the .ts file).

---

### Error: "SyntaxError: Unexpected token 'export'"

**Solution**: Make sure `"type": "module"` is in package.json

---

### Error: "ERR_UNSUPPORTED_DIR_IMPORT"

**Solution**: Add `/index.js` to the import:
```typescript
// Wrong
import { config } from './config';

// Right
import { config } from './config/index.js';
```

---

### Server starts but frontend can't connect

**Solution**: Check CORS and proxy settings:
```typescript
// In vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:4200',
      changeOrigin: true,
    }
  }
}
```

---

### Port 4200 already in use

**Solution**: Kill the existing process:
```bash
# Windows
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4200 | xargs kill -9

# Or use a different port
PORT=4201 npm run dev
```

---

## Verification Checklist

After implementing the fix:

- [ ] Server starts without module resolution errors
- [ ] No `ERR_MODULE_NOT_FOUND` errors in console
- [ ] `/api/health` returns `{"status": "ok"}`
- [ ] `/api/bills` returns bill data
- [ ] Frontend loads without errors
- [ ] Browser console shows no 404 errors
- [ ] Bills page displays data
- [ ] TypeScript compilation works: `npm run type-check`
- [ ] Tests pass (if applicable): `npm test`

---

## Rollback Instructions

If something goes wrong:

```bash
# Discard changes
git checkout server/index.ts server/package.json server/tsconfig.json

# Or revert the commit
git revert HEAD

# Use simple server as fallback
npm run dev:simple
```

---

## Next Steps

After fixing:

1. **Document the decision**: Update team docs
2. **Apply to other files**: Check for `@server/*` in other files
3. **Update conventions**: Establish import style guide
4. **CI/CD**: Ensure builds work in CI environment
5. **Team training**: Brief team on the change

---

## Questions?

**Q: Do I need to update other server files?**
A: Check for `@server/*` usage:
```bash
grep -r "@server/" server/ --include="*.ts" | grep -v node_modules
```

**Q: Will this affect production builds?**
A: No, this is a development issue. Production builds compile TypeScript first.

**Q: Can I mix relative and subpath imports?**
A: Technically yes, but not recommended. Choose one style for consistency.

**Q: What about `@shared/*` imports?**
A: Those may need similar treatment. Check if they cause errors.

