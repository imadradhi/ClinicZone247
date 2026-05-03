new_functions = '''
        // ========================================
        // === دوال المواعيد (Appointments) ===
        // ========================================

        function onDateSelectChange() {
            const day = document.getElementById('app-day-select').value;
            const month = document.getElementById('app-month-select').value;
            const year = document.getElementById('app-year-select').value;
            if (day && month !== '' && year) {
                const dateStr = year + '-' + String(parseInt(month)+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
                document.getElementById('selected-app-date').value = dateStr;
                selectAppDate(dateStr);
            }
        }

        function initDateSelectors() {
            const daySelect = document.getElementById('app-day-select');
            const monthSelect = document.getElementById('app-month-select');
            const yearSelect = document.getElementById('app-year-select');
            if (!daySelect || !monthSelect || !yearSelect) return;

            const now = new Date();
            const months = ['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول'];

            // Days
            daySelect.innerHTML = '';
            for (let d = 1; d <= 31; d++) {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                if (d === now.getDate()) opt.selected = true;
                daySelect.appendChild(opt);
            }

            // Months
            monthSelect.innerHTML = '';
            months.forEach((name, i) => {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = name;
                if (i === now.getMonth()) opt.selected = true;
                monthSelect.appendChild(opt);
            });

            // Years
            yearSelect.innerHTML = '';
            for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if (y === now.getFullYear()) opt.selected = true;
                yearSelect.appendChild(opt);
            }
        }

        function selectAppDate(dateStr, event, endDate) {
            document.getElementById('selected-app-date').value = dateStr;

            // Update the dropdowns to reflect selection
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const dayEl = document.getElementById('app-day-select');
                const monthEl = document.getElementById('app-month-select');
                const yearEl = document.getElementById('app-year-select');
                if (dayEl) dayEl.value = parseInt(parts[2]);
                if (monthEl) monthEl.value = parseInt(parts[1]) - 1;
                if (yearEl) yearEl.value = parts[0];
            }

            loadAppointments(dateStr, endDate);
        }

        let appointmentsListener = null;
        function loadAppointments(dateStr, endDate) {
            if (!dateStr) {
                dateStr = document.getElementById('selected-app-date').value || new Date().toISOString().split('T')[0];
            }

            // Detach previous listener
            if (appointmentsListener) {
                tRef('appointments').off('value', appointmentsListener);
            }

            appointmentsListener = tRef('appointments').on('value', snap => {
                const list = document.getElementById('appointments-list');
                const cardsContainer = document.getElementById('main-schedule-cards');
                if (!list) return;

                let html = '';
                let cardsHtml = '';
                let count = 0;

                const entries = [];
                snap.forEach(child => {
                    const a = child.val();
                    a._key = child.key;
                    entries.push(a);
                });

                // Sort by time
                entries.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                entries.forEach(a => {
                    const appDate = a.date || '';
                    let show = false;
                    if (endDate) {
                        show = appDate >= dateStr && appDate <= endDate;
                    } else {
                        show = appDate === dateStr;
                    }
                    if (!show) return;

                    count++;
                    const statusClass = a.status === 'تم الحضور' ? 'success' : (a.status === 'ملغي' ? 'danger' : 'warning');
                    const statusBg = a.status === 'تم الحضور' ? 'var(--success)' : (a.status === 'ملغي' ? 'var(--danger)' : 'var(--warning)');

                    html += \`<tr class="appointment-row" data-search="\${(a.pName || '')} \${(a.phone || '')} \${(a.serviceName || '')}" data-status="\${a.status || 'قادم'}">
                        <td><div><strong>\${a.date}</strong></div><div style="color:var(--primary); font-weight:700;">\${a.time || '--:--'}</div></td>
                        <td style="font-weight:700;">\${a.pName || '---'}</td>
                        <td>\${a.serviceName || '---'}</td>
                        <td>\${a.duration || 30} دقيقة</td>
                        <td>\${a.amount ? parseFloat(a.amount).toLocaleString() + ' د.ع' : '---'}</td>
                        <td><span class="badge-\${statusClass}" style="padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; background:\${statusBg}; color:white;">\${a.status || 'قادم'}</span></td>
                        <td>\${a.notes || '---'}</td>
                        <td>
                            <div style="display:flex; gap:5px; flex-wrap:wrap;">
                                \${a.status !== 'تم الحضور' && a.status !== 'ملغي' ? \`
                                    <button class="btn-action btn-edit" onclick="attendAppointment('\${a._key}')"><i class="fas fa-check"></i> حضور</button>
                                    <button class="btn-action btn-delete" onclick="cancelAppointment('\${a._key}')"><i class="fas fa-times"></i> إلغاء</button>
                                \` : ''}
                            </div>
                        </td>
                    </tr>\`;

                    // Time card
                    const cardBorder = a.status === 'تم الحضور' ? 'var(--success)' : (a.status === 'ملغي' ? 'var(--danger)' : 'var(--primary)');
                    cardsHtml += \`<div style="background: white; border-radius: 12px; padding: 15px; border-right: 4px solid \${cardBorder}; box-shadow: 0 2px 8px rgba(0,0,0,0.06); min-width: 180px;">
                        <div style="font-weight:800; color: var(--primary); font-size: 16px; margin-bottom: 5px;">\${a.time || '--:--'}</div>
                        <div style="font-weight:700; font-size: 14px; margin-bottom: 3px;">\${a.pName || '---'}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">\${a.serviceName || ''}</div>
                        <div style="margin-top: 8px;"><span style="padding:3px 10px; border-radius:15px; font-size:11px; font-weight:700; background:\${statusBg}; color:white;">\${a.status || 'قادم'}</span></div>
                    </div>\`;
                });

                if (count === 0) {
                    html = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-secondary);"><i class="fas fa-calendar-times" style="font-size:28px; margin-bottom:10px; display:block;"></i>لا توجد مواعيد في هذا التاريخ</td></tr>';
                    cardsHtml = '<div style="text-align:center; padding:30px; color:var(--text-secondary);"><i class="fas fa-calendar-check" style="font-size:28px; margin-bottom:10px; display:block;"></i>لا توجد حجوزات</div>';
                }

                list.innerHTML = html;
                if (cardsContainer) cardsContainer.innerHTML = cardsHtml;
            });
        }

        function attendAppointment(key) {
            tRef('appointments/' + key).update({
                status: 'تم الحضور',
                attendedAt: Date.now()
            }).then(() => {
                showToast("تم تأكيد حضور المراجع بنجاح", "success");
            });
        }

        function cancelAppointment(key) {
            if (confirm("هل أنت متأكد من إلغاء هذا الموعد؟")) {
                tRef('appointments/' + key).update({
                    status: 'ملغي',
                    cancelledAt: Date.now()
                }).then(() => {
                    showToast("تم إلغاء الموعد", "warning");
                });
            }
        }

        function filterAppointments() {
            const searchTerm = normalizeArabic(document.getElementById('appointment-search').value);
            const statusFilter = document.getElementById('appointment-status-filter').value;
            const rows = document.querySelectorAll('.appointment-row');

            rows.forEach(row => {
                const searchData = normalizeArabic(row.getAttribute('data-search') || '');
                const rowStatus = row.getAttribute('data-status') || '';
                const matchSearch = !searchTerm || searchData.includes(searchTerm);
                const matchStatus = statusFilter === 'الكل' || rowStatus === statusFilter;
                row.style.display = (matchSearch && matchStatus) ? '' : 'none';
            });
        }

        // ========================================
        // === دوال الفواتير والزيارات (Visits) ===
        // ========================================

        function loadVisits() {
            tRef('payments_log').on('value', snap => {
                const list = document.getElementById('visits-list');
                if (!list) return;

                let html = '';
                let totalCount = 0;
                let totalPaid = 0;
                const entries = [];

                snap.forEach(child => {
                    const v = child.val();
                    v._key = child.key;
                    entries.push(v);
                });

                // Sort by date descending
                entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                entries.forEach(v => {
                    totalCount++;
                    totalPaid += parseFloat(v.amount) || 0;

                    html += \`<tr class="invoice-row" data-name="\${normalizeArabic(v.pName || '')}" data-phone="\${v.phone || ''}" data-date="\${v.date || ''}">
                        <td style="font-weight:700; color:var(--primary);">\${v.visitId || v._key.slice(-6)}</td>
                        <td style="font-weight:700;">\${v.pName || '---'}</td>
                        <td>\${v.phone || '---'}</td>
                        <td>\${v.date || '---'}</td>
                        <td>\${v.serviceName || '---'}</td>
                        <td style="font-weight:800; color:var(--success);">\${parseFloat(v.amount || 0).toLocaleString()} د.ع</td>
                        <td>
                            <button class="btn-action btn-edit" onclick="printReceipt('\${v._key}')"><i class="fas fa-print"></i> طباعة</button>
                        </td>
                    </tr>\`;
                });

                if (totalCount === 0) {
                    html = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-secondary);">لا توجد فواتير</td></tr>';
                }

                list.innerHTML = html;

                const countEl = document.getElementById('invoice-count');
                const paidEl = document.getElementById('invoice-paid-total');
                if (countEl) countEl.textContent = totalCount;
                if (paidEl) paidEl.textContent = totalPaid.toLocaleString() + ' د.ع';
            });
        }

        function saveVisit() {
            const patientSelect = document.getElementById('visit-patient-select');
            const pId = patientSelect.value;
            if (!pId) {
                showToast("يرجى اختيار مراجع", "error");
                return;
            }

            const pName = patientSelect.options[patientSelect.selectedIndex].text;
            const phone = patientSelect.options[patientSelect.selectedIndex].getAttribute('data-phone') || '';
            const sessionsCount = parseInt(document.getElementById('visit-sessions-count').value) || 1;

            // Get selected services
            const checkboxes = document.querySelectorAll('#services-checkboxes input:checked');
            if (checkboxes.length === 0) {
                showToast("يرجى اختيار خدمة واحدة على الأقل", "error");
                return;
            }

            let services = [];
            let total = 0;
            checkboxes.forEach(cb => {
                const name = cb.getAttribute('data-name');
                const price = parseFloat(cb.getAttribute('data-price')) || 0;
                services.push({ name, price });
                total += price;
            });

            const visitId = "V-" + Date.now().toString().slice(-8);
            const date = new Date().toISOString().split('T')[0];
            const dateAr = new Date().toLocaleDateString('ar-EG');

            // Save to payments_log
            tRef('payments_log').push({
                visitId, pId, pName, phone, date, dateAr,
                serviceName: services.map(s => s.name).join(' + '),
                amount: total,
                sessions: sessionsCount,
                services,
                timestamp: Date.now(),
                method: 'نقداً'
            }).then(() => {
                showToast("تم حفظ الزيارة وإصدار الفاتورة بنجاح", "success");
                // Hide the visit section
                document.getElementById('new-visit-section').style.display = 'none';
                // Reload visits
                loadVisits();
            });
        }

        function filterInvoices() {
            const searchTerm = normalizeArabic(document.getElementById('invoice-patient-search').value);
            const dateFrom = document.getElementById('invoice-date-from').value;
            const dateTo = document.getElementById('invoice-date-to').value;

            const rows = document.querySelectorAll('.invoice-row');
            rows.forEach(row => {
                const name = row.getAttribute('data-name') || '';
                const phone = row.getAttribute('data-phone') || '';
                const date = row.getAttribute('data-date') || '';

                const matchSearch = !searchTerm || name.includes(searchTerm) || phone.includes(searchTerm);
                const matchDateFrom = !dateFrom || date >= dateFrom;
                const matchDateTo = !dateTo || date <= dateTo;

                row.style.display = (matchSearch && matchDateFrom && matchDateTo) ? '' : 'none';
            });
        }

        function resetInvoiceFilters() {
            document.getElementById('invoice-patient-search').value = '';
            document.getElementById('invoice-date-from').value = '';
            document.getElementById('invoice-date-to').value = '';
            filterInvoices();
        }

        function filterVisitServices() {
            const term = normalizeArabic(document.getElementById('visit-service-search').value);
            const checkboxes = document.querySelectorAll('#services-checkboxes label');
            checkboxes.forEach(label => {
                const name = normalizeArabic(label.textContent);
                label.style.display = name.includes(term) ? '' : 'none';
            });
        }

        function updateVisitBilling() {
            const checkboxes = document.querySelectorAll('#services-checkboxes input:checked');
            let total = 0;
            let summaryHtml = '';

            checkboxes.forEach(cb => {
                const name = cb.getAttribute('data-name');
                const price = parseFloat(cb.getAttribute('data-price')) || 0;
                total += price;
                summaryHtml += \`<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed var(--border);">
                    <span>\${name}</span>
                    <span style="font-weight:700;">\${price.toLocaleString()} د.ع</span>
                </div>\`;
            });

            const sessions = parseInt(document.getElementById('visit-sessions-count').value) || 1;
            const sessionPrice = total / sessions;

            document.getElementById('selected-services-summary').innerHTML = summaryHtml || '<p style="font-size: 13px; color: var(--text-secondary); margin: 0;">يرجى اختيار الخدمات لعرض الأسعار...</p>';
            document.getElementById('visit-total-display').textContent = total.toLocaleString() + ' د.ع';
            document.getElementById('session-price-display').textContent = Math.round(sessionPrice).toLocaleString() + ' د.ع';
        }

        function printReceipt(paymentKey) {
            tRef('payments_log/' + paymentKey).once('value', snap => {
                const v = snap.val();
                if (!v) return;

                document.getElementById('print-clinic-name').textContent = officialClinicName;
                document.getElementById('print-v-id').textContent = v.visitId || paymentKey.slice(-6);
                document.getElementById('print-date').textContent = v.dateAr || v.date || '';
                document.getElementById('print-p-name').textContent = v.pName || '';

                let itemsHtml = '';
                if (v.services && v.services.length) {
                    v.services.forEach(s => {
                        itemsHtml += \`<tr><td>\${s.name}</td><td style="text-align:left;">\${parseFloat(s.price).toLocaleString()} د.ع</td></tr>\`;
                    });
                } else {
                    itemsHtml = \`<tr><td>\${v.serviceName || '---'}</td><td style="text-align:left;">\${parseFloat(v.amount || 0).toLocaleString()} د.ع</td></tr>\`;
                }
                document.getElementById('print-items').innerHTML = itemsHtml;
                document.getElementById('print-total').textContent = parseFloat(v.amount || 0).toLocaleString() + ' د.ع';

                window.print();
            });
        }

        // ========================================
        // === دوال التقارير (Reports) ===
        // ========================================

        let reportServicesChart = null;
        let reportPaymentsChart = null;

        function handleReportPeriodChange() {
            const period = document.getElementById('report-period-select').value;
            const customDates = document.getElementById('report-custom-dates');
            if (customDates) {
                customDates.style.display = period === 'custom' ? 'flex' : 'none';
            }
        }

        function getReportDateRange() {
            const period = document.getElementById('report-period-select').value;
            const now = new Date();
            let startDate, endDate;

            switch (period) {
                case 'today':
                    startDate = endDate = now.toISOString().split('T')[0];
                    break;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    startDate = endDate = yesterday.toISOString().split('T')[0];
                    break;
                case 'last7':
                    endDate = now.toISOString().split('T')[0];
                    const d7 = new Date(now);
                    d7.setDate(d7.getDate() - 7);
                    startDate = d7.toISOString().split('T')[0];
                    break;
                case 'last30':
                    endDate = now.toISOString().split('T')[0];
                    const d30 = new Date(now);
                    d30.setDate(d30.getDate() - 30);
                    startDate = d30.toISOString().split('T')[0];
                    break;
                case 'thisMonth':
                    startDate = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01';
                    endDate = now.toISOString().split('T')[0];
                    break;
                case 'thisYear':
                    startDate = now.getFullYear() + '-01-01';
                    endDate = now.toISOString().split('T')[0];
                    break;
                case 'custom':
                    startDate = document.getElementById('report-start-date').value;
                    endDate = document.getElementById('report-end-date').value;
                    break;
            }
            return { startDate, endDate };
        }

        function populateReportServiceFilter() {
            tRef('services').once('value', snap => {
                const sel = document.getElementById('report-service-filter');
                if (!sel) return;
                sel.innerHTML = '<option value="all">كل الخدمات</option>';
                snap.forEach(child => {
                    const s = child.val();
                    sel.innerHTML += \`<option value="\${s.name}">\${s.name}</option>\`;
                });
            });
        }

        function loadReports() {
            const { startDate, endDate } = getReportDateRange();
            const methodFilter = document.getElementById('report-method-filter').value;
            const serviceFilter = document.getElementById('report-service-filter').value;

            if (!startDate || !endDate) return;

            tRef('payments_log').once('value', snap => {
                let totalIncome = 0;
                let totalRevenue = 0;
                let totalVisits = 0;
                let serviceMap = {};
                let methodMap = {};
                let paymentsHtml = '';

                const entries = [];
                snap.forEach(child => {
                    entries.push({ ...child.val(), _key: child.key });
                });
                entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                entries.forEach(v => {
                    const date = v.date || '';
                    if (date < startDate || date > endDate) return;
                    if (methodFilter !== 'all' && v.method !== methodFilter) return;
                    if (serviceFilter !== 'all' && !(v.serviceName || '').includes(serviceFilter)) return;

                    const amount = parseFloat(v.amount) || 0;
                    totalIncome += amount;
                    totalRevenue += amount;
                    totalVisits++;

                    // Service breakdown
                    const sName = v.serviceName || 'غير محدد';
                    serviceMap[sName] = (serviceMap[sName] || 0) + amount;

                    // Payment method breakdown
                    const method = v.method || 'نقداً';
                    methodMap[method] = (methodMap[method] || 0) + amount;

                    paymentsHtml += \`<tr>
                        <td>\${v.date || '---'}</td>
                        <td style="font-weight:700;">\${v.pName || '---'}</td>
                        <td>\${v.serviceName || '---'}</td>
                        <td style="font-weight:700; color:var(--success);">\${amount.toLocaleString()} د.ع</td>
                        <td>\${v.method || 'نقداً'}</td>
                    </tr>\`;
                });

                // Update stats
                document.getElementById('report-total-income').textContent = totalIncome.toLocaleString() + ' د.ع';
                document.getElementById('report-total-revenue').textContent = totalRevenue.toLocaleString() + ' د.ع';
                document.getElementById('report-total-visits').textContent = totalVisits;

                // Update payments table
                const paymentsList = document.getElementById('report-payments-list');
                if (paymentsList) {
                    paymentsList.innerHTML = paymentsHtml || '<tr><td colspan="5" style="text-align:center; padding:30px;">لا توجد بيانات في هذه الفترة</td></tr>';
                }

                // Update charts
                updateReportCharts(serviceMap, methodMap);
            });
        }

        function updateReportCharts(serviceMap, methodMap) {
            // Services chart
            const sCtx = document.getElementById('reportServicesChart');
            if (sCtx && typeof Chart !== 'undefined') {
                if (reportServicesChart) reportServicesChart.destroy();
                const sLabels = Object.keys(serviceMap);
                const sData = Object.values(serviceMap);
                const colors = ['#0d5c63', '#a2d240', '#d4af37', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899'];

                reportServicesChart = new Chart(sCtx, {
                    type: 'doughnut',
                    data: {
                        labels: sLabels,
                        datasets: [{ data: sData, backgroundColor: colors.slice(0, sLabels.length), borderWidth: 2, borderColor: '#fff' }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 12 } } } }
                    }
                });
            }

            // Payment methods chart
            const pCtx = document.getElementById('reportPaymentsChart');
            if (pCtx && typeof Chart !== 'undefined') {
                if (reportPaymentsChart) reportPaymentsChart.destroy();
                const pLabels = Object.keys(methodMap);
                const pData = Object.values(methodMap);
                const pColors = ['#059669', '#3b82f6', '#f59e0b', '#ef4444'];

                reportPaymentsChart = new Chart(pCtx, {
                    type: 'pie',
                    data: {
                        labels: pLabels,
                        datasets: [{ data: pData, backgroundColor: pColors.slice(0, pLabels.length), borderWidth: 2, borderColor: '#fff' }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 12 } } } }
                    }
                });
            }
        }

        function printReport() {
            window.print();
        }

        function exportPaymentsToCsv() {
            const rows = document.querySelectorAll('#report-payments-list tr');
            let csv = '\\uFEFF'; // BOM for Arabic support in Excel
            csv += 'التاريخ,المراجع,الخدمة,المبلغ,طريقة الدفع\\n';
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 5) {
                    csv += Array.from(cells).map(c => '"' + c.textContent.trim() + '"').join(',') + '\\n';
                }
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'report_' + new Date().toISOString().split('T')[0] + '.csv';
            link.click();
        }
'''

# Read current dashboard
with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Insert before the last </script>
idx = text.rfind('</script>')
if idx != -1:
    text = text[:idx] + new_functions + '\n    ' + text[idx:]
    with open('g:/Dev/ClinicZone247/public/dashboard.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Successfully injected all missing functions!')
else:
    print('ERROR: </script> not found')
