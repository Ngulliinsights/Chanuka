#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to convert HSL to RGB
function hslToRgb(h, s, l) {
  h = h % 360;
  s = s / 100;
  l = l / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return [r, g, b];
}

// Function to calculate relative luminance
function relativeLuminance(r, g, b) {
  const toLinear = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  r = toLinear(r / 255);
  g = toLinear(g / 255);
  b = toLinear(b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Function to calculate contrast ratio
function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Function to parse HSL string "h s% l%" to [h, s, l]
function parseHsl(hslStr) {
  const match = hslStr.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return null;
  return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
}

// Function to resolve var() references
function resolveVar(value, vars) {
  const varMatch = value.match(/^var\((--[^)]+)\)$/);
  if (varMatch) {
    const varName = varMatch[1];
    if (vars[varName]) {
      return resolveVar(vars[varName], vars);
    } else {
      throw new Error(`Undefined variable: ${varName}`);
    }
  }
  return value;
}

// Function to parse CSS block and extract variables
function parseBlock(cssBlock) {
  // Remove comments
  cssBlock = cssBlock.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  const lines = cssBlock.split(';').map(l => l.trim()).filter(l => l);
  for (const line of lines) {
    const match = line.match(/^(--[^:]+):\s*(.+)$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  }
  return vars;
}

// Function to resolve all vars
function resolveAllVars(vars) {
  const resolved = {};
  for (const [key, value] of Object.entries(vars)) {
    resolved[key] = resolveVar(value, vars);
  }
  return resolved;
}

// Main function
function checkContrast() {
  const designTokensPath = path.join(__dirname, '../src/shared/design-system/styles/design-tokens.css');
  const chanukaCssPath = path.join(__dirname, '../src/shared/design-system/styles/chanuka-design-system.css');

  const designTokensCss = fs.readFileSync(designTokensPath, 'utf-8');
  const chanukaCss = fs.readFileSync(chanukaCssPath, 'utf-8');

  // Concatenate CSS
  const fullCss = designTokensCss + '\n' + chanukaCss;

  // Extract all :root and .dark blocks
  const rootMatches = [...fullCss.matchAll(/:root\s*\{([^}]+)\}/g)];
  const darkMatches = [...fullCss.matchAll(/\.dark\s*\{([^}]+)\}/g)];

  if (rootMatches.length === 0) {
    console.error('No :root block found');
    process.exit(1);
  }

  // Merge all :root declarations
  let rootVars = {};
  for (const match of rootMatches) {
    const blockVars = parseBlock(match[1]);
    rootVars = { ...rootVars, ...blockVars };
  }
  const resolvedRoot = resolveAllVars(rootVars);

  const modes = { light: resolvedRoot };

  if (darkMatches.length > 0) {
    let darkVars = { ...rootVars };
    for (const match of darkMatches) {
      const blockVars = parseBlock(match[1]);
      darkVars = { ...darkVars, ...blockVars };
    }
    const resolvedDark = resolveAllVars(darkVars);
    modes.dark = resolvedDark;
  }

  // Define pairs to check
  const pairs = [
    ['background', 'foreground'],
    ['card', 'card-foreground'],
    ['popover', 'popover-foreground'],
    ['primary', 'primary-foreground'],
    ['secondary', 'secondary-foreground'],
    ['muted', 'muted-foreground'],
    ['accent', 'accent-foreground'],
    ['destructive', 'destructive-foreground'],
  ];

  let hasErrors = false;

  for (const [modeName, vars] of Object.entries(modes)) {
    console.log(`\nChecking ${modeName} mode:`);
    for (const [bg, fg] of pairs) {
      const bgVar = `--${bg}`;
      const fgVar = `--${fg}`;
      if (!vars[bgVar] || !vars[fgVar]) {
        console.log(`  Skipping ${bg}/${fg}: variables not defined`);
        continue;
      }
      const bgHsl = parseHsl(vars[bgVar]);
      const fgHsl = parseHsl(vars[fgVar]);
      if (!bgHsl || !fgHsl) {
        console.log(`  Skipping ${bg}/${fg}: invalid HSL`);
        continue;
      }
      const bgRgb = hslToRgb(...bgHsl);
      const fgRgb = hslToRgb(...fgHsl);
      const bgLum = relativeLuminance(...bgRgb);
      const fgLum = relativeLuminance(...fgRgb);
      const ratio = contrastRatio(bgLum, fgLum);
      const status = ratio >= 7 ? 'PASS' : 'FAIL';
      console.log(`  ${bg}/${fg}: ${ratio.toFixed(2)} (${status})`);
      if (ratio < 7) {
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error('\nContrast ratio violations found. Build aborted.');
    process.exit(1);
  } else {
    console.log('\nAll contrast ratios meet WCAG AAA standards.');
  }
}

checkContrast();