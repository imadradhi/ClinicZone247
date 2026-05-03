with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Find appointments functions
import re
funcs = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', text)
app_funcs = [f for f in funcs if 'app' in f.lower() or 'appoint' in f.lower() or 'book' in f.lower() or 'calendar' in f.lower() or 'slot' in f.lower()]
print("Appointment-related functions:", app_funcs)

# Check IDs referenced in appointments JS vs HTML
ids_in_js = re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", text)
app_ids = [i for i in ids_in_js if 'app' in i.lower() or 'appoint' in i.lower() or 'slot' in i.lower() or 'calendar' in i.lower()]
print("\nAppointment-related IDs used in JS:", list(set(app_ids)))
