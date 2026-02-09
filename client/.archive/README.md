# Archive Directory

This directory contains archived files that are no longer actively used but kept for historical reference.

## 📁 Structure

```
.archive/
├── README.md           # This file
└── old-scripts/        # Deprecated scripts
    ├── fix-import-syntax.mjs
    ├── migration-helper.js
    └── validate-fixes.cjs
```

## 🗂️ Contents

### Old Scripts
Scripts that were used during development or migration but are no longer needed:

- **fix-import-syntax.mjs** - Import syntax fixer (deprecated)
- **migration-helper.js** - Migration helper script (deprecated)
- **validate-fixes.cjs** - Fix validation script (deprecated)

## ⚠️ Important Notes

1. **Do not use these files** - They are archived for reference only
2. **May be outdated** - Code may not work with current codebase
3. **Historical reference** - Kept for understanding past changes
4. **Can be deleted** - If space is needed, these can be removed

## 🧹 Cleanup Policy

### When to Archive
- Scripts no longer used in active development
- Temporary migration tools after migration complete
- Deprecated utilities replaced by better solutions
- One-time use scripts after execution

### When to Delete
- After 6 months in archive with no reference
- When confirmed no longer needed
- During major version upgrades
- When storage space is needed

## 📝 Archive Process

### How to Archive a File

1. **Move to appropriate subdirectory**:
   ```bash
   mv old-file.js .archive/old-scripts/
   ```

2. **Update this README**:
   - Add entry to Contents section
   - Note reason for archiving
   - Add date archived

3. **Remove from active documentation**:
   - Update relevant docs
   - Remove from package.json scripts if applicable
   - Update CI/CD if needed

### Archive Entry Template
```markdown
- **filename.ext** - Brief description (archived: YYYY-MM-DD, reason)
```

## 🔍 Finding Archived Files

### Search by Name
```bash
find .archive -name "filename.*"
```

### Search by Content
```bash
grep -r "search term" .archive/
```

### List All Archived Files
```bash
find .archive -type f
```

## 📊 Archive Statistics

### Current Contents
- **Old Scripts**: 3 files
- **Total Size**: ~50KB
- **Last Updated**: February 9, 2026

### Archive History
- **2026-02-09**: Archived migration and fix scripts after SVG integration completion

## 🔄 Restoration

If you need to restore an archived file:

1. **Copy (don't move)** to verify it still works:
   ```bash
   cp .archive/old-scripts/filename.js scripts/
   ```

2. **Test thoroughly** before using in production

3. **Update if needed** to work with current codebase

4. **Document** why it was restored

## 📞 Questions?

If you're unsure whether to:
- Archive a file → Ask the team
- Delete archived files → Check with maintainers
- Restore archived files → Review with team lead

---

**Maintained By**: Development Team  
**Last Cleanup**: February 9, 2026  
**Next Review**: August 2026
