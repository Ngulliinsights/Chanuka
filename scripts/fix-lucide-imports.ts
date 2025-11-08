#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Map of problematic Lucide icons to working alternatives
const iconReplacements: Record<string, string> = {
  'Home': 'House',
  'BookOpen': 'Book',
  'Wifi': 'Wifi',
  'WifiOff': 'WifiOff', 
  'WifiIcon': 'Wifi',
  'WifiOffIcon': 'WifiOff',
  'Image': 'Image',
  'ImageIcon': 'Image',
  'Code': 'Code',
  'CodeIcon': 'Code',
  'Play': 'Play',
  'PlayIcon': 'Play',
  'FilePlus': 'FilePlus',
  'FileIcon': 'File',
  'Menu': 'Menu',
  'MenuIcon': 'Menu',
  'MoreHorizontal': 'MoreHorizontal',
  'MoreHorizontalIcon': 'MoreHorizontal',
  'Tablet': 'Tablet',
  'TabletIcon': 'Tablet',
  'Battery': 'Battery',
  'BatteryIcon': 'Battery',
  'TouchpadIcon': 'TouchpadOff',
  'TouchIcon': 'Touch',
  'XCircle': 'XCircle',
  'Zap': 'Zap',
  'Bolt': 'Zap',
  'Plus': 'Plus',
  'PlusIcon': 'Plus',
  'Phone': 'Phone',
  'PhoneIcon': 'Phone',
  'Globe': 'Globe',
  'GlobeIcon': 'Globe',
  'CloudOff': 'CloudOff',
  'CloudIcon': 'Cloud',
  'Trash2': 'Trash2',
  'Lock': 'Lock',
  'LockIcon': 'Lock',
  'Cookie': 'Cookie',
  'CookieIcon': 'Cookie',
  'ArrowUp': 'ArrowUp',
  'ArrowDown': 'ArrowDown',
  'CheckCircle2': 'CheckCircle',
  'Gavel': 'Gavel',
  'Hammer': 'Hammer',
  'LogOut': 'LogOut',
  'LogOutIcon': 'LogOut',
  'Bug': 'Bug',
  'House': 'Home'
};

async function fixLucideImports() {
  const files = await glob('client/src/**/*.{ts,tsx}');
  
  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf8');
      let updated = content;
      
      // Fix import statements
      for (const [problematic, replacement] of Object.entries(iconReplacements)) {
        // Fix in import statements
        const importRegex = new RegExp(`(import\\s*{[^}]*?)\\b${problematic}\\b([^}]*?})`, 'g');
        updated = updated.replace(importRegex, `$1${replacement}$2`);
        
        // Fix usage in JSX
        const usageRegex = new RegExp(`<${problematic}\\b`, 'g');
        updated = updated.replace(usageRegex, `<${replacement}`);
      }
      
      if (updated !== content) {
        writeFileSync(file, updated);
        console.log(`Fixed Lucide imports in ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
}

fixLucideImports().catch(console.error);