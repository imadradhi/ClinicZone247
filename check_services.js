const fs = require('fs');
const content = fs.readFileSync('public/dashboard.html', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('services-list')) {
        console.log('Line ' + (i+1) + ': ' + l.trim());
    }
});
