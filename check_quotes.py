import re

path = r'g:\Dev\ClinicZone247\public\dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if ("innerHTML =" in line or "+=" in line) and ("'" in line or '"' in line) and "`" not in line:
        # Check if it has an odd number of quotes (unclosed)
        if line.count("'") % 2 != 0 or line.count('"') % 2 != 0:
            print(f"Potential error at line {i+1}: {line.strip()}")
