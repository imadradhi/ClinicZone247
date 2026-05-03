import re

with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    text = f.read()

needed = ['loadAppointments', 'selectAppDate', 'onDateSelectChange', 'filterAppointments', 
          'bookAppointment', 'cancelAppointment', 'attendAppointment',
          'loadVisits', 'saveVisit', 'filterInvoices', 'resetInvoiceFilters',
          'filterVisitServices', 'updateVisitBilling',
          'loadReports', 'handleReportPeriodChange', 'populateReportServiceFilter',
          'showPatientSelection', 'viewPatientHistory',
          'finishVisit', 'showToast',
          'saveServiceFromModal', 'closeServiceModal']

print("Function status check:")
for fn in needed:
    if 'function ' + fn in text:
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if 'function ' + fn in line:
                print(f"  [FOUND] {fn} at line {i+1}")
                break
    elif fn + '(' in text:
        print(f"  [CALLED BUT NOT DEFINED] {fn}")
    else:
        print(f"  [MISSING] {fn}")
