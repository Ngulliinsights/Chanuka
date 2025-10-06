#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing fetch calls in use-auth.tsx...');

const filePath = path.join(__dirname, 'src/hooks/use-auth.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all remaining fetch calls with makeCancellableRequest
const replacements = [
  {
    old: `await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });`,
    new: `await makeCancellableRequest('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });`
  },
  {
    old: `await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${token}\`
          }
        });`,
    new: `await makeCancellableRequest('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${token}\`
          }
        });`
  },
  {
    old: `const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });`,
    new: `const response = await makeCancellableRequest('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });`
  },
  {
    old: `const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });`,
    new: `const response = await makeCancellableRequest('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });`
  },
  {
    old: `const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });`,
    new: `const response = await makeCancellableRequest('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });`
  },
  {
    old: `const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });`,
    new: `const response = await makeCancellableRequest('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });`
  }
];

let replacedCount = 0;
replacements.forEach(replacement => {
  if (content.includes(replacement.old)) {
    content = content.replace(replacement.old, replacement.new);
    replacedCount++;
    console.log(`✅ Replaced fetch call ${replacedCount}`);
  }
});

fs.writeFileSync(filePath, content);
console.log(`🎉 Fixed ${replacedCount} fetch calls in use-auth.tsx`);