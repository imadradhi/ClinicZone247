with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix common injection/escape errors
# Note: we need to replace 'uFEFF' with '\uFEFF'
content = content.replace("'uFEFF'", "'\\uFEFF'")
content = content.replace("طريقة الدفعn'", "طريقة الدفع\\n'")
content = content.replace("join(',') + 'n'", "join(',') + '\\n'")

# Also check for any other missing backslashes in template literals if any
# (Though view_file suggested ${ was okay)

with open('g:/Dev/ClinicZone247/public/dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed backslash errors in CSV export.')
