const fs = require('fs');
const content = fs.readFileSync('public/dashboard.html', 'utf8');
const matches = content.match(/id="stat-[^"]+"/g);
console.log('Found stat IDs:');
if (matches) matches.forEach(m => console.log(m));
const chartMatches = content.match(/id="[^"]*Chart[^"]*"/ig);
console.log('\nFound Chart IDs:');
if (chartMatches) chartMatches.forEach(m => console.log(m));
