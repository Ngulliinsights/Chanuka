const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server', 'features', 'argument-intelligence', 'application', 'clustering-service.ts');
let content = fs.readFileSync(file, 'utf8');

// The regex will match the word 'arguments' that is not preceded by a dot
// and not followed by ': ClusteredArgument[];' (which is the interface prop)
content = content.replace(/(?<!\.)\barguments\b(?!: ClusteredArgument\[\];)/g, 'argList');

fs.writeFileSync(file, content);
console.log('done');
