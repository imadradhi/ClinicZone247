import re

with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find appointments section HTML
start = None
for i, line in enumerate(lines):
    if 'id="appointments"' in line and 'section' in line:
        start = i
        break

if start:
    with open('g:/Dev/ClinicZone247/public/appointments_section.txt', 'w', encoding='utf-8') as f:
        # Write 250 lines from start
        f.writelines(lines[start:start+250])
    print(f"Appointments section starts at line {start+1}")
else:
    print("Appointments section NOT FOUND")

# Also find all appointment-related functions
text = ''.join(lines)
funcs_needed = ['loadAppointments', 'selectAppDate', 'bookAppointment', 'cancelAppointment', 'showAppointments']
for fn in funcs_needed:
    if fn in text:
        # Find line number
        for i, line in enumerate(lines):
            if 'function ' + fn in line:
                print(f"function {fn} found at line {i+1}")
                break
        else:
            # Maybe it's called but not defined as function
            for i, line in enumerate(lines):
                if fn in line:
                    print(f"{fn} referenced at line {i+1}: {line.strip()[:80]}")
                    break
    else:
        print(f"{fn} NOT FOUND anywhere")

# Find all function definitions in dashboard
all_funcs = []
for i, line in enumerate(lines):
    m = re.search(r'function\s+([a-zA-Z0-9_]+)\s*\(', line)
    if m:
        all_funcs.append((i+1, m.group(1)))

print(f"\nTotal functions defined: {len(all_funcs)}")
# Print appointment-related ones
for ln, name in all_funcs:
    if any(k in name.lower() for k in ['app', 'appoint', 'book', 'slot', 'calendar', 'schedule']):
        print(f"  Line {ln}: {name}")
