        function switchSettingsTab(tabId) {
            // إخفاء كافة لوحات الإعدادات
            document.querySelectorAll('.settings-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            // إلغاء تفعيل كافة أزرار التبويبات
            document.querySelectorAll('.settings-tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // إظهار اللوحة المطلوبة وتفعيل زرها
            document.getElementById('settings-' + tabId).classList.add('active');
            const activeBtn = Array.from(document.querySelectorAll('.settings-tab-btn')).find(btn => {
                return btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tabId}'`);
            });
            if (activeBtn) activeBtn.classList.add('active');
        }

        // --- وظيفة تسجيل الخروج مع التأكيد ---
        function handleLogout() {
            if (confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟")) {
                auth.signOut();
            }
        }

        // --- التنقل بين الأقسام ---
        function showSection(id, isEdit = false, event = null) {
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

            const section = document.getElementById(id);
            if (section) section.classList.add('active');

            if (event && event.currentTarget) {
                event.currentTarget.classList.add('active');
            } else {
                const navItem = Array.from(document.querySelectorAll('.nav-item')).find(item => {
                    return item.getAttribute('onclick') && item.getAttribute('onclick').includes(`'${id}'`);
                });
                if (navItem) navItem.classList.add('active');
            }

            if (id === 'services-view') loadServicesView();
            if (id === 'settings') { loadServices(); loadScheduleSettings(); }
            if ((id === 'patient-entry' || id === 'patients') && !isEdit) {
                resetPatientForm();
                loadPatients();
            }
            if (id === 'visits') {
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('invoice-date-from').value = today;
                document.getElementById('invoice-date-to').value = today;
                loadPatients(); loadServices(); loadVisits();
            }
            if (id === 'appointments') { loadPatients(); loadServices(); loadAppointments(); }
            if (id === 'reports') { handleReportPeriodChange(); populateReportServiceFilter(); loadReports(); }
            if (id === 'home') updateDashboardStats();
            if (id === 'patient-history' && !currentHistoryPId) showPatientSelection();
        }

        function setAppView(view, el) {
            currentAppView = view;
            document.querySelectorAll('.view-tab').forEach(t => {
                t.classList.remove('active');
                t.style.background = 'transparent';
                t.style.color = 'var(--text-secondary)';
            });
            el.classList.add('active');
            el.style.background = 'var(--primary)';
            el.style.color = 'white';

            const rangeContainer = document.getElementById('custom-date-range-container');
            rangeContainer.style.display = (view === 'custom') ? 'flex' : 'none';

            const date = document.getElementById('selected-app-date').value;
            selectAppDate(new Date().toISOString().split('T')[0]);
            if (view !== 'custom') {
                selectAppDate(date || new Date().toISOString().split('T')[0]);
            }
        }

        function applyCustomRange() {
            const start = document.getElementById('app-range-start').value;
            const end = document.getElementById('app-range-end').value;
            if (start && end) {
                selectAppDate(start, null, end);
            } else {
                showToast("يرجى اختيار التاريخين معاً", "warning");
            }
        }

        // --- التحكم في طي مساحة الخدمات ---
        function toggleServicesFold() {
            const container = document.getElementById('services-fold-container');
            const icon = document.getElementById('srv-fold-icon');
            if (container.style.display === 'none') {
                container.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
            } else {
                container.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
            }
        }

        // --- إدارة المراجعين ---
        let editingPatientId = null;
        let patientsListenerInitialized = false;

        function addPatient() {
            const name = document.getElementById('p-name').value;
            const phone = document.getElementById('p-phone').value || "";
            const gender = document.getElementById('p-gender').value;
            const address = document.getElementById('p-address').value || "";
            const age = document.getElementById('p-age').value || "";

            if (!name) {
                showToast("يرجى إدخال اسم المراجع", 'error');
                return;
            }

            if (editingPatientId) {
                // تحديث بيانات مراجع موجود
                tRef('patients/' + editingPatientId).update({
                    name, phone, gender, address, age
                }).then(() => {
                    showToast("تم تحديث بيانات المراجع بنجاح", 'success');
                    resetPatientForm();
                    showSection('patient-entry');
                });
            } else {
                // تسجيل مراجع جديد
                const regDate = new Date().toLocaleDateString('ar-EG');
                tRef('counters/lastPatientId').transaction((currentValue) => {
                    return (currentValue || 1000) + 1;
                }, (error, committed, snapshot) => {
                    if (committed) {
                        const nextId = snapshot.val();
                        const pId = "P-" + nextId;
                        tRef('patients/' + pId).set({ name, phone, gender, address, age, regDate, pId, createdAt: Date.now() }).then(() => {
                            showToast("تم تسجيل المراجع بنجاح برقم: " + pId, 'success');
                            resetPatientForm();
                            showSection('patient-entry');
                        }).catch(err => {
                            showToast('حدث خطأ: ' + err.message, 'error');
                        });
                    }
                });
            }
        }

        function prepareEditPatient(pId) {
            tRef('patients/' + pId).once('value', snap => {
                const p = snap.val();
                editingPatientId = pId;

                const html = `
                    <div style="text-align: right; padding: 40px; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); max-width: 800px; width: 90%; margin: 20px auto; position: relative; overflow: hidden; animation: staggerFadeIn 0.3s ease;">
                        <!-- Decoration -->
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 5px; background: linear-gradient(90deg, var(--warning), var(--primary));"></div>

                        <h3 style="margin: 0 0 30px 0; color: var(--primary); font-size: 24px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-user-edit"></i> تعديل بيانات المراجع
                        </h3>
                        
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <!-- Basic Info Section -->
                            <div style="border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 5px;">
                                <h4 style="margin: 0; color: var(--primary); font-size: 16px;"><i class="fas fa-id-card"></i> المعلومات الأساسية</h4>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>الاسم الثلاثي للمراجع <span style="color: var(--danger);">*</span></label>
                                    <div style="position: relative;">
                                        <i class="fas fa-user" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                                        <input type="text" id="modal-p-name" value="${p.name}" placeholder="الاسم الثلاثي" style="padding-right: 45px; height: 50px;">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>رقم الهاتف</label>
                                    <div style="position: relative;">
                                        <i class="fas fa-phone" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                                        <input type="text" id="modal-p-phone" value="${p.phone || ''}" placeholder="07xxxxxxxxx" style="padding-right: 45px; height: 50px; direction: ltr; text-align: right;">
                                    </div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>عمر المراجع</label>
                                    <div style="position: relative;">
                                        <i class="fas fa-calendar-alt" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                                        <input type="number" id="modal-p-age" value="${p.age || ''}" placeholder="العمر" min="0" max="150" style="padding-right: 45px; height: 50px;">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>الجنس</label>
                                    <div style="position: relative;">
                                        <i class="fas fa-venus-mars" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                                        <select id="modal-p-gender" style="padding-right: 45px; height: 50px;">
                                            <option value="امرأة" ${p.gender === 'امرأة' ? 'selected' : ''}>امرأة</option>
                                            <option value="رجل" ${p.gender === 'رجل' ? 'selected' : ''}>رجل</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Contact Info Section -->
                            <div style="border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-top: 10px;">
                                <h4 style="margin: 0; color: var(--primary); font-size: 16px;"><i class="fas fa-map-marked-alt"></i> تفاصيل السكن</h4>
                            </div>

                            <div class="form-row">
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label>العنوان الكامل</label>
                                    <div style="position: relative;">
                                        <i class="fas fa-location-dot" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                                        <input type="text" id="modal-p-address" value="${p.address || ''}" placeholder="المحافظة - القضاء - المنطقة - أقرب نقطة دالة" style="padding-right: 45px; height: 50px;">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 35px; display: flex; gap: 15px; justify-content: space-between; align-items: center;">
                            <button class="btn btn-md" style="background: rgba(225, 29, 72, 0.1); color: var(--danger); border: 1px solid rgba(225, 29, 72, 0.2); cursor: pointer; transition: all 0.3s ease;" id="modal-delete-btn" onmouseover="this.style.background='var(--danger)'; this.style.color='white'" onmouseout="this.style.background='rgba(225, 29, 72, 0.1)'; this.style.color='var(--danger)'">
                                <i class="fas fa-trash-alt"></i> حذف المراجع
                            </button>
                            <div style="display: flex; gap: 15px;">
                                <button class="btn btn-md btn-secondary" style="cursor: pointer;" id="modal-cancel-btn">
                                    <i class="fas fa-times"></i> إلغاء العملية
                                </button>
                                <button class="btn btn-md btn-primary" style="cursor: pointer;" id="modal-save-btn">
                                    <i class="fas fa-save"></i> حفظ التعديلات
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                const popup = document.createElement('div');
                popup.style.position = 'fixed';
                popup.style.top = '0';
                popup.style.left = '0';
                popup.style.width = '100%';
                popup.style.height = '100%';
                popup.style.background = 'rgba(0, 0, 0, 0.5)';
                popup.style.display = 'flex';
                popup.style.justifyContent = 'center';
                popup.style.alignItems = 'center';
                popup.style.zIndex = '10000';
                popup.style.backdropFilter = 'blur(4px)';

                popup.innerHTML = html;
                document.body.appendChild(popup);

                // إضافة مستمعي الأحداث
                const saveBtn = document.getElementById('modal-save-btn');
                const cancelBtn = document.getElementById('modal-cancel-btn');
                const deleteBtn = document.getElementById('modal-delete-btn');

                deleteBtn.addEventListener('click', () => {
                    if (confirm("هل أنت متأكد من عملية الحذف؟ لا يمكن التراجع عن هذا الإجراء.")) {
                        tRef('patients/' + pId).remove().then(() => {
                            showToast("تم حذف المراجع بنجاح", 'success');
                            document.body.removeChild(popup);
                        }).catch(err => {
                            showToast('حدث خطأ أثناء الحذف: ' + err.message, 'error');
                        });
                    }
                });

                saveBtn.addEventListener('click', () => {
                    const name = document.getElementById('modal-p-name').value;
                    const phone = document.getElementById('modal-p-phone').value || "";
                    const gender = document.getElementById('modal-p-gender').value;
                    const address = document.getElementById('modal-p-address').value || "";
                    const age = document.getElementById('modal-p-age').value || "";

                    if (!name) {
                        showToast('يرجى إدخال اسم المراجع', 'error');
                        return;
                    }

                    tRef('patients/' + pId).update({
                        name, phone, gender, address, age
                    }).then(() => {
                        showToast("تم تحديث بيانات المراجع بنجاح", 'success');
                        document.body.removeChild(popup);
                        loadPatients();
                    });
                });

                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(popup);
                });
            });
        }

        function resetPatientForm() {
            editingPatientId = null;
            document.getElementById('p-name').value = "";
            document.getElementById('p-phone').value = "";
            document.getElementById('p-address').value = "";
            const btn = document.querySelector('#patient-entry .btn-primary');
            btn.textContent = "إضافة مراجع جديد";
            btn.style.background = "";
        }

        function showAddPatientPage() {
            editingPatientId = null;
            document.getElementById('p-name').value = "";
            document.getElementById('p-phone').value = "";
            document.getElementById('p-address').value = "";
            document.getElementById('p-gender').value = "امرأة";
            showSection('add-patient-page');
        }

        function showAddPatientModal() {
            editingPatientId = null;
            const html = `
                <div style="text-align: right; padding: 25px; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 2px solid var(--primary); max-width: 500px; margin: 20px auto;">
                    <h3 style="margin: 0 0 20px 0; color: var(--primary); font-size: 20px; border-bottom: 2px solid var(--primary); padding-bottom: 10px;">
                        <i class="fas fa-user-plus"></i> تسجيل مراجع جديد
                    </h3>
                    
                    <div class="form-group">
                        <label>اسم المراجع <span style="color: var(--danger);">*</span></label>
                        <input type="text" id="modal-p-name" placeholder="الاسم الثلاثي">
                    </div>
                    
                    <div class="form-row" style="gap: 10px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>رقم الهاتف <span style="color: var(--danger);">*</span></label>
                            <input type="text" id="modal-p-phone" placeholder="07xxxxxxxxx">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>الجنس</label>
                            <select id="modal-p-gender">
                                <option value="امرأة">امرأة</option>
                                <option value="رجل">رجل</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>العنوان <span style="color: var(--danger);">*</span></label>
                        <input type="text" id="modal-p-address" placeholder="المحافظة - المنطقة - الشارع">
                    </div>
                    
                    <div style="margin-top: 25px; display: flex; gap: 10px;">
                        <button class="btn-primary" style="flex: 1; cursor: pointer;" id="modal-save-btn">
                            <i class="fas fa-save"></i> حفظ المراجع
                        </button>
                        <button class="btn-logout" style="cursor: pointer;" id="modal-cancel-btn">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                    </div>
                </div>
            `;

            const popup = document.createElement('div');
            popup.style.position = 'fixed';
            popup.style.top = '0';
            popup.style.left = '0';
            popup.style.width = '100%';
            popup.style.height = '100%';
            popup.style.background = 'rgba(0, 0, 0, 0.5)';
            popup.style.display = 'flex';
            popup.style.justifyContent = 'center';
            popup.style.alignItems = 'center';
            popup.style.zIndex = '10000';
            popup.style.backdropFilter = 'blur(4px)';

            popup.innerHTML = html;
            document.body.appendChild(popup);

            // إضافة مستمعي الأحداث
            const saveBtn = document.getElementById('modal-save-btn');
            const cancelBtn = document.getElementById('modal-cancel-btn');

            saveBtn.addEventListener('click', () => {
                const name = document.getElementById('modal-p-name').value;
                const phone = document.getElementById('modal-p-phone').value;
                const gender = document.getElementById('modal-p-gender').value;
                const address = document.getElementById('modal-p-address').value;

                if (!name || !phone || !address) {
                    showToast('يرجى ملء كافة البيانات المطلوبة', 'error');
                    return;
                }

                const regDate = new Date().toLocaleDateString('ar-EG');
                tRef('counters/lastPatientId').transaction((currentValue) => {
                    return (currentValue || 1000) + 1;
                }, (error, committed, snapshot) => {
                    if (committed) {
                        const nextId = snapshot.val();
                        const pId = "P-" + nextId;
                        tRef('patients/' + pId).set({
                            name, phone, gender, address, regDate, pId, createdAt: Date.now()
                        }).then(() => {
                            showToast("تم تسجيل المراجع بنجاح برقم: " + pId, 'success');
                            document.body.removeChild(popup);
                            loadPatients();
                        });
                    }
                });
            });

            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(popup);
            });
        }

        function loadPatients() {
            if (patientsListenerInitialized) return;
            patientsListenerInitialized = true; // منع تكرار المستمعين فوراً

            tRef('patients').on('value', snap => {
                // جلب جميع الزيارات مرة واحدة لحساب الأعداد بكفاءة
                tRef('visits').once('value', vSnap => {
                    const visitCounts = {};
                    vSnap.forEach(vc => {
                        const v = vc.val();
                        if (v && v.pId) {
                            visitCounts[v.pId] = (visitCounts[v.pId] || 0) + 1;
                        }
                    });

                    const lists = document.querySelectorAll('.patients-list-tbody');
                    const vSelect = document.getElementById('visit-patient-select');
                    const aSelect = document.getElementById('app-patient-select');

                    let rowsHtml = "";
                    let vOptions = '<option value="">-- اختر مراجع --</option>';
                    let aOptions = '<option value="">-- اختر مراجع --</option>';

                    let index = 1;
                    snap.forEach(child => {
                        const p = child.val();
                        const count = visitCounts[p.pId] || 0;
                        const searchContent = `${p.pId} ${p.name} ${p.phone} ${p.address || ''}`;
                        rowsHtml += `<tr class="patient-row-${p.pId} stagger-item" data-search-content="${searchContent}">
                            <td><span class="badge-info" style="background: var(--bg); color: var(--text-secondary);">${index++}</span></td>
                            <td style="font-weight: 700;">${p.name}</td>
                            <td>${p.gender || '---'}</td>
                            <td style="font-family: monospace; font-weight: 600;">${p.phone}</td>
                            <td>${p.address || '---'}</td>
                            <td><small>${p.regDate || '---'}</small></td>
                            <td>
                                <div style="display:flex; gap:8px;">
                                    <button class="btn-action btn-edit" onclick="prepareEditPatient('${p.pId}')">
                                        <i class="fas fa-edit"></i> تعديل
                                    </button>
                                </div>
                            </td>
                            <td>
                                <button class="btn-action btn-history" onclick="viewPatientHistory('${p.pId}', '${p.name}')">
                                    <i class="fas fa-history"></i> سجل المراجع
                                </button>
                            </td>
                        </tr>`;
                        vOptions += `<option value="${p.pId}" data-phone="${p.phone || ''}">${p.name} (${p.pId})</option>`;
                        aOptions += `<option value="${p.pId}" data-name="${p.name}" data-phone="${p.phone}">${p.name} (${p.pId})</option>`;
                    });

                    // تحديث DOM
                    lists.forEach(l => l.innerHTML = rowsHtml);
                    if (vSelect) vSelect.innerHTML = vOptions;
                    if (aSelect) aSelect.innerHTML = aOptions;

                    // إعادة تطبيق الفلترة لضمان بقاء البحث فعالاً بعد التحديث التلقائي
                    filterPatients();
                });
            });
        }

        // --- تصفية المراجعين (البحث) ---
        function normalizeArabic(text) {
            if (!text) return "";
            return text.toString()
                .replace(/[أإآ]/g, "ا")
                .replace(/ة/g, "ه")
                .replace(/ى/g, "ي")
                .replace(/[\u064B-\u0652]/g, "") // حذف التشكيل (الفتحة، الضمة، الخ)
                .toLowerCase()
                .trim();
        }

        function filterPatients(event) {
            const input1 = document.getElementById('patient-search');
            const input2 = document.getElementById('patient-search-main');

            // الحصول على قيمة الحقل الذي تم الكتابة فيه
            let val = "";
            if (event && event.target) {
                val = event.target.value;
            } else {
                val = (input1 && document.activeElement === input1 ? input1.value : (input2 && document.activeElement === input2 ? input2.value : ""));
                if (!val) val = (input1 && input1.value) || (input2 && input2.value) || "";
            }

            const term = normalizeArabic(val);

            // مزامنة نص البحث بين حقول البحث المختلفة في الصفحة
            if (input1 && input1 !== event?.target && input1.value !== val) input1.value = val;
            if (input2 && input2 !== event?.target && input2.value !== val) input2.value = val;

            const rows = document.querySelectorAll('.patients-list-tbody tr');
            rows.forEach(row => {
                const searchData = normalizeArabic(row.getAttribute('data-search-content') || "");
                row.style.display = searchData.includes(term) ? "" : "none";
            });
        }

        let currentHistoryPId = null;

        // --- وظائف الربط بين السجل والمواعيد والمحاسبة ---
        let sessionBookingPatient = null; // متغير لحفظ بيانات المراجع المحول من السجل

        function goToBookingForSession(pId) {
            tRef('patients/' + pId).once('value', snap => {
                const p = snap.val();
                sessionBookingPatient = p; // حفظ بيانات المراجع للحجز التلقائي
                showSection('appointments');

                // الانتقال التلقائي لقسم حجز المواعيد مع تنبيه المستخدم
                const target = document.querySelector('#appointments .form-card');
                if (target) target.scrollIntoView({ behavior: 'smooth' });

                showToast(`تم تحويل المراجع: ${p.name}. اختر الخدمات والوقت ثم اضغط "احجز".`, 'info');
            });
        }

        function searchPatientsForHistory() {
            const term = normalizeArabic(document.getElementById('history-patient-search').value);
            const resultsDiv = document.getElementById('history-patient-results');

            if (term.length < 2) {
                resultsDiv.style.display = 'none';
                return;
            }

            tRef('patients').once('value', snap => {
                let html = "";
                snap.forEach(child => {
                    const p = child.val();
                    const searchContent = normalizeArabic(`${p.name} ${p.phone} ${p.pId}`);
                    if (searchContent.includes(term)) {
                        html += `
                            <div onclick="selectPatientForHistory('${p.pId}', '${p.name}', '${p.phone}')" style="padding: 12px; border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='white'">
                                <div style="font-weight: 700; font-size: 14px; color: var(--primary);">${p.name}</div>
                                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                    <i class="fas fa-phone"></i> ${p.phone} | <i class="fas fa-id-card"></i> ${p.pId}
                                </div>
                            </div>`;
                    }
                });

                if (html) {
                    resultsDiv.innerHTML = html;
                    resultsDiv.style.display = 'block';
                } else {
                    resultsDiv.style.display = 'none';
                }
            });
        }

        function selectPatientForHistory(pId, pName, pPhone) {
            // Hide search results
            document.getElementById('history-patient-results').style.display = 'none';
            document.getElementById('history-patient-search').value = '';

            // Show patient history
            viewPatientHistory(pId, pName);

            // Show stats and table sections
            document.getElementById('history-stats-section').style.display = 'grid';
            document.getElementById('history-table-section').style.display = 'block';

            // Hide patient selection card
            document.getElementById('patient-selection-card').style.display = 'none';
        }

        // --- نظام إضافة الخدمة المطور من قائمة المراجعين ---
        function openAddServiceModal(pId) {
            try {
                if (!pId) {
                    showToast("خطأ: معرّف المراجع غير صحيح", "error");
                    return;
                }

                tRef('patients/' + pId).once('value', pSnap => {
                    const p = pSnap.val();
                    if (!p) {
                        showToast("خطأ: لم يتم العثور على بيانات المراجع", "error");
                        return;
                    }

                    tRef('services').once('value', sSnap => {
                        let servicesOptions = '<option value="">اختر خدمة...</option>';
                        let serviceCount = 0;
                        let servicesData = [];

                        sSnap.forEach(child => {
                            const s = child.val();
                            if (s && s.name && s.price !== undefined) {
                                servicesOptions += `<option value="${child.key}" data-name="${s.name}" data-price="${parseFloat(s.price)}" data-sessions="${parseInt(s.sessions) || 1}">${s.name} - ${parseFloat(s.price).toLocaleString()} د.ع</option>`;
                                servicesData.push({
                                    key: child.key,
                                    name: s.name,
                                    price: parseFloat(s.price),
                                    sessions: parseInt(s.sessions) || 1
                                });
                                serviceCount++;
                            }
                        });

                        if (serviceCount === 0) {
                            showToast("لا توجد خدمات متاحة", "warning");
                            return;
                        }

                        const modalHtml = `
                            <div style="background: white; padding: 25px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); width: 95%; max-width: 1200px; text-align: right; max-height: 80vh; overflow-y: auto;">
                                <h3 style="margin: 0 0 20px 0; color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 10px; font-size: 18px; font-weight: 700;">
                                    <i class="fas fa-plus-circle"></i> إضافة خدمة للمراجع: ${p.name}
                                </h3>

                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px;">
                                    <div>
                                        <label for="modal-service-select" style="font-weight: 700; display: block; margin-bottom: 10px; font-size: 14px; color: var(--text);">اختر الخدمة المطلوب إضافتها:</label>
                                        <select id="modal-service-select" onchange="updateModalServiceBilling()" style="width: 100%; height: 50px; padding: 12px 15px; border: 2px solid var(--border); border-radius: var(--radius-sm); font-family: 'Cairo'; font-size: 13px; background: white; transition: border-color 0.3s;">
                                            ${servicesOptions}
                                        </select>
                                    </div>

                                    <div style="background: var(--bg); padding: 15px; border-radius: 12px; border: 1px solid var(--border);">
                                        <label for="modal-service-notes" style="display: block; font-weight: 700; margin-bottom: 8px; color: var(--text); font-size: 14px;">ملاحظات الخدمة</label>
                                        <textarea id="modal-service-notes" placeholder="اكتب ملاحظات الخدمة هنا..." style="width: 100%; min-height: 80px; padding: 12px; border: 2px solid var(--border); border-radius: var(--radius-sm); font-family: 'Cairo'; font-size: 14px; resize: vertical; transition: border-color 0.3s; line-height: 1.5;"></textarea>
                                    </div>
                                </div>

                                <div style="background: var(--primary-light); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--primary); margin-bottom: 25px;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                        <div class="form-group" style="margin-bottom: 0;">
                                            <label style="font-weight: 600; font-size: 14px; color: var(--text); margin-bottom: 5px; display: block;">المبلغ الكلي (غير مسدد)</label>
                                            <input type="number" id="modal-total-price" value="0" min="0" oninput="updateModalServiceBilling(true)" style="width: 100%; height: 45px; padding: 10px; border: 2px solid var(--border); border-radius: var(--radius-sm); font-family: 'Cairo'; font-size: 14px; text-align: center;">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 0;">
                                            <label style="font-weight: 600; font-size: 14px; color: var(--text); margin-bottom: 5px; display: block;">عدد الجلسات</label>
                                            <input type="number" id="modal-sessions" value="1" min="1" oninput="updateModalServiceBilling(true)" style="width: 100%; height: 45px; padding: 10px; border: 2px solid var(--border); border-radius: var(--radius-sm); font-family: 'Cairo'; font-size: 14px; text-align: center;">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 0;">
                                            <label style="font-weight: 600; font-size: 14px; color: var(--text); margin-bottom: 5px; display: block;">المبلغ المدفوع الآن</label>
                                            <input type="number" id="modal-paid-now" value="0" min="0" placeholder="اتركه 0 إذا لم يدفع" style="width: 100%; height: 45px; padding: 10px; border: 2px solid var(--border); border-radius: var(--radius-sm); font-family: 'Cairo'; font-size: 14px; text-align: center;">
                                        </div>
                                    </div>
                                    <div style="display: flex; justify-content: center; align-items: center; padding-top: 15px; border-top: 1px dashed var(--primary); font-weight: 800; color: var(--primary); font-size: 16px;">
                                        <span>مبلغ كل جلسة:</span>
                                        <span id="modal-session-price" style="font-size: 18px; margin-right: 10px;">0 د.ع</span>
                                    </div>
                                </div>

                                <div style="display: flex; justify-content: center; gap: 15px;">
                                    <button class="btn-primary" style="flex: 1; max-width: 200px; height: 50px; font-size: 16px; font-weight: 700; background: var(--success); border: none; border-radius: var(--radius-sm);" onclick="saveServiceFromModal('${pId}', '${p.name}', '${p.phone}')">
                                        <i class="fas fa-save"></i> حفظ الخدمة
                                    </button>
                                    <button class="btn-logout" style="flex: 1; max-width: 150px; height: 50px; font-size: 16px; font-weight: 700; border: none; border-radius: var(--radius-sm);" onclick="closeServiceModal()">
                                        <i class="fas fa-times"></i> إلغاء
                                    </button>
                                </div>
                            </div>
                        `;

                        const popup = document.createElement('div');
                        popup.id = 'add-service-modal';
                        popup.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10005; backdrop-filter: blur(4px); padding: 20px;';
                        popup.innerHTML = modalHtml;
                        document.body.appendChild(popup);

                        // Ensure initial calculation
                        updateModalServiceBilling(false);
                    }).catch(err => {
                        console.error('Error loading services:', err);
                        showToast("خطأ في تحميل الخدمات", "error");
                    });
                }).catch(err => {
                    console.error('Error loading patient:', err);
                    showToast("خطأ في تحميل بيانات المراجع", "error");
                });
            } catch (error) {
                console.error('Error in openAddServiceModal:', error);
                showToast("حدث خطأ: " + error.message, "error");
            }
        }

        function updateModalServiceBilling(manualEdit = false) {
            const totalPriceInput = document.getElementById('modal-total-price');
            const sessionsInput = document.getElementById('modal-sessions');
            const sessionPriceDisplay = document.getElementById('modal-session-price');
            const serviceSelect = document.getElementById('modal-service-select');

            if (!manualEdit && serviceSelect) {
                const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
                if (selectedOption && selectedOption.value) {
                    const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
                    const sessions = parseInt(selectedOption.getAttribute('data-sessions')) || 1;
                    totalPriceInput.value = price;
                    sessionsInput.value = sessions;
                } else {
                    totalPriceInput.value = 0;
                    sessionsInput.value = 1;
                }
            }

            const finalTotal = parseFloat(totalPriceInput.value) || 0;
            const finalSessions = parseInt(sessionsInput.value) || 1;
            const pricePerSession = finalTotal / finalSessions;
            sessionPriceDisplay.textContent = Math.round(pricePerSession).toLocaleString() + " د.ع";
        }

        // --- عرض سجل خدمات مراجع محدد (بنظام البطاقات القابلة للطي) ---
        function viewPatientHistory(pId, pName) {
            currentHistoryPId = pId;
            document.getElementById('history-title').textContent = pName;
            document.getElementById('history-subtitle').innerHTML = `<i class="fas fa-id-card" style="color:var(--primary);"></i> رقم الملف: <span style="color: var(--text); font-weight: 800;">${pId}</span>`;
            document.getElementById('history-back-btn').style.display = 'flex';

            showSection('patient-history');
            document.getElementById('history-stats-section').style.display = 'grid';
            document.getElementById('history-table-section').style.display = 'block';
            document.getElementById('patient-selection-card').style.display = 'none';

            tRef('added_services').orderByChild('pId').equalTo(pId).off();

            tRef('added_services').orderByChild('pId').equalTo(pId).on('value', visitsSnap => {
                const list = document.getElementById('history-list');
                const emptyState = document.getElementById('history-empty');
                const totalVisitsEl = document.getElementById('history-total-visits');
                const totalIncomeEl = document.getElementById('history-total-income');
                const totalGrossEl = document.getElementById('history-total-gross');
                const totalDebtEl = document.getElementById('history-total-debt');

                if (visitsSnap.numChildren() === 0) {
                    list.innerHTML = "";
                    emptyState.style.display = 'block';
                    list.parentElement.style.display = 'none';
                    totalVisitsEl.textContent = '0';
                    totalIncomeEl.textContent = '0 د.ع';
                    totalDebtEl.textContent = '0 د.ع';
                    if (totalGrossEl) totalGrossEl.textContent = '0 د.ع';
                    return;
                }

                emptyState.style.display = 'none';
                list.parentElement.style.display = 'block';

                tRef('appointments').orderByChild('pId').equalTo(pId).once('value', appSnap => {
                    const appointmentsMap = {};
                    appSnap.forEach(appChild => {
                        appointmentsMap[appChild.key] = { ...appChild.val(), key: appChild.key };
                    });

                    let totalVisits = 0, totalIncome = 0, totalDebt = 0, totalGross = 0;
                    let cardsHtml = "";

                    // جلب الخدمات وتحويلها لمصفوفة لترتيبها تنازلياً حسب التاريخ
                    const services = [];
                    visitsSnap.forEach(child => {
                        services.push({ ...child.val(), key: child.key });
                    });
                    services.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                    services.forEach((v, index) => {
                        const srvNames = v.services.map(s => s.name).join(' + ');
                        const total = parseFloat(v.total) || 0;
                        const paid = parseFloat(v.paidAmount) || 0;
                        const sessionCount = parseInt(v.sessions) || 1;
                        const sessionPrice = total / sessionCount;
                        const sessionDetails = v.sessionDetails || Array.from({ length: sessionCount }, () => ({ executed: false, paid: false, appointmentId: null }));

                        const isFullyPaid = paid >= total && total > 0;
                        const executedCount = sessionDetails.filter(s => s.executed).length;
                        const progressPercent = (executedCount / sessionCount) * 100;

                        totalVisits += sessionCount;
                        totalIncome += paid;
                        totalDebt += (total - paid);
                        totalGross += total;

                        let sessionsTableHtml = `
                            <div class="table-container" style="margin-top: 0; box-shadow: none; border: none; border-radius: 0;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr>
                                            <th>الجلسة</th>
                                            <th>السعر</th>
                                            <th>الموعد</th>
                                            <th>حالة الحجز</th>
                                            <th>التنفيذ</th>
                                            <th>الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                        `;

                        let remainingBalance = paid;
                        for (let i = 0; i < sessionCount; i++) {
                            const session = sessionDetails[i];
                            const paidInThisSession = Math.min(sessionPrice, remainingBalance);
                            const remainingInThisSession = sessionPrice - paidInThisSession;
                            remainingBalance -= paidInThisSession;

                            let bookingStatusHtml = '';
                            let bookingActionHtml = '';
                            if (session.appointmentId && appointmentsMap[session.appointmentId]) {
                                const app = appointmentsMap[session.appointmentId];
                                bookingStatusHtml = `<span class="badge-info" style="background:var(--primary-light); color:var(--primary); font-size:10px;"><i class="fas fa-calendar-check"></i> محجوزة: ${app.date}</span>`;
                                bookingActionHtml = `<button class="btn-session-action btn-session-finish" onclick="openLargeCalendarForSession('${pId}', '${pName}', '${v.key}', '${v.bookingGroupId}', ${i}, '${app.key}', '${app.date}', '${app.time}')"><i class="fas fa-clock"></i> تعديل</button>`;
                            } else {
                                bookingStatusHtml = `<span class="badge-info" style="background:rgba(245, 158, 11, 0.1); color:var(--warning); font-size:10px;"><i class="fas fa-calendar-times"></i> غير محجوزة</span>`;
                                bookingActionHtml = `<button class="btn-session-action btn-session-book" onclick="openLargeCalendarForSession('${pId}', '${pName}', '${v.key}', '${v.bookingGroupId}', ${i}, null, null, null)"><i class="fas fa-calendar-plus"></i> حجز</button>`;
                            }

                            let execStatusHtml = '';
                            if (session.executed) {
                                execStatusHtml = `<span class="badge-info" style="background:rgba(16, 185, 129, 0.1); color:var(--success); font-size:10px;"><i class="fas fa-check-circle"></i> منفذة</span>`;
                            } else if (session.postponed) {
                                execStatusHtml = `<span class="badge-info" style="background:rgba(71, 85, 105, 0.1); color:var(--text-secondary); font-size:10px;"><i class="fas fa-clock"></i> مؤجلة</span>`;
                            } else {
                                execStatusHtml = `<span class="badge-info" style="background:#f1f5f9; color:#64748b; font-size:10px;"><i class="fas fa-hourglass-start"></i> بانتظار التنفيذ</span>`;
                            }

                            const payAction = paidInThisSession < sessionPrice ? `<button class="btn-session-action btn-session-pay" onclick="addPaymentToService('${v.key}', ${remainingInThisSession})"><i class="fas fa-cash-register"></i> تسديد</button>` : `<span style="color:var(--success); font-size:10px; font-weight:700;"><i class="fas fa-check-double"></i> مدفوع</span>`;
                            const finishAction = !session.executed ? `<button class="btn-session-action btn-session-pay" style="color: var(--success); background: rgba(16, 185, 129, 0.08);" onclick="finishSession('${v.key}', ${i})"><i class="fas fa-check"></i> إنهاء</button>` : '';
                            const postponeAction = !session.executed ? `<button class="btn-session-action btn-session-postpone" onclick="postponeSession('${v.key}', ${i}, '${session.appointmentId || ''}', '${pId}', '${pName}')"><i class="fas fa-undo"></i> تأجيل</button>` : '';

                            sessionsTableHtml += `
                                <tr style="${session.executed ? 'background: #f8fafc; opacity: 0.8;' : ''}">
                                    <td style="font-weight:700;">جلسة ${i + 1}</td>
                                    <td>${Math.round(sessionPrice).toLocaleString()}</td>
                                    <td>${bookingStatusHtml}</td>
                                    <td>${bookingActionHtml}</td>
                                    <td>${execStatusHtml}</td>
                                    <td>
                                        <div style="display:flex; gap:4px; justify-content:center;">${payAction}${finishAction}${postponeAction}</div>
                                    </td>
                                </tr>
                            `;
                        }
                        sessionsTableHtml += `</tbody></table></div>`;

                        const isFirst = (index === 0);
                        cardsHtml += `
                            <div class="service-history-card" ${isFullyPaid ? 'style="background-color: #f0fdf4; border-color: var(--success);"' : ''}>
                                <div class="service-header ${isFirst ? 'active' : ''}" onclick="toggleServiceAccordion(this)" ${isFullyPaid ? 'style="background: transparent;"' : ''}>
                                    <div class="service-title">
                                        <i class="fas fa-box-open" style="color: var(--primary);"></i>
                                        <div>
                                            <div style="font-size: 15px; font-weight: 800;">${srvNames}</div>
                                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">تاريخ الإضافة: ${v.date} | رقم الوصل: ${v.vId}</div>
                                        </div>
                                    </div>
                                    <div class="service-summary-stats" style="display: flex; gap: 25px; align-items: center;">
                                        <div style="text-align: center;">
                                            <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700;">المبلغ الإجمالي</div>
                                            <div style="font-size: 13px; font-weight: 800; color: var(--text);">${total.toLocaleString()} د.ع</div>
                                        </div>
                                        <div style="text-align: center;">
                                            <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700;">المسدد</div>
                                            <div style="font-size: 13px; font-weight: 800; color: var(--success);">${paid.toLocaleString()} د.ع</div>
                                        </div>
                                        <div style="text-align: center;">
                                            <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700;">الإنجاز</div>
                                            <div style="font-size: 13px; font-weight: 800; color: var(--primary);">${executedCount} / ${sessionCount}</div>
                                        </div>
                                        <div style="display: flex; gap: 8px; margin-right: 10px;">
                                            <button class="btn-action btn-edit" style="padding: 6px 10px;" onclick="event.stopPropagation(); showEditAddedServiceModal('${v.key}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn-action btn-delete" style="padding: 6px 10px;" onclick="event.stopPropagation(); deleteAddedService('${v.key}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                        <i class="fas fa-chevron-down chevron" style="margin-right: 10px;"></i>
                                    </div>
                                </div>
                                <div class="service-content ${isFirst ? 'open' : ''}">
                                    ${sessionsTableHtml}
                                    ${v.notes ? `<div style="padding: 15px; background: #fffcf0; border-top: 1px solid #fef3c7; font-size: 13px; color: #92400e;"><i class="fas fa-sticky-note"></i> <strong>ملاحظات:</strong> ${v.notes}</div>` : ''}
                                </div>
                            </div>
                        `;
                    });

                    list.innerHTML = cardsHtml;
                    totalVisitsEl.textContent = totalVisits;
                    totalIncomeEl.textContent = totalIncome.toLocaleString() + ' د.ع';
                    totalDebtEl.textContent = totalDebt.toLocaleString() + ' د.ع';
                    if (totalGrossEl) totalGrossEl.textContent = totalGross.toLocaleString() + ' د.ع';
                });
            });
        }

        function toggleServiceAccordion(header) {
            const content = header.nextElementSibling;
            const isActive = header.classList.contains('active');

            if (isActive) {
                header.classList.remove('active');
                content.classList.remove('open');
            } else {
                header.classList.add('active');
                content.classList.add('open');
            }
        }

        function saveServiceFromModal(pId, pName, pPhone) {
            const serviceSelect = document.getElementById('modal-service-select');
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];

            if (!selectedOption || !selectedOption.value) {
                return showToast("يرجى اختيار خدمة", "error");
            }

            const total = parseFloat(document.getElementById('modal-total-price').value);
            const sessions = parseInt(document.getElementById('modal-sessions').value);
            const paidNow = parseFloat(document.getElementById('modal-paid-now').value) || 0;
            const notes = document.getElementById('modal-service-notes')?.value || '';
            const serviceName = selectedOption.getAttribute('data-name');

            // تقسيم المبلغ بالتساوي على عدد الجلسات
            const sessionPrice = total / sessions;
            const sessionDetails = Array.from({ length: sessions }, () => ({
                executed: false,
                paid: false
            }));

            const addedServiceData = {
                pId, pName, pPhone,
                date: new Date().toLocaleDateString('ar-EG'),
                timestamp: Date.now(),
                services: [{ name: serviceName, price: total }],
                total,
                sessions,
                paidAmount: paidNow,
                isServiceEntry: true, // علامة لتمييزها كخدمة مضافة فقط وليس وصولات مقبوضة
                vId: "AS-" + Date.now().toString().slice(-8),
                paymentStatus: paidNow >= total ? 'مدفوع بالكامل' : (paidNow > 0 ? 'مسدد جزئياً' : 'غير مسدد'),
                sessionDetails: Array.from({ length: sessions }, () => ({ executed: false, paid: false, appointmentId: null })),
                notes
            };

            tRef('added_services').push(addedServiceData).then(() => {
                showToast("تم حفظ الخدمة للمراجع بنجاح", "success");
                closeServiceModal();
                loadPatients(); // لتحديث العدادات
            });
        }

        function closeServiceModal() {
            const modal = document.getElementById('add-service-modal');
            if (modal) modal.remove();
        }


        function showPatientSelection() {
            // Reset title and subtitle
            document.getElementById('history-title').textContent = 'سجل خدمات المراجع';
            document.getElementById('history-subtitle').textContent = 'يرجى اختيار مراجع من القائمة لعرض سجله';
            document.getElementById('history-back-btn').style.display = 'none';

            // Hide stats and table sections
            document.getElementById('history-stats-section').style.display = 'none';
            document.getElementById('history-table-section').style.display = 'none';

            // Show patient selection card
            document.getElementById('patient-selection-card').style.display = 'block';

            // Clear current history data
            if (currentHistoryPId) { // This was for the old 'visits' node, now it's 'added_services'
                tRef('added_services').orderByChild('pId').equalTo(currentHistoryPId).off();
            }
            currentHistoryPId = null;
            document.getElementById('history-list').innerHTML = '';
            document.getElementById('history-total-gross').textContent = '0 د.ع';
            document.getElementById('history-total-visits').textContent = '0';
            document.getElementById('history-total-debt').textContent = '0 د.ع';
            document.getElementById('history-total-income').textContent = '0 د.ع';
        }

        function updateSessionStatus(vKey, sIndex, field, value) {
            tRef('added_services/' + vKey).once('value', snap => {
                const v = snap.val();
                let sessionDetails = v.sessionDetails || Array.from({ length: v.sessions }, () => ({ executed: false, paid: false, appointmentId: null }));
                sessionDetails[sIndex][field] = value;
                tRef('added_services/' + vKey).update({ sessionDetails }).then(() => showToast("تم تحديث حالة الجلسة"));
            });
        }

        function finishSession(vKey, sIndex) {
            const execDate = new Date().toLocaleDateString('ar-EG');
            tRef('added_services/' + vKey).once('value', snap => {
                const v = snap.val();
                if (!v) return;
                let sessionDetails = v.sessionDetails || Array.from({ length: v.sessions }, () => ({ executed: false, paid: false, appointmentId: null }));
                sessionDetails[sIndex].executed = true;
                sessionDetails[sIndex].executionDate = execDate;

                tRef('added_services/' + vKey).update({ sessionDetails }).then(() => {
                    // تسجيل الزيارة المنفذة في عقدة 'visits' الجديدة
                    const sessionPrice = (parseFloat(v.total) || 0) / (parseInt(v.sessions) || 1);
                    tRef('visits').push({
                        visitId: "EXEC-" + Date.now().toString().slice(-8),
                        pId: v.pId,
                        pName: v.pName,
                        date: execDate,
                        timestamp: Date.now(),
                        serviceName: v.services.map(s => s.name).join(' + ') + ` (جلسة ${sIndex + 1})`,
                        amount: sessionPrice,
                        type: 'executed_session',
                        sourceAddedServiceId: vKey,
                        sessionIndex: sIndex
                    });
                    showToast("تم إنهاء الجلسة بنجاح", "success");
                });
            });
        }

        function postponeSession(vKey, sIndex, appId, pId, pName) {
            if (!confirm("هل أنت متأكد من تأجيل هذه الجلسة؟ سيتم إلغاء الموعد المحجوز إن وجد.")) return;

            tRef('added_services/' + vKey).once('value', snap => {
                const v = snap.val();
                if (!v) return;
                let sessionDetails = v.sessionDetails;
                sessionDetails[sIndex].postponed = true;
                sessionDetails[sIndex].executed = false;
                sessionDetails[sIndex].appointmentId = null;

                tRef('added_services/' + vKey).update({ sessionDetails }).then(() => {
                    if (appId && appId !== 'null' && appId !== '') {
                        tRef('appointments/' + appId).remove();
                    }
                    showToast("تم تأجيل الجلسة وإلغاء الموعد بنجاح", "success");
                });
            });
        }

        // --- حذف الخدمة المضافة بالكامل ---
        function deleteAddedService(vKey) {
            if (!confirm("هل أنت متأكد من حذف هذه الخدمة بالكامل؟ سيتم حذف جميع جلساتها ومواعيدها المرتبطة.")) return;

            tRef('added_services/' + vKey).once('value', snap => {
                const v = snap.val();
                if (!v) return;

                // جلب جميع المواعيد المرتبطة بالجلسات
                const sessionDetails = v.sessionDetails || [];
                const appIds = sessionDetails.map(s => s.appointmentId).filter(id => id);

                // حذف الخدمة
                tRef('added_services/' + vKey).remove().then(() => {
                    // حذف المواعيد
                    appIds.forEach(id => {
                        tRef('appointments/' + id).remove();
                    });
                    showToast("تم حذف الخدمة ومواعيدها بنجاح", "success");
                });
            });
        }

        // --- تعديل بيانات الخدمة المضافة ---
        function showEditAddedServiceModal(vKey) {
            tRef('added_services/' + vKey).once('value', snap => {
                const v = snap.val();
                if (!v) return;

                const modalHtml = `
                    <div id="edit-service-entry-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10006; backdrop-filter: blur(4px);">
                        <div style="background: white; padding: 25px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); width: 90%; max-width: 450px; text-align: right;">
                            <h3 style="margin: 0 0 20px 0; color: var(--primary);"><i class="fas fa-edit"></i> تعديل بيانات الخدمة المضافة</h3>
                            
                            <div class="form-group">
                                <label>اسم الخدمة</label>
                                <input type="text" id="edit-as-name" value="${v.services && v.services[0] ? v.services[0].name : 'خدمة غير معروفة'}" readonly style="background:#f1f5f9; cursor:not-allowed;">
                                <small style="color:var(--secondary); font-size:11px;">لا يمكن تغيير اسم الخدمة الأساسية.</small>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>عدد الجلسات</label>
                                    <input type="number" id="edit-as-sessions" value="${v.sessions || 1}" min="1">
                                </div>
                                <div class="form-group">
                                    <label>المبلغ الإجمالي (د.ع)</label>
                                    <input type="number" id="edit-as-total" value="${v.total}">
                                </div>
                            </div>

                            <div class="form-group">
                                <label>المبلغ المسدد (د.ع)</label>
                                <input type="number" id="edit-as-paid" value="${v.paidAmount}">
                            </div>

                            <div class="form-group">
                                <label>ملاحظات</label>
                                <textarea id="edit-as-notes" style="width:100%; height:80px; padding:10px; border:2px solid var(--border); border-radius:8px; font-family:'Cairo';">${v.notes || ''}</textarea>
                            </div>

                            <div style="margin-top: 25px; display: flex; gap: 10px;">
                                <button class="btn-primary" style="flex: 2;" id="confirm-edit-as-btn">حفظ التغييرات</button>
                                <button class="btn-logout" style="flex: 1; background: var(--bg); color: var(--text);" onclick="document.getElementById('edit-service-entry-modal').remove()">إلغاء</button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.insertAdjacentHTML('beforeend', modalHtml);

                document.getElementById('confirm-edit-as-btn').onclick = () => {
                    const total = parseFloat(document.getElementById('edit-as-total').value);
                    const paid = parseFloat(document.getElementById('edit-as-paid').value);
                    const sessions = parseInt(document.getElementById('edit-as-sessions').value);
                    const notes = document.getElementById('edit-as-notes').value;

                    if (isNaN(total) || total < 0 || isNaN(paid) || paid < 0 || isNaN(sessions) || sessions < 1) {
                        showToast("يرجى إدخال بيانات صحيحة", "error");
                        return;
                    }

                    let sessionDetails = v.sessionDetails || Array.from({ length: v.sessions || 1 }, () => ({ executed: false, paid: false, appointmentId: null }));
                    const oldCount = sessionDetails.length;

                    if (sessions > oldCount) {
                        // إضافة جلسات جديدة
                        for (let i = 0; i < sessions - oldCount; i++) {
                            sessionDetails.push({ executed: false, paid: false, appointmentId: null });
                        }
                    } else if (sessions < oldCount) {
                        // تنبيه المستخدم عند تقليل عدد الجلسات
                        const sessionsToRemove = sessionDetails.slice(sessions);
                        const hasExecuted = sessionsToRemove.some(s => s.executed);
                        const appIdsToRemove = sessionsToRemove.map(s => s.appointmentId).filter(id => id);

                        let confirmMsg = `سيتم حذف ${oldCount - sessions} جلسة/جلسات من نهاية القائمة.`;
                        if (hasExecuted) confirmMsg += "\nتحذير: بعض الجلسات التي سيتم حذفها معلمة كمنفذة!";
                        if (appIdsToRemove.length > 0) confirmMsg += `\nسيتم أيضاً حذف ${appIdsToRemove.length} موعد/مواعيد مرتبطة بها.`;
                        confirmMsg += "\nهل أنت متأكد من الاستمرار؟";

                        if (!confirm(confirmMsg)) return;

                        // حذف المواعيد المرتبطة بالجلسات المحذوفة
                        appIdsToRemove.forEach(id => tRef('appointments/' + id).remove());
                        sessionDetails = sessionDetails.slice(0, sessions);
                    }

                    const updateData = {
                        total: total,
                        paidAmount: paid,
                        sessions: sessions,
                        sessionDetails: sessionDetails,
                        notes: notes,
                        paymentStatus: paid >= total ? 'مدفوع بالكامل' : (paid > 0 ? 'مسدد جزئياً' : 'غير مسدد')
                    };

                    if (v.services && v.services[0]) {
                        const updatedServices = [...v.services];
                        updatedServices[0].price = total;
                        updateData.services = updatedServices;
                    }

                    tRef('added_services/' + vKey).update(updateData).then(() => {
                        showToast("تم تحديث بيانات الخدمة والجلسات بنجاح", "success");
                        document.getElementById('edit-service-entry-modal').remove();
                    });
                };
            });
        }

        function finishVisit(vKey) {
            const execDate = new Date().toLocaleDateString('ar-EG');
            tRef('added_services/' + vKey).once('value', snap => {
                const v = snap.val();
                if (!v) return;

                let sessionDetails = v.sessionDetails || Array.from({ length: v.sessions }, () => ({ executed: false, paid: false, appointmentId: null }));

                // إنهاء جميع الجلسات المتبقية
                let hasUnfinishedSessions = false;
                for (let i = 0; i < sessionDetails.length; i++) {
                    if (!sessionDetails[i].executed) {
                        sessionDetails[i].executed = true;
                        sessionDetails[i].executionDate = execDate;
                        // Add an entry to the new 'visits' node for each executed session
                        const sessionPrice = (parseFloat(v.total) || 0) / (parseInt(v.sessions) || 1);
                        tRef('visits').push({
                            visitId: "EXEC-" + Date.now().toString().slice(-8),
                            pId: v.pId,
                            pName: v.pName,
                            date: execDate,
                            timestamp: Date.now(),
                            serviceName: v.services.map(s => s.name).join(' + ') + ` (جلسة ${i + 1})`,
                            amount: sessionPrice,
                            type: 'executed_session',
                            sourceAddedServiceId: vKey,
                            sessionIndex: i
                        });
                        hasUnfinishedSessions = true;
                    }
                }

                if (hasUnfinishedSessions) {
                    tRef('added_services/' + vKey).update({ sessionDetails }).then(() => {
                        showToast("تم إنهاء جميع جلسات الزيارة بنجاح", "success");
                    }).catch(err => {
                        console.error('Error finishing visit:', err);
                        showToast("حدث خطأ أثناء إنهاء الزيارة", "error");
                    });
                } else {
                    showToast("جميع الجلسات منتهية بالفعل", "info");
                }
            });
        }

        // وظيفة تسجيل الدفع وطباعة الوصل
        function addPaymentToService(vKey, suggestedAmount) {
            const modalHtml = `
                <div id="payment-method-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10006; backdrop-filter: blur(4px);">
                    <div style="background: white; padding: 25px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); width: 90%; max-width: 400px; text-align: right;">
                        <h3 style="margin: 0 0 20px 0; color: var(--primary);"><i class="fas fa-money-bill-wave"></i> تسجيل دفعة جديدة</h3>
                        
                        <div class="form-group">
                            <label>المبلغ المراد دفعه (د.ع)</label>
                            <input type="number" id="pay-modal-amount" value="${Math.round(suggestedAmount)}" style="font-size: 18px; font-weight: 700; text-align: center;">
                        </div>

                        <div class="form-group">
                            <label>طريقة الدفع</label>
                            <select id="pay-modal-method" style="height: 50px;">
                                <option value="نقداً">💵 نقداً</option>
                                <option value="بطاقة ائتمان">💳 بطاقة ائتمان (Zain Cash / Master)</option>
                                <option value="حوالة">📲 حوالة مالية</option>
                            </select>
                        </div>

                        <div style="margin-top: 25px; display: flex; gap: 10px;">
                            <button class="btn-primary" style="flex: 2; background: var(--success);" id="confirm-pay-btn">تأكيد الدفع وطباعة الوصل</button>
                            <button class="btn-logout" style="flex: 1; background: var(--bg); color: var(--text);" onclick="document.getElementById('payment-method-modal').remove()">إلغاء</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('confirm-pay-btn').onclick = () => {
                const amount = parseFloat(document.getElementById('pay-modal-amount').value);
                const method = document.getElementById('pay-modal-method').value;

                if (isNaN(amount) || amount <= 0) {
                    showToast("يرجى إدخال مبلغ صحيح", "error");
                    return;
                }

                tRef('added_services/' + vKey).once('value', snap => {
                    const v = snap.val();
                    const newPaid = (parseFloat(v.paidAmount) || 0) + amount;
                    const serviceName = v.services.map(s => s.name).join(' + ');

                    tRef('added_services/' + vKey).update({
                        paidAmount: newPaid,
                        paymentStatus: newPaid >= v.total ? 'مدفوع بالكامل' : (newPaid > 0 ? 'مسدد جزئياً' : 'غير مسدد')
                    }).then(() => {
                        const paymentRecord = {
                            vId: v.vId || vKey,
                            pId: v.pId,
                            pName: v.pName,
                            amount: amount,
                            method: method,
                            serviceName: serviceName,
                            date: new Date().toLocaleDateString('ar-EG'),
                            timestamp: Date.now(),
                            type: 'دفع جلسة/خدمة'
                        };

                        tRef('payments_log').push(paymentRecord).then(() => {
                            showToast("تم تسجيل الدفعة بنجاح", "success");
                            document.getElementById('payment-method-modal').remove();
                            printPaymentReceipt(paymentRecord, v.total, newPaid);
                        });
                    });
                });
            };
        }

        // دالة طباعة وصل الدفع
        function printPaymentReceipt(pay, totalCost, totalPaid) {
            const clinicName = officialClinicName || "ClinicZone247";
            const remaining = totalCost - totalPaid;
            const printWindow = window.open('', '_blank');
            const html = `
                <div dir="rtl" style="font-family: 'Cairo', sans-serif; width: 70mm; margin: auto; color: #000;">
                    <div style="text-align:center;">
                        <h2 style="margin:0; font-size:18px;">${clinicName}</h2>
                        <div style="font-size:12px; margin-bottom:5px;">إيصال قبض مالي</div>
                    </div>
                    <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                    <div style="font-size:12px;">
                        <p style="margin:3px 0;"><strong>التاريخ:</strong> ${pay.date}</p>
                        <p style="margin:3px 0;"><strong>المراجع:</strong> ${pay.pName}</p>
                        <p style="margin:3px 0;"><strong>الخدمة:</strong> ${pay.serviceName}</p>
                        <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                        <div style="text-align:center; font-weight:800; font-size:16px;">
                            المدفوع: ${pay.amount.toLocaleString()} د.ع
                        </div>
                        <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                        <p style="margin:2px 0;">المبلغ الإجمالي: ${totalCost.toLocaleString()} د.ع</p>
                        <p style="margin:2px 0;">إجمالي المسدد: ${totalPaid.toLocaleString()} د.ع</p>
                        <p style="margin:2px 0;">المتبقي: ${remaining.toLocaleString()} د.ع</p>
                    </div>
                    <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                    <p style="text-align:center; font-size:10px;">شكراً لزيارتكم - Clinics Zone 247</p>
                </div>
            `;
            printWindow.document.write('<html><head><title>طباعة وصل</title>');
            printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">');
            printWindow.document.write('</head><body>');
            printWindow.document.write(html);
