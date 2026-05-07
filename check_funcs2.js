const fs = require('fs');
const content = fs.readFileSync('public/dashboard.html', 'utf8');

// Find all onclick= references in HTML
const onclickMatches = content.match(/onclick="([^"]+)"/g) || [];
const calledFunctions = new Set();

onclickMatches.forEach(m => {
    const val = m.match(/onclick="([^"]+)"/)[1];
    // extract function names
    const fns = val.match(/(\w+)\s*\(/g) || [];
    fns.forEach(fn => calledFunctions.add(fn.replace('(', '')));
});

// Also find onkeyup, onchange, onblur, onfocus, onmouseover, onmouseout
const eventAttrs = ['onkeyup', 'onchange', 'onblur', 'onfocus', 'onmouseover', 'onmouseout', 'oninput'];
eventAttrs.forEach(attr => {
    const matches = content.match(new RegExp(`${attr}="([^"]+)"`, 'g')) || [];
    matches.forEach(m => {
        const fns = m.match(/(\w+)\s*\(/g) || [];
        fns.forEach(fn => calledFunctions.add(fn.replace('(', '')));
    });
});

// Find all defined functions in script
const scriptSection = content.substring(content.indexOf('<script>', 2900));
const definedFunctions = new Set();
const funcMatches = scriptSection.match(/function\s+(\w+)\s*\(/g) || [];
funcMatches.forEach(m => {
    const name = m.match(/function\s+(\w+)/)[1];
    definedFunctions.add(name);
});

// Find undefined functions that are called from HTML
const missing = [];
calledFunctions.forEach(fn => {
    // Skip built-ins
    if (['confirm', 'alert', 'window', 'document', 'console', 'Math', 'parseInt', 'parseFloat', 'String', 'Array', 'Object', 'Date', 'setTimeout', 'clearTimeout', 'print'].includes(fn)) return;
    if (!definedFunctions.has(fn)) {
        missing.push(fn);
    }
});

if (missing.length > 0) {
    console.log('Functions called in HTML but NOT defined in script:');
    missing.forEach(fn => console.log('  - ' + fn));
} else {
    console.log('All HTML-called functions are defined OK');
}

console.log('\nDefined functions count:', definedFunctions.size);
console.log('Called from HTML count:', calledFunctions.size);

// Check for filterInvoices specifically
console.log('\nfilterInvoices defined:', definedFunctions.has('filterInvoices'));
console.log('loadReports defined:', definedFunctions.has('loadReports'));
console.log('printReport defined:', definedFunctions.has('printReport'));
console.log('exportPaymentsToCsv defined:', definedFunctions.has('exportPaymentsToCsv'));
console.log('saveVisit defined:', definedFunctions.has('saveVisit'));
