const fs = require('fs');
const c = fs.readFileSync('public/dashboard.html', 'utf8');
const lines = c.split('\n');
lines.forEach((line, i) => {
    if (line.includes('toast-container') || line.includes('id="loader"') || line.includes('id="app-wrapper"') || line.includes('<body')) {
        console.log('Line', i+1, ':', line.substring(0, 100).trim());
    }
});
