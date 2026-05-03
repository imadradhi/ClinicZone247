import re

with open('g:/Dev/ClinicZone247/public/settings_js.js', 'r', encoding='utf-8') as f:
    text = f.read()

needed = ['loadAppointments', 'selectAppDate', 'onDateSelectChange', 'filterAppointments',
          'cancelAppointment', 'attendAppointment',
          'loadVisits', 'saveVisit', 'filterInvoices', 'resetInvoiceFilters',
          'filterVisitServices', 'updateVisitBilling',
          'loadReports', 'handleReportPeriodChange', 'populateReportServiceFilter']

print("Looking for missing functions in settings_js.js (recovered):")
for fn in needed:
    if 'function ' + fn in text:
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if 'function ' + fn in line:
                print(f"  [FOUND] {fn} at line {i+1}")
                break
    else:
        print(f"  [NOT HERE] {fn}")
