const fs = require('fs');
const content = fs.readFileSync('public/dashboard.html', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('id="appointments"'));
console.log('id="appointments" is at line:', idx + 1);
