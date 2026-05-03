import sys

new_funcs = '''
        // --- إعدادات العيادة ---
        function saveClinicName() {
            const name = document.getElementById('set-clinic-name').value;
            if(!name) { showToast("يرجى إدخال اسم العيادة", "error"); return; }
            tRef('settings').update({ clinicName: name }).then(() => {
                showToast("تم حفظ اسم العيادة بنجاح", "success");
            });
        }

        // --- إعدادات الجدول ---
        function saveScheduleSettings() {
            const checkboxes = document.querySelectorAll('#working-days input:checked');
            const days = Array.from(checkboxes).map(cb => cb.value);
            const start = document.getElementById('set-start-time').value;
            const end = document.getElementById('set-end-time').value;
            const duration = document.getElementById('set-slot-duration').value;

            tRef('settings/schedule').set({
                workingDays: days,
                startTime: start,
                endTime: end,
                slotDuration: duration
            }).then(() => {
                showToast("تم حفظ إعدادات الجدول بنجاح", "success");
            });
        }

        function loadScheduleSettings() {
            tRef('settings/schedule').once('value', snap => {
                const s = snap.val();
                if(s) {
                    if(s.workingDays) {
                        document.querySelectorAll('#working-days input').forEach(cb => {
                            cb.checked = s.workingDays.includes(cb.value);
                        });
                    }
                    if(s.startTime) document.getElementById('set-start-time').value = s.startTime;
                    if(s.endTime) document.getElementById('set-end-time').value = s.endTime;
                    if(s.slotDuration) document.getElementById('set-slot-duration').value = s.slotDuration;
                }
            });
            
            tRef('settings/clinicName').once('value', snap => {
                const name = snap.val();
                if(name) {
                    const el = document.getElementById('set-clinic-name');
                    if(el) el.value = name;
                }
            });
        }

        // --- إعدادات الخدمات ---
        let editingServiceId = null;

        function addService() {
            const name = document.getElementById('service-name').value;
            const price = document.getElementById('service-price').value;
            const sessions = document.getElementById('service-sessions').value;

            if(!name || !price || !sessions) {
                showToast("يرجى ملء كافة البيانات", "error");
                return;
            }

            if(editingServiceId) {
                tRef('services/' + editingServiceId).update({ name, price, sessions }).then(() => {
                    showToast("تم تحديث الخدمة بنجاح", "success");
                    resetServiceForm();
                });
            } else {
                tRef('services').push({ name, price, sessions }).then(() => {
                    showToast("تم إضافة الخدمة بنجاح", "success");
                    resetServiceForm();
                });
            }
        }

        function resetServiceForm() {
            editingServiceId = null;
            document.getElementById('service-name').value = "";
            document.getElementById('service-price').value = "";
            document.getElementById('service-sessions').value = "1";
            document.getElementById('btn-add-service').innerHTML = '<i class="fas fa-plus"></i> إضافة خدمة';
            document.getElementById('btn-reset-service').style.display = 'none';
        }

        function prepareEditService(id, name, price, sessions) {
            editingServiceId = id;
            document.getElementById('service-name').value = name;
            document.getElementById('service-price').value = price;
            document.getElementById('service-sessions').value = sessions;
            document.getElementById('btn-add-service').innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
            document.getElementById('btn-reset-service').style.display = 'inline-block';
        }

        function deleteService(id) {
            if(confirm("هل أنت متأكد من حذف هذه الخدمة؟")) {
                tRef('services/' + id).remove().then(() => {
                    showToast("تم حذف الخدمة بنجاح", "success");
                });
            }
        }

        function loadServices() {
            tRef('services').on('value', snap => {
                const list = document.getElementById('services-list');
                if(!list) return;
                let html = "";
                snap.forEach(child => {
                    const s = child.val();
                    html += `
                        <tr>
                            <td style="font-weight:700;">${s.name}</td>
                            <td>${parseFloat(s.price).toLocaleString()} د.ع</td>
                            <td>${s.sessions} جلسات</td>
                            <td>
                                <button class="btn-action btn-edit" onclick="prepareEditService('${child.key}', '${s.name}', '${s.price}', '${s.sessions}')"><i class="fas fa-edit"></i></button>
                                <button class="btn-action btn-delete" onclick="deleteService('${child.key}')"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                });
                list.innerHTML = html;
            });
        }

        function filterServices() {
            const term = document.getElementById('service-search').value.toLowerCase();
            const rows = document.querySelectorAll('#services-list tr');
            rows.forEach(row => {
                const name = row.cells[0].textContent.toLowerCase();
                row.style.display = name.includes(term) ? "" : "none";
            });
        }
        
        function loadServicesView() {
            tRef('services').once('value', snap => {
                const list = document.getElementById('services-view-list');
                if(!list) return;
                let html = "";
                snap.forEach(child => {
                    const s = child.val();
                    html += `
                        <div class="card" style="padding: 15px; border-radius: 12px; background: white; border: 1px solid var(--border);">
                            <h4 style="margin: 0 0 10px 0; color: var(--primary);">${s.name}</h4>
                            <p style="margin: 5px 0;">السعر: <strong>${parseFloat(s.price).toLocaleString()} د.ع</strong></p>
                            <p style="margin: 5px 0;">عدد الجلسات: <strong>${s.sessions}</strong></p>
                        </div>
                    `;
                });
                list.innerHTML = html;
            });
        }
'''

with open('g:/Dev/ClinicZone247/public/dashboard.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.rfind('</script>')
if idx != -1:
    text = text[:idx] + new_funcs + '\n    ' + text[idx:]
    with open('g:/Dev/ClinicZone247/public/dashboard.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Successfully appended settings logic.')
else:
    print('</script> not found')
