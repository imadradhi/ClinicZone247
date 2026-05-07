import os
import re

path = r'g:\Dev\ClinicZone247\public\dashboard_corrupted.html'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # 1. Join obviously split strings (already done but let's be thorough)
    # If line has unclosed quote and next line starts with text
    if (line.count('"') % 2 != 0 or line.count("'") % 2 != 0) and '`' not in line:
        if i + 1 < len(lines):
            line = line.replace('\n', '').replace('\r', '') + ' ' + lines[i+1].lstrip()
            i += 1
            continue

    # 2. Fix comments swallowing code
    # Example: // comment let x = 5;
    if line.strip().startswith('//'):
        # Look for keywords that shouldn't be in a comment unless they are at the start
        # This is tricky because comments can contain code examples.
        # But in this mangled file, it's very obvious.
        match = re.search(r'//.*?\s(let|const|function|if|return|var|for|while|tRef|auth|db|firebase)\s', line)
        if match:
            keyword_start = match.start(1)
            comment_part = line[:keyword_start]
            code_part = line[keyword_start:]
            new_lines.append(comment_part + '\n')
            line = code_part
            # Don't increment i, so we can check code_part for more issues
            # But we need to make sure we don't loop forever
            # If we split, we just update 'line' and continue checking it.
            # However, it's safer to just process 'line' now.
    
    # 3. Join lines that end with a keyword or operator
    if line.strip().endswith(('const', 'let', 'function', 'return', '=', '+', '-', '*', '/', ',', '(', '{', '[')):
        if i + 1 < len(lines):
            line = line.replace('\n', '').replace('\r', '') + ' ' + lines[i+1].lstrip()
            i += 1
            continue

    new_lines.append(line)
    i += 1

# One more pass to fix specific issues
final_lines = []
for line in new_lines:
    # Fix the 'const rows' issue I saw earlier
    if "rows.forEach" in line and "const rows =" not in line:
        # Try to find if 'const rows =' was on the previous line and got eaten?
        # Actually, let's just surgically fix the known one
        if "filterExpenses" in line:
             line = line.replace("rows.forEach", "const rows = document.querySelectorAll('#expenses-list tr');\n rows.forEach")
    final_lines.append(line)

with open(r'g:\Dev\ClinicZone247\public\dashboard_demangled.html', 'w', encoding='utf-8') as f:
    f.writelines(final_lines)
