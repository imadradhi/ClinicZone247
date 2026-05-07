const fs = require('fs');
const content = fs.readFileSync('public/dashboard.html', 'utf8');

// Extract HTML before the main script block
const scriptStart = content.indexOf('<script>', 2900);
const htmlSection = content.substring(0, scriptStart);

// Check duplicate IDs in static HTML
const idMatches = htmlSection.match(/id="([^"]+)"/g) || [];
const ids = idMatches.map(m => m.match(/id="([^"]+)"/)[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length > 0) {
    console.log('Duplicate IDs in HTML:', [...new Set(duplicates)].join(', '));
} else {
    console.log('No duplicate static IDs found');
}

// Check button tag balance in HTML section
const openBtns = (htmlSection.match(/<button[^>]*>/g) || []).length;
const closeBtns = (htmlSection.match(/<\/button>/g) || []).length;
console.log('Button open/close:', openBtns, '/', closeBtns, openBtns === closeBtns ? 'OK' : 'MISMATCH!');

// Check select balance
const openSelect = (htmlSection.match(/<select[^>]*>/g) || []).length;
const closeSelect = (htmlSection.match(/<\/select>/g) || []).length;
console.log('Select open/close:', openSelect, '/', closeSelect, openSelect === closeSelect ? 'OK' : 'MISMATCH!');

// Check section balance
const openSection = (htmlSection.match(/<section[^>]*>/g) || []).length;
const closeSection = (htmlSection.match(/<\/section>/g) || []).length;
console.log('Section open/close:', openSection, '/', closeSection, openSection === closeSection ? 'OK' : 'MISMATCH!');

// Check div balance in html section
const openDivs = (htmlSection.match(/<div[^>]*>/g) || []).length;
const closeDivs = (htmlSection.match(/<\/div>/g) || []).length;
console.log('Div open/close:', openDivs, '/', closeDivs, openDivs === closeDivs ? 'OK' : 'MISMATCH (expected in complex HTML)');

// Check the full script section for duplicate function names
const fullScript = content.substring(scriptStart);
const funcMatches = fullScript.match(/function\s+(\w+)\s*\(/g) || [];
const funcNames = funcMatches.map(m => m.match(/function\s+(\w+)/)[1]);
const dupFuncs = funcNames.filter((name, index) => funcNames.indexOf(name) !== index);
if (dupFuncs.length > 0) {
    console.log('\nDuplicate function names:', [...new Set(dupFuncs)].join(', '));
} else {
    console.log('\nNo duplicate function names found');
}

// Check for var/let/const redeclarations at scope level
const constMatches = fullScript.match(/\bconst\s+(\w+)\s*=/g) || [];
const constNames = constMatches.map(m => m.match(/const\s+(\w+)/)[1]);
// Find potential top-level redeclarations (simple heuristic)
const topConsts = [];
fullScript.split('\n').forEach(line => {
    const m = line.match(/^\s{8}const\s+(\w+)\s*=/);
    if (m) topConsts.push(m[1]);
});
const dupConsts = topConsts.filter((name, idx) => topConsts.indexOf(name) !== idx);
if (dupConsts.length > 0) {
    console.log('Potential top-level const redeclarations:', [...new Set(dupConsts)].join(', '));
}

console.log('\nTotal lines:', content.split('\n').length);
console.log('File size:', Math.round(content.length / 1024), 'KB');
