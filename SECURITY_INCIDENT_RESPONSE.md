# Security Incident Response - Exposed API Key

## Incident Summary
**Date**: March 4, 2026
**Severity**: HIGH
**Type**: Exposed Google Gemini API Key in Public Repository

## What Happened
A Google Gemini API key was accidentally committed to the public GitHub repository in `client/.env.development` at commit `0a0a0762d4221ec4cce7cc781a19c6354430d0a1`.

**Exposed Key**: `AIzaSyCQDx_JHfGftkqFzaKZzeF2hTq3T-ufWmg`
**Project**: Default Gemini Project (id: gen-lang-client-0742569082)

## Immediate Actions Required

### 1. Regenerate the API Key (CRITICAL - Do This First!)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Find the compromised key: `AIzaSyCQDx_JHfGftkqFzaKZzeF2hTq3T-ufWmg`
4. Click "Edit" on the key
5. Click "Regenerate Key" to create a new key
6. Copy the new key to a secure location
7. Add API key restrictions:
   - Application restrictions (HTTP referrers, IP addresses, etc.)
   - API restrictions (limit to only Gemini API)

### 2. Review Billing and Usage
1. Check your Google Cloud Console for any unexpected API usage
2. Review billing for any unusual charges
3. Look for API calls from unexpected sources or locations

### 3. Update Local Environment
1. Create a `.env.local` file (not tracked in Git):
   ```bash
   cp client/.env.development client/.env.local
   ```
2. Add your NEW regenerated API key to `.env.local`:
   ```
   VITE_GEMINI_API_KEY=your-new-regenerated-key-here
   ```
3. Never commit `.env.local` files

### 4. Remove Sensitive Files from Git History
The key exists in Git history and needs to be removed. Options:

**Option A: Using BFG Repo-Cleaner (Recommended)**
```bash
# Install BFG
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh copy
git clone --mirror https://github.com/Ngulliinsights/Chanuka.git

# Remove the exposed key
bfg --replace-text <(echo 'AIzaSyCQDx_JHfGftkqFzaKZzeF2hTq3T-ufWmg==>***REMOVED***') Chanuka.git

# Clean up
cd Chanuka.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history!)
git push --force
```

**Option B: Using git-filter-repo**
```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove the file from history
git filter-repo --path client/.env.development --invert-paths

# Force push
git push --force --all
```

**⚠️ WARNING**: Rewriting Git history affects all collaborators. Coordinate with your team!

### 5. Notify Team Members
After force-pushing, all team members need to:
```bash
# Backup local changes
git stash

# Fetch the rewritten history
git fetch origin
git reset --hard origin/main

# Restore local changes
git stash pop
```

## Prevention Measures Implemented

### 1. Updated .gitignore
Enhanced `.gitignore` to explicitly exclude all environment files:
- `client/.env.development`
- `client/.env.production`
- `server/.env.development`
- `deployment/environment-configs/*.env`

### 2. Environment File Strategy
- `.env.example`: Template with placeholder values (safe to commit)
- `.env.development`: Default development config with placeholders (now safe to commit)
- `.env.local`: Personal environment with real secrets (NEVER commit)
- `.env.production`: Production config (should be managed via deployment platform)

### 3. Pre-commit Hook
Consider adding a pre-commit hook to detect secrets:

```bash
# Install gitleaks
# https://github.com/gitleaks/gitleaks

# Add to .husky/pre-commit
npx gitleaks protect --staged --verbose
```

## Best Practices Going Forward

1. **Never commit real API keys or secrets**
2. **Use environment-specific .env.local files** for local development
3. **Use secret management services** for production (AWS Secrets Manager, Google Secret Manager, etc.)
4. **Add API key restrictions** in Google Cloud Console
5. **Rotate keys regularly** as a security practice
6. **Use secret scanning tools** like gitleaks or git-secrets
7. **Review commits** before pushing to ensure no secrets are included

## Verification Checklist

- [ ] API key regenerated in Google Cloud Console
- [ ] API restrictions added to the new key
- [ ] Billing and usage reviewed for suspicious activity
- [ ] New key stored securely in `.env.local`
- [ ] Old key removed from all environment files
- [ ] `.gitignore` updated to prevent future incidents
- [ ] Git history cleaned (if required by security policy)
- [ ] Team notified about the incident and new procedures
- [ ] Pre-commit hooks installed for secret detection

## Resources

- [Google Cloud: Handling Compromised Credentials](https://cloud.google.com/docs/authentication/api-keys#securing_an_api_key)
- [GitHub: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Gitleaks - Secret Scanning](https://github.com/gitleaks/gitleaks)

## Contact

If you have questions about this incident or need assistance:
- Review Google Cloud Trust & Safety notification
- Check Google Cloud Console for detailed logs
- Contact your security team or administrator
