const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') && !fullPath.includes('node_modules') && !fullPath.includes('.agent')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      // Fix 1: map(p: any) => ...  -> map((p: any) => ...
      content = content.replace(/\b([a-zA-Z0-9_]+)\(([a-zA-Z0-9_]+):\s*any\)\s*=>/g, '$1(($2: any) =>');

      // Fix 2: sort(a: any, b: any) => ... -> sort((a: any, b: any) => ...
      content = content.replace(/\b([a-zA-Z0-9_]+)\(([a-zA-Z0-9_]+):\s*any,\s*([a-zA-Z0-9_]+):\s*any\)\s*=>/g, '$1(($2: any, $3: any) =>');

      if (original !== content) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Repaired: ${fullPath}`);
      }
    }
  }
}

// Start from server and shared directory
processDirectory(path.join(__dirname, 'server'));
processDirectory(path.join(__dirname, 'shared'));
console.log("Done");
