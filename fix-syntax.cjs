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
      
      // Fix 1: single param without parens: `filter(c as any =>` -> `filter((c: any) =>`
      // We look for word boundary, space "as any =>"
      content = content.replace(/(?<!\()(\b[a-zA-Z0-9_]+\b) as any\s*=>/g, '($1: any) =>');
      
      // Fix 2: single param WITH opening paren, but no closing: `filter((c as any =>` -> `filter((c: any) =>`
      content = content.replace(/\((\b[a-zA-Z0-9_]+\b) as any\s*=>/g, '($1: any) =>');
      
      // Fix 3: two params: `sort((a as any, b as any) =>` -> `sort((a: any, b: any) =>`
      content = content.replace(/\((\b[a-zA-Z0-9_]+\b) as any,\s*(\b[a-zA-Z0-9_]+\b) as any\)\s*=>/g, '($1: any, $2: any) =>');
      
      // Fix 4: single param inside parens (sometimes they did `(c as any) =>`)
      // Wait, `(c as any) =>` is actually VALID TYPESCRIPT! We shouldn't change it if it's already valid, but `(c: any) =>` is cleaner. Let's leave valid ones.
      
      // Fix 5: method calls directly on the param: `p as any.id` -> `(p as any).id` -> wait, I hope they didn't do this! Let's check.
      
      if (original !== content) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed: ${fullPath}`);
      }
    }
  }
}

// Start from server directory
processDirectory(path.join(__dirname, 'server'));
processDirectory(path.join(__dirname, 'shared'));
console.log("Done");
