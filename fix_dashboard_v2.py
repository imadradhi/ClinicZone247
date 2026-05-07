import os

path = r'g:\Dev\ClinicZone247\public\dashboard_corrupted.html'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Fix missing script tag at the start of the JS section
# Search for the first firebase.database() call
for i, line in enumerate(lines):
    if 'const db = firebase.database();' in line:
        if i > 0 and '<script>' not in lines[i-1]:
            lines.insert(i, '<script>\n')
            break

# 2. Fix comments swallowing code (very specific ones)
for i, line in enumerate(lines):
    if '// نظام تعدد المستأجرين' in line and 'let tenantPath' in line:
        lines[i] = line.replace('let tenantPath', '\nlet tenantPath')
    if '// دالة تجلب المرجع' in line and 'function tRef' in line:
        lines[i] = line.replace('function tRef', '\nfunction tRef')
    if '// تحويل أي وقت' in line and 'function formatTimeTo12h' in line:
        lines[i] = line.replace('function formatTimeTo12h', '\nfunction formatTimeTo12h')

# 3. Fix the 'rows' redeclaration issue
# This usually happens if a function is not closed.
# But in this case, it might just be a duplicate variable name in the same scope.
# I'll check if filterExpenses is correctly defined.
for i, line in enumerate(lines):
    if 'function filterExpenses(event)' in line:
        # Check if rows is defined inside.
        if 'const rows' not in lines[i+1] and 'const rows' not in lines[i+2]:
            lines.insert(i+1, "const rows = document.querySelectorAll('#expenses-list tr');\n")

# 4. Fix the broken template literal at 5474 (approximate)
for i, line in enumerate(lines):
    if "${appointment.pName.split(' ')[0]}` : '<i" in line:
        lines[i] = line.replace(": '<i", ": '<i class=\"fas fa-user-lock\"></i>'")

# 5. Fix the truncated end
if '</html>' not in lines[-1]:
    lines.append('\n</script>\n</body>\n</html>')

with open(r'g:\Dev\ClinicZone247\public\dashboard_fixed_v2.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)
