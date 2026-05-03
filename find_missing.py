import re

with open('g:/Dev/ClinicZone247/public/dashboard_recovered_fixed.html', 'r', encoding='utf-8') as f:
    rec_text = f.read()

with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    dash_text = f.read()

rec_funcs = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', rec_text))
dash_funcs = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', dash_text))

missing = rec_funcs - dash_funcs
print("Missing functions (in recovered but not dashboard):")
for f in sorted(missing):
    print(f"  - {f}")

print(f"\nTotal missing: {len(missing)}")

# Appointment-related missing
app_missing = [f for f in missing if 'app' in f.lower() or 'appoint' in f.lower() or 'book' in f.lower() or 'slot' in f.lower() or 'calendar' in f.lower() or 'select' in f.lower() or 'load' in f.lower() or 'visit' in f.lower() or 'invoice' in f.lower() or 'report' in f.lower() or 'receipt' in f.lower() or 'toast' in f.lower() or 'chart' in f.lower()]
print("\nCritical missing functions:")
for f in sorted(app_missing):
    print(f"  - {f}")
