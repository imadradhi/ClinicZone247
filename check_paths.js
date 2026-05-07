const fs = require('fs');
const dash = fs.readFileSync('public/dashboard.html', 'utf8');

// Find the tenant path setup
const tenantLine = dash.match(/tenantPath = .+/);
console.log('TenantPath assignment:', tenantLine ? tenantLine[0] : 'not found');

// Find the sanitizedEmail logic
const sanitized = dash.match(/sanitizedEmail.+/);
console.log('SanitizedEmail:', sanitized ? sanitized[0] : 'not found');

// Check: does any data read skip the tenantPath (direct db.ref call)?
const directRefs = (dash.match(/db\.ref\(/g) || []).length;
console.log('\nDirect db.ref() calls:', directRefs);

// The tenantPath format
// email: something@gmail.com -> sanitizedEmail = "something" -> tenantPath = "clinics/something/"
// If data is stored at root (patients/...) it won't be found

// Check the database.rules.json to see the schema
const rulesPath = 'database.rules.json';
if (fs.existsSync(rulesPath)) {
    const rules = fs.readFileSync(rulesPath, 'utf8');
    console.log('\ndatabase.rules.json:');
    console.log(rules.substring(0, 500));
} else {
    console.log('\nNo database.rules.json found - checking firebase.json');
}

if (fs.existsSync('firebase.json')) {
    const fj = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
    console.log('\nfirebase.json database:', JSON.stringify(fj.database || 'no database config', null, 2));
}
