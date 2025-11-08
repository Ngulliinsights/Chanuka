#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

async function fixRemainingErrors() {
  // Fix user_agent to userAgent
  const allFiles = await glob('client/src/**/*.{ts,tsx}');
  
  for (const file of allFiles) {
    try {
      let content = readFileSync(file, 'utf8');
      let updated = content;
      
      // Fix user_agent to userAgent
      updated = updated.replace(/navigator\.user_agent/g, 'navigator.userAgent');
      
      // Fix users to user in variable references
      updated = updated.replace(/\{users\./g, '{user.');
      updated = updated.replace(/users\.name/g, 'user.name');
      updated = updated.replace(/users\.email/g, 'user.email');
      updated = updated.replace(/users\.role/g, 'user.role');
      updated = updated.replace(/users\.avatar/g, 'user.avatar');
      updated = updated.replace(/users\.created_at/g, 'user.created_at');
      
      // Fix bills to bill in variable references
      updated = updated.replace(/\{bills\./g, '{bill.');
      updated = updated.replace(/bills\.title/g, 'bill.title');
      updated = updated.replace(/bills\.created_at/g, 'bill.created_at');
      
      // Fix sponsors to sponsor in variable references
      updated = updated.replace(/\{sponsors\./g, '{sponsor.');
      updated = updated.replace(/sponsors\.sponsor_id/g, 'sponsor.sponsor_id');
      updated = updated.replace(/sponsors\.conflictCount/g, 'sponsor.conflictCount');
      updated = updated.replace(/sponsors\.trend/g, 'sponsor.trend');
      updated = updated.replace(/sponsors\.risk_score/g, 'sponsor.risk_score');
      
      if (updated !== content) {
        writeFileSync(file, updated);
        console.log(`Fixed variable references in ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
}

fixRemainingErrors().catch(console.error);