import re

path = r'g:\Dev\ClinicZone247\public\dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
for i, script in enumerate(scripts):
    try:
        # We can't really "check" JS syntax easily in Python without a parser
        # but we can look for common issues
        pass
    except Exception as e:
        print(f"Script {i} error: {e}")

# Let's just fix the known issues surgically
content = content.replace("rows.forEach(row => {", "const rows = document.querySelectorAll('#expenses-list tr');\n                                                                 rows.forEach(row => {")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
