const fs = require('fs');
const content = fs.readFileSync('public/dashboard.html', 'utf8');
const matches = content.match(/id="[^"]+"/g);
if (matches) {
    matches.forEach(m => {
        if (m.toLowerCase().includes('modal')) console.log(m);
    });
}
