const fs = require('fs');
const d = fs.readFileSync('c:/Users/Access Granted/Downloads/projects/SimpleTool/shared/vitest_latest.json','utf8');
const j = JSON.parse(d);
const out = [];
j.testResults.filter(t=>t.status!=='passed').forEach(t=>{
  const n = t.name.replace(/\\/g,'/').split('shared/')[1];
  t.assertionResults.filter(a=>a.status==='failed').forEach(f=>{
    const msg = (f.failureMessages[0]||'').split('\n')[0];
    out.push(n + ' :: ' + f.title + ' :: ' + msg);
  });
});
fs.writeFileSync('c:/Users/Access Granted/Downloads/projects/SimpleTool/shared/vitest_fails.txt', out.join('\n'));
