with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    text = f.read()

checks = [
    ('saveClinicName function exists', 'function saveClinicName' in text),
    ('saveScheduleSettings uses sch-start', 'sch-start' in text),
    ('addService uses s-name', "getElementById('s-name')" in text),
    ('addService uses s-price', "getElementById('s-price')" in text),
    ('loadServices uses services-list', "getElementById('services-list')" in text),
    ('switchSettingsTab uses settings-panel-', 'settings-panel-' in text),
    ('loadServices called in settings section', "if (id === 'settings') { loadServices(); loadScheduleSettings(); }" in text),
]
for label, result in checks:
    print(f'[{"OK" if result else "FAIL"}] {label}')
