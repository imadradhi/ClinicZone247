path = r'g:\Dev\ClinicZone247\public\settings_js.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'printWindow.document.write(html);' in content:
    # Find the last occurrence and add the missing parts
    parts = content.rsplit('printWindow.document.write(html);', 1)
    new_content = parts[0] + "printWindow.document.write(html);\n            printWindow.document.write('</body></html>');\n            printWindow.document.close();\n            printWindow.print();\n        }\n    }\n}\n"
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
