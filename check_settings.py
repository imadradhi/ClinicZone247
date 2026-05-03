with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the settings section HTML
start = None
for i, line in enumerate(lines):
    if 'id="settings"' in line and 'section' in line:
        start = i
        break

if start is None:
    print('Settings section not found, searching more broadly...')
    for i, line in enumerate(lines):
        if 'settings' in line.lower() and 'content-section' in line:
            print(f'Line {i+1}: {line.strip()}')
else:
    print(f'Settings section starts at line {start+1}')
    with open('g:/Dev/ClinicZone247/public/settings_section.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines[start:start+200])
    print('Saved to settings_section.txt')
