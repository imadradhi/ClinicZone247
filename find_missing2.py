import re

# The settings_js.js was extracted from a complete version of the file
with open('g:/Dev/ClinicZone247/public/settings_js.js', 'r', encoding='utf-8') as f:
    js_text = f.read()

with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    dash_text = f.read()

js_funcs = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', js_text))
dash_funcs = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', dash_text))

missing = js_funcs - dash_funcs
print("Functions in settings_js.js but NOT in dashboard.html:")
for f in sorted(missing):
    print(f"  - {f}")

print(f"\nTotal missing: {len(missing)}")

# Find appointment-related functions in settings_js.js
app_funcs = [f for f in js_funcs if 'app' in f.lower() or 'appoint' in f.lower() or 'book' in f.lower() or 'slot' in f.lower() or 'select' in f.lower() or 'load' in f.lower() or 'visit' in f.lower() or 'invoice' in f.lower() or 'report' in f.lower()]
print("\nAll appointment/load/visit/report functions in settings_js.js:")
for f in sorted(app_funcs):
    in_dash = "YES" if f in dash_funcs else "NO"
    print(f"  [{in_dash}] {f}")
