import fs from "fs";
import path from "path";

// Check common patterns that might be problematic
const issues = [];
const patterns = [
  { pattern: /from\s+['"]\.\.\/.*\/ui\//gm, desc: "Relative UI imports" },
  { pattern: /from\s+['"]\..*\/\$\{/gm, desc: "Dynamic template imports" },
  {
    pattern: /from\s+['"]\.+\/([^/]+)\.js['"]/gm,
    desc: ".js file imports (should be .ts)",
  },
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    patterns.forEach(({ pattern, desc }) => {
      if (pattern.test(content)) {
        issues.push({ file: filePath, pattern: desc });
      }
    });
  } catch (e) {
    // Skip unreadable files
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (
      stat.isDirectory() &&
      !file.includes("node_modules") &&
      !file.includes(".git")
    ) {
      walkDir(filePath);
    } else if (file.match(/\.(ts|tsx|js)$/)) {
      scanFile(filePath);
    }
  });
}

console.log("Scanning for problematic import patterns...\n");
walkDir("./client/src");
walkDir("./server");

if (issues.length > 0) {
  console.log(`Found ${issues.length} potential issues:\n`);
  issues.slice(0, 20).forEach(({ file, pattern }) => {
    console.log(`  ${pattern}: ${file}`);
  });
  if (issues.length > 20) console.log(`  ... and ${issues.length - 20} more`);
} else {
  console.log("✓ No obvious import issues found!");
}
