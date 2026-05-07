const fs = require('fs');
const content = fs.readFileSync('public/dashboard.html', 'utf8');
const startIdx = content.indexOf('id="appointments"');
if (startIdx !== -1) {
    const endIdx = content.indexOf('</section>', startIdx);
    console.log(content.substring(startIdx, endIdx + 10));
} else {
    console.log('appointments section Not found');
}
