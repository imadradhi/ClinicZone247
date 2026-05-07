
    const db = firebase.database();

    // --- دالة توليد رقم وصل عشوائي (حرفين + 3 أرقام) ---
    function generateReceiptID() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let res = '';
    for (let i = 0; i < 2; i++) res +=letters.charAt(Math.floor(Math.random() * letters.length)); for (let i=0; i < 3;
        i++) res +=numbers.charAt(Math.floor(Math.random() * numbers.length)); return res; } const auth=firebase.auth();
        // نظام تعدد المستأجرين (Multi-tenancy) 
let tenantPath="" ; let officialClinicName="ClinicZone247" ; // Default
        clinic name // دالة تجلب المرجع الخاص بالمستأجر الحالي فقط 
function tRef(path) { return db.ref(tenantPath +
        path); } // تحويل أي وقت 24 ساعة (مثلاً 14:30) إلى 12 ساعة (02:30 PM) لضمان عرض المواعيد القديمة بشكل صحيح
        function formatTimeTo12h(timeStr) { if (!timeStr || typeof timeStr !=='string' ) return '--:--' ; if
        (timeStr.includes('م') || timeStr.includes('ص')) return timeStr; if (timeStr.toLowerCase().includes('am'))
        return timeStr.replace(/am/i, 'ص' ); if (timeStr.toLowerCase().includes('pm')) return timeStr.replace(/pm/i, 'م'
        ); const parts=timeStr.split(':'); if (parts.length !==2) return timeStr; let h=parseInt(parts[0], 10); const
        m=parts[1]; if (isNaN(h)) return timeStr; const period=h>= 12 ? 'م' : 'ص';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${period}`;
        }

        let selectedAppSlots = [];
        let currentAppView = 'daily';
        let lastFetchedTimeCounts = {};

        // --- وظيفة التبديل بين تبويبات الإعدادات ---
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
        document.getElementById('settings-panel-' + tabId).classList.add('active');
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
        if (id === 'reports') { handleReportPeriodChange(); populateReportServiceFilter(); setTimeout(loadReports, 100);
        }
        if (id === 'expenses') { loadExpenses(); }
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
        const regDate = new Date().toISOString().split('T')[0];
        tRef('counters/lastPatientId').transaction((currentValue) => {
        return (currentValue || 1000) + 1;
        }, (error, committed, snapshot) => {
        if (committed) {
        const nextId = snapshot.val();
        const pId = "P-" + nextId;
        tRef('patients/' + pId).set({ name, phone, gender, address, age, regDate, pId, createdAt: Date.now() }).then(()
        => {
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
        <div
            style="text-align: right; padding: 40px; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); max-width: 800px; width: 90%; margin: 20px auto; position: relative; overflow: hidden; animation: staggerFadeIn 0.3s ease;">
            <!-- Decoration -->
            <div
                style="position: absolute; top: 0; left: 0; width: 100%; height: 5px; background: linear-gradient(90deg, var(--warning), var(--primary));">
            </div>

            <h3
                style="margin: 0 0 30px 0; color: var(--primary); font-size: 24px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-user-edit"></i> تعديل بيانات المراجع
            </h3>

            <div style="display: flex; flex-direction: column; gap: 15px;">
                <!-- Basic Info Section -->
                <div style="border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 5px;">
                    <h4 style="margin: 0; color: var(--primary); font-size: 16px;"><i class="fas fa-id-card"></i>
                        المعلومات الأساسية</h4>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>الاسم الثلاثي للمراجع <span style="color: var(--danger);">*</span></label>
                        <div style="position: relative;">
                            <i class="fas fa-user"
                                style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                            <input type="text" id="modal-p-name" value="${p.name}" placeholder="الاسم الثلاثي"
                                style="padding-right: 45px; height: 50px;">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>رقم الهاتف</label>
                        <div style="position: relative;">
                            <i class="fas fa-phone"
                                style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                            <input type="text" id="modal-p-phone" value="${p.phone || ''}" placeholder="07xxxxxxxxx"
                                style="padding-right: 45px; height: 50px; direction: ltr; text-align: right;">
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>عمر المراجع</label>
                        <div style="position: relative;">
                            <i class="fas fa-calendar-alt"
                                style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                            <input type="number" id="modal-p-age" value="${p.age || ''}" placeholder="العمر" min="0"
                                max="150" style="padding-right: 45px; height: 50px;">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>الجنس</label>
                        <div style="position: relative;">
                            <i class="fas fa-venus-mars"
                                style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                            <select id="modal-p-gender" style="padding-right: 45px; height: 50px;">
                                <option value="امرأة" ${p.gender==='امرأة' ? 'selected' : '' }>امرأة</option>
                                <option value="رجل" ${p.gender==='رجل' ? 'selected' : '' }>رجل</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Contact Info Section -->
                <div style="border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-top: 10px;">
                    <h4 style="margin: 0; color: var(--primary); font-size: 16px;"><i class="fas fa-map-marked-alt"></i>
                        تفاصيل السكن</h4>
                </div>

                <div class="form-row">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>العنوان الكامل</label>
                        <div style="position: relative;">
                            <i class="fas fa-location-dot"
                                style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--secondary);"></i>
                            <input type="text" id="modal-p-address" value="${p.address || ''}"
                                placeholder="المحافظة - القضاء - المنطقة - أقرب نقطة دالة"
                                style="padding-right: 45px; height: 50px;">
                        </div>
                    </div>
                </div>
            </div>

            <div
                style="margin-top: 35px; display: flex; gap: 15px; justify-content: space-between; align-items: center;">
                <button class="btn btn-md"
                    style="background: rgba(225, 29, 72, 0.1); color: var(--danger); border: 1px solid rgba(225, 29, 72, 0.2); cursor: pointer; transition: all 0.3s ease;"
                    id="modal-delete-btn" onmouseover="this.style.background='var(--danger)'; this.style.color='white'"
                    onmouseout="this.style.background='rgba(225, 29, 72, 0.1)'; this.style.color='var(--danger)'">
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
        <div
            style="text-align: right; padding: 25px; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); border: 2px solid var(--primary); max-width: 500px; margin: 20px auto;">
            <h3
                style="margin: 0 0 20px 0; color: var(--primary); font-size: 20px; border-bottom: 2px solid var(--primary); padding-bottom: 10px;">
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

        const regDate = new Date().toISOString().split('T')[0];
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
            <td><span class="badge-info" style="background: var(--bg); color: var(--text-secondary);">${index++}</span>
            </td>
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
                <button class="btn-action btn-history" style="border-radius: 30px; padding: 7px 18px;"
                    onclick="viewPatientHistory('${p.pId}', '${p.name}')">
                    <i class="fas fa-notes-medical"></i>عرض سجل المراجع
                </button>
            </td>
        </tr>`;
        vOptions += `<option value="${p.pId}" data-phone="${p.phone || ''}">${p.name} (${p.pId})</option>`;
        aOptions += `<option value="${p.pId}" data-name="${p.name}" data-phone="${p.phone}">${p.name} (${p.pId})
        </option>`;
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
        .replace(/[u064B-u0652]/g, "") // حذف التشكيل (الفتحة، الضمة، الخ)
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
        val = (input1 && document.activeElement === input1 ? input1.value : (input2 && document.activeElement === input2
        ? input2.value : ""));
        if (!val) val = (input1 && input1.value) || (input2 && input2.value) || "";
        }

        const term = normalizeArabic(val);

        // مزامنة نص البحث بين حقول البحث المختلفة في الصفحة
        if (input1 && input1 !== event?.target && input1.value !== val) input1.value = val;
        if (input2 && input2 !== event?.target && input2.value !== val) input2.value = val;

        const rows = document.querySelectorAll('.patients-list-tbody tr');
        const rows = document.querySelectorAll('#expenses-list tr');
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

        if (term.length < 2) { resultsDiv.style.display='none' ; return; } tRef('patients').once('value', snap=> {
            let html = "";
            snap.forEach(child => {
            const p = child.val();
            const searchContent = normalizeArabic(`${p.name} ${p.phone} ${p.pId}`);
            if (searchContent.includes(term)) {
            html += `
            <div onclick="selectPatientForHistory('${p.pId}', '${p.name}', '${p.phone}')"
                style="padding: 12px; border-bottom: 1px solid var(--border); cursor: pointer; transition: 0.2s;"
                onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='white'">
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

            // --- نظام إضافة الخدمة المطور من قائمة المراجعين (نسخة الصفحة) ---
            let lastSectionBeforeAddService = 'patients';
            function backFromAddService() {
            showSection(lastSectionBeforeAddService);
            }

            function openAddServiceModal(pId) {
            try {
            if (!pId) {
            showToast("خطأ: معرّف المراجع غير صحيح", "error");
            return;
            }

            // حفظ القسم الحالي للعودة إليه لاحقاً
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection) lastSectionBeforeAddService = activeSection.id;

            tRef('patients/' + pId).once('value', pSnap => {
            const p = pSnap.val();
            if (!p) {
            showToast("خطأ: لم يتم العثور على بيانات المراجع", "error");
            return;
            }

            tRef('services').once('value', sSnap => {
            let servicesOptions = '<option value="">اختر خدمة...</option>';
            let serviceCount = 0;
            sSnap.forEach(child => {
            const s = child.val();
            if (s && s.name && s.price !== undefined) {
            servicesOptions += `<option value="${child.key}" data-name="${s.name}" data-price="${parseFloat(s.price)}"
                data-sessions="${parseInt(s.sessions) || 1}">${s.name} - ${parseFloat(s.price).toLocaleString()} د.ع
            </option>`;
            serviceCount++;
            }
            });

            if (serviceCount === 0) {
            showToast("لا توجد خدمات متاحة. يرجى إضافة خدمات من الإعدادات أولاً.", "warning");
            return;
            }

            // ملء بيانات الصفحة
            document.getElementById('as-page-patient-name').textContent = p.name;
            const select = document.getElementById('as-page-service-select');
            select.innerHTML = servicesOptions;

            // إعادة تعيين الحقول
            document.getElementById('as-page-total-price').value = 0;
            document.getElementById('as-page-sessions').value = 1;
            document.getElementById('as-page-paid-now').value = 0;
            document.getElementById('as-page-notes').value = '';
            document.getElementById('as-page-session-price-display').textContent = '0 د.ع';

            // ربط زر الحفظ
            document.getElementById('as-page-save-btn').onclick = () => saveServiceFromPage(pId, p.name, p.phone);

            showSection('add-service-page');
            updateAsPageBilling(false);
            });
            });
            } catch (error) {
            console.error('Error in openAddServicePage:', error);
            showToast("حدث خطأ: " + error.message, "error");
            }
            }

            function updateAsPageBilling(manualEdit = false) {
            const totalPriceInput = document.getElementById('as-page-total-price');
            const discountInput = document.getElementById('as-page-discount');
            const sessionsInput = document.getElementById('as-page-sessions');
            const sessionPriceDisplay = document.getElementById('as-page-session-price-display');
            const netTotalDisplay = document.getElementById('as-page-net-total-display');
            const serviceSelect = document.getElementById('as-page-service-select');

            if (!manualEdit && serviceSelect) {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            if (selectedOption && selectedOption.value) {
            const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
            const sessions = parseInt(selectedOption.getAttribute('data-sessions')) || 1;
            totalPriceInput.value = price;
            sessionsInput.value = sessions;
            discountInput.value = 0; // Reset discount on service change
            }
            }

            const grossTotal = parseFloat(totalPriceInput.value) || 0;
            const discount = parseFloat(discountInput.value) || 0;
            const netTotal = grossTotal - discount;
            const finalSessions = parseInt(sessionsInput.value) || 1;

            const pricePerSession = netTotal / finalSessions;
            sessionPriceDisplay.textContent = Math.round(pricePerSession).toLocaleString() + " د.ع";
            netTotalDisplay.textContent = Math.round(netTotal).toLocaleString() + " د.ع";
            }

            function saveServiceFromPage(pId, pName, pPhone) {
            const serviceSelect = document.getElementById('as-page-service-select');
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];

            if (!selectedOption || !selectedOption.value) {
            return showToast("يرجى اختيار خدمة", "error");
            }

            const gross = parseFloat(document.getElementById('as-page-total-price').value) || 0;
            const discount = parseFloat(document.getElementById('as-page-discount').value) || 0;
            const total = gross - discount;
            const sessions = parseInt(document.getElementById('as-page-sessions').value);
            const paidNow = parseFloat(document.getElementById('as-page-paid-now').value) || 0;
            const notes = document.getElementById('as-page-notes').value || '';
            const serviceName = selectedOption.getAttribute('data-name');

            if (isNaN(total) || total < 0 || isNaN(sessions) || sessions < 1) { return showToast("يرجى إدخال مبالغ وجلسات صحيحة", "error" ); } const addedServiceData={ pId, pName, pPhone, date: new
                Date().toISOString().split('T')[0], timestamp: Date.now(), services: [{ name: serviceName, price: gross,
                discount: discount }], total, grossTotal: gross, discount: discount, sessions, paidAmount: paidNow,
                isServiceEntry: true, vId: generateReceiptID(), paymentStatus: paidNow>= total ? 'مدفوع بالكامل' :
                (paidNow > 0 ? 'مسدد جزئياً' : 'غير مسدد'),
                sessionDetails: Array.from({ length: sessions }, () => ({ executed: false, paid: false, appointmentId:
                null })),
                notes
                };

                tRef('added_services').push(addedServiceData).then((snap) => {
                const newKey = snap.key;
                // إذا كان هناك مبلغ مدفوع مقدماً، نسجله في قائمة الفواتير
                if (paidNow > 0) {
                tRef('payments_log').push({
                vId: newKey, // ربط الوصل بالمفتاح البرمجي للخدمة
                visitId: addedServiceData.vId, // رقم الوصل المقروء للطباعة
                pId, pName, phone: pPhone,
                amount: paidNow,
                method: 'نقداً',
                serviceName: serviceName + " (دفعة أولى)",
                date: addedServiceData.date,
                timestamp: Date.now(),
                type: 'دفعة أولى لخدمة'
                });
                }
                showToast("تم حفظ الخدمة للمراجع بنجاح", "success");
                backFromAddService();
                loadPatients();
                }).catch(err => {
                console.error("Error saving service:", err);
                showToast("حدث خطأ أثناء الحفظ", "error");
                });
                }


                // --- عرض سجل خدمات مراجع محدد (بنظام البطاقات القابلة للطي) ---
                function viewPatientHistory(pId, pName) {
                currentHistoryPId = pId;
                document.getElementById('history-title').textContent = pName;
                document.getElementById('history-subtitle').innerHTML = `<i class="fas fa-id-card"
                    style="color:var(--primary);"></i> رقم الملف: <span
                    style="color: var(--text); font-weight: 800;">${pId}</span>`;
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
                const totalRefundsEl = document.getElementById('history-total-refunds');

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

                tRef('payments_log').orderByChild('pId').equalTo(pId).once('value', paySnap => {
                const allPayments = [];
                paySnap.forEach(pChild => {
                allPayments.push({ ...pChild.val(), key: pChild.key });
                });

                let totalVisits = 0, totalIncome = 0, totalDebt = 0, totalGross = 0, totalRefunds = 0;
                let cardsHtml = "";

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
                const sessionDetails = v.sessionDetails || Array.from({ length: sessionCount }, () => ({ executed:
                false, paid: false, appointmentId: null }));

                const isFullyPaid = paid >= total && total > 0;
                const executedCount = sessionDetails.filter(s => s.executed).length;
                const progressPercent = (executedCount / sessionCount) * 100;

                totalVisits += sessionCount;
                totalIncome += paid;
                totalDebt += (total - paid);
                totalGross += total;

                let sessionsListHtml = `<div class="session-grid">`;

                    let remainingBalance = paid;
                    for (let i = 0; i < sessionCount; i++) { const session=sessionDetails[i]; const
                        paidInThisSession=Math.min(sessionPrice, remainingBalance); const
                        remainingInThisSession=sessionPrice - paidInThisSession; remainingBalance -=paidInThisSession;
                        let bookingStatusHtml='' ; let bookingActionHtml='' ; if (session.appointmentId &&
                        appointmentsMap[session.appointmentId]) { const app=appointmentsMap[session.appointmentId];
                        bookingStatusHtml=`<span class="badge-pill badge-pill-info" style="font-size:11px;"><i
                            class="fas fa-calendar-check"></i> ${app.date} | ${app.time}</span>`;
                        bookingActionHtml = `<button class="btn-session-action btn-session-finish"
                            style="font-size:10px; padding:4px 8px;"
                            onclick="openLargeCalendarForSession('${pId}', '${pName}', '${v.key}', '${v.bookingGroupId}', ${i}, '${app.key}', '${app.date}', '${app.time}')"><i
                                class="fas fa-edit"></i> تعديل</button>`;
                        } else {
                        bookingStatusHtml = `<span class="badge-pill badge-pill-warning" style="font-size:11px;"><i
                                class="fas fa-calendar-times"></i> غير محجوز</span>`;
                        bookingActionHtml = `<button class="btn-session-action btn-session-book"
                            style="font-size:10px; padding:4px 8px;"
                            onclick="openLargeCalendarForSession('${pId}', '${pName}', '${v.key}', '${v.bookingGroupId}', ${i}, null, null, null)"><i
                                class="fas fa-calendar-plus"></i> حجز موعد</button>`;
                        }

                        let execStatusHtml = '';
                        if (session.executed) {
                        execStatusHtml = `<span class="badge-pill badge-pill-success"><i
                                class="fas fa-check-circle"></i> تم التنفيذ (${session.executionDate || ''})</span>`;
                        } else if (session.postponed) {
                        execStatusHtml = `<span class="badge-pill badge-pill-muted"><i class="fas fa-clock"></i>
                            مؤجلة</span>`;
                        } else {
                        execStatusHtml = `<span class="badge-pill badge-pill-info"
                            style="background:#f1f5f9; color:#64748b;"><i class="fas fa-hourglass-start"></i> بانتظار
                            التنفيذ</span>`;
                        }

                        const payAction = paidInThisSession < sessionPrice ? `<button
                            class="btn-session-action btn-session-pay" style="padding:6px 12px; font-size:11px;"
                            onclick="addPaymentToService('${v.key}', ${remainingInThisSession})"><i
                                class="fas fa-cash-register"></i> تسديد
                            ${remainingInThisSession.toLocaleString()}</button>` : `<span
                                class="badge-pill badge-pill-success" style="font-size:11px;"><i
                                    class="fas fa-check-double"></i> مدفوعة بالكامل</span>`;
                            const finishAction = !session.executed ? `<button
                                class="btn-session-action btn-session-finish" style="padding:6px 12px; font-size:11px;"
                                onclick="finishSession('${v.key}', ${i})"><i class="fas fa-check"></i> إنهاء
                                الجلسة</button>` : '';
                            const postponeAction = !session.executed ? `<button
                                class="btn-session-action btn-session-postpone"
                                style="padding:6px 12px; font-size:11px; background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;"
                                onclick="postponeSession('${v.key}', ${i}, '${session.appointmentId || ''}', '${pId}', '${pName}')"><i
                                    class="fas fa-undo"></i> تأجيل</button>` : '';

                            sessionsListHtml += `
                            <div class="session-card ${session.executed ? 'executed' : ''}">
                                <div class="session-card-header">
                                    <span class="session-num"><i class="fas fa-hashtag"></i> الجلسة ${i + 1}</span>
                                    <span class="session-price-tag">${Math.round(sessionPrice).toLocaleString()}
                                        د.ع</span>
                                </div>
                                <div class="session-details">
                                    <div class="detail-row">
                                        <span class="detail-label">الموعد:</span>
                                        <span>${bookingStatusHtml}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">حالة التنفيذ:</span>
                                        <span>${execStatusHtml}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span class="detail-label">حالة الدفع:</span>
                                        <span>${payAction}</span>
                                    </div>
                                </div>
                                <div class="session-actions">
                                    ${finishAction}
                                    ${bookingActionHtml}
                                    ${postponeAction}
                                </div>
                            </div>
                            `;
                            }
                            sessionsListHtml += `</div>`;

                // تصفية المدفوعات المرتبطة بهذه الخدمة فقط
                const servicePayments = allPayments.filter(p => p.vId === v.vId || p.vId === v.key);
                let paymentsTableHtml = '';
                if (servicePayments.length > 0) {
                paymentsTableHtml = `
                <div
                    style="margin-top: 15px; padding: 20px 25px; border-top: 1px solid var(--border); background: #fcfcfc;">
                    <h5
                        style="margin: 0 0 15px 0; font-size: 14px; color: var(--primary); display: flex; align-items: center; gap: 10px; font-weight: 800;">
                        <i class="fas fa-receipt"></i> سجل الوصولات والمدفوعات لهذه الخدمة
                    </h5>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        `;
                        servicePayments.forEach(p => {
                        const isRefunded = p.refunded === true;
                        paymentsTableHtml += `
                        <div
                            style="display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; background: white; border: 1px solid #f1f5f9; border-radius: 10px; ${isRefunded ? 'opacity: 0.7; background: #fff1f2;' : ''}">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div
                                    style="width: 35px; height: 35px; background: ${isRefunded ? 'rgba(225, 29, 72, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: ${isRefunded ? 'var(--danger)' : 'var(--success)'};">
                                    <i class="fas ${isRefunded ? 'fa-undo' : 'fa-check'}"></i>
                                </div>
                                <div>
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text);">${(isRefunded ?
                                        (p.oldAmount || 0) : (p.amount || 0)).toLocaleString()} د.ع</div>
                                    <div style="font-size: 10px; color: var(--text-secondary);">${p.date} | ${p.method
                                        || 'نقداً'}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                ${!isRefunded ? `
                                <button class="btn-action"
                                    style="padding: 4px 8px; font-size: 10px; background: white; border: 1px solid #e2e8f0;"
                                    onclick="event.stopPropagation(); printReceipt('${p.key}')" title="طباعة الوصل">
                                    <i class="fas fa-print"></i>
                                </button>
                                <button class="btn-action btn-delete"
                                    style="padding: 4px 8px; font-size: 10px; background: #fff1f2; color: var(--danger); border: 1px solid #fecdd3;"
                                    onclick="event.stopPropagation(); refundPayment('${p.key}')" title="استرجاع المبلغ">
                                    <i class="fas fa-undo"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        `;
                        });
                        paymentsTableHtml += `
                    </div>
                </div>`;
                }

                const isFirst = (index === 0);
                cardsHtml += `
                <div class="service-history-card ${isFirst ? 'active' : ''}"
                    style="border-right: 5px solid ${isFullyPaid ? 'var(--success)' : 'var(--danger)'};">
                    <div class="service-header ${isFirst ? 'active' : ''}" onclick="toggleServiceAccordion(this)"
                        style="background: transparent;">
                        <div class="service-title" style="flex: 1.5;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div
                                    style="width: 45px; height: 45px; background: var(--primary-light); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 20px;">
                                    <i class="fas fa-box-open"></i>
                                </div>
                                <div>
                                    <div style="font-size: 16px; font-weight: 800; color: var(--text);">${srvNames}
                                    </div>
                                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                                        <i class="far fa-calendar-alt"></i> ${v.date} | <i class="fas fa-hashtag"></i>
                                        ${v.vId}
                                    </div>
                                    <div class="progress-track" style="width: 150px;">
                                        <div class="progress-fill" style="width: ${progressPercent}%;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="service-summary-stats"
                            style="flex: 2; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
                            <div class="stat-box" style="text-align: center; min-width: 80px;">
                                <div class="stat-label">المبلغ الكلي</div>
                                <div class="stat-value" style="font-size: 13px;">${(parseFloat(v.grossTotal) ||
                                    total).toLocaleString()}</div>
                            </div>
                            ${parseFloat(v.discount) > 0 ? `
                            <div class="stat-box"
                                style="text-align: center; min-width: 60px; background: rgba(225, 29, 72, 0.05); border: 1px solid rgba(225, 29, 72, 0.1);">
                                <div class="stat-label" style="color: var(--danger);">الخصم</div>
                                <div class="stat-value" style="color: var(--danger); font-size: 13px;">
                                    -${parseFloat(v.discount).toLocaleString()}</div>
                            </div>
                            ` : ''}
                            <div class="stat-box"
                                style="text-align: center; min-width: 80px; background: rgba(13, 92, 99, 0.05);">
                                <div class="stat-label">الصافي</div>
                                <div class="stat-value"
                                    style="color: var(--primary); font-size: 14px; font-weight: 900;">
                                    ${total.toLocaleString()}</div>
                            </div>
                            <div class="stat-box" style="text-align: center; min-width: 80px;">
                                <div class="stat-label">المسدد</div>
                                <div class="stat-value" style="color: var(--success); font-size: 13px;">
                                    ${paid.toLocaleString()}</div>
                            </div>
                            <div class="stat-box" style="text-align: center; min-width: 60px;">
                                <div class="stat-label">الجلسات</div>
                                <div class="stat-value" style="color: #64748b; font-size: 13px;">
                                    ${executedCount}/${sessionCount}</div>
                            </div>

                            <div
                                style="display: flex; gap: 8px; margin-right: 20px; border-right: 1px solid var(--border); padding-right: 20px;">
                                <button class="btn-action btn-edit"
                                    style="width: 35px; height: 35px; justify-content: center; border-radius: 10px;"
                                    onclick="event.stopPropagation(); showEditAddedServiceModal('${v.key}')"
                                    title="تعديل">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-action btn-delete"
                                    style="width: 35px; height: 35px; justify-content: center; border-radius: 10px;"
                                    onclick="event.stopPropagation(); deleteAddedService('${v.key}')" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            <i class="fas fa-chevron-down chevron" style="margin-right: 15px;"></i>
                        </div>
                    </div>
                    <div class="service-content ${isFirst ? 'open' : ''}" style="background: #ffffff;">
                        ${sessionsListHtml}
                        ${v.notes ? `<div
                            style="padding: 15px 25px; background: rgba(254, 243, 199, 0.3); border-top: 1px solid rgba(254, 243, 199, 0.5); font-size: 13px; color: #92400e; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-sticky-note" style="font-size: 16px; opacity: 0.7;"></i>
                            <strong>ملاحظات:</strong> ${v.notes}
                        </div>` : ''}
                        ${paymentsTableHtml}
                    </div>
                </div>
                `;
                });

                list.innerHTML = cardsHtml;

                // Calculate refunds from the payments list
                allPayments.forEach(p => {
                if (p.refunded) totalRefunds += (parseFloat(p.oldAmount) || 0);
                });

                if (totalVisitsEl) totalVisitsEl.textContent = totalVisits;
                if (totalIncomeEl) totalIncomeEl.textContent = totalIncome.toLocaleString() + ' د.ع';
                if (totalDebtEl) totalDebtEl.textContent = totalDebt.toLocaleString() + ' د.ع';
                if (totalGrossEl) totalGrossEl.textContent = totalGross.toLocaleString() + ' د.ع';
                if (totalRefundsEl) totalRefundsEl.textContent = totalRefunds.toLocaleString() + ' د.ع';
                });
                });
                });
                }

                function toggleServiceAccordion(header) {
                const card = header.parentElement;
                const content = header.nextElementSibling;
                const isActive = header.classList.contains('active');

                if (isActive) {
                header.classList.remove('active');
                card.classList.remove('active');
                content.classList.remove('open');
                } else {
                header.classList.add('active');
                card.classList.add('active');
                content.classList.add('open');
                }
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
                let sessionDetails = v.sessionDetails || Array.from({ length: v.sessions }, () => ({ executed: false,
                paid: false, appointmentId: null }));
                sessionDetails[sIndex][field] = value;
                tRef('added_services/' + vKey).update({ sessionDetails }).then(() => showToast("تم تحديث حالة الجلسة"));
                });
                }

                function finishSession(vKey, sIndex) {
                const execDate = new Date().toISOString().split('T')[0];
                tRef('added_services/' + vKey).once('value', snap => {
                const v = snap.val();
                if (!v) return;
                let sessionDetails = v.sessionDetails || Array.from({ length: v.sessions }, () => ({ executed: false,
                paid: false, appointmentId: null }));
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
                if (!confirm("هل أنت متأكد من تأجيل هذه الجلسة؟ سيتم تغيير حالة الموعد المحجوز إن وجد إلى 'مؤجل'."))
                return;

                tRef('added_services/' + vKey).once('value', snap => {
                const v = snap.val();
                if (!v) return;
                let sessionDetails = v.sessionDetails;
                sessionDetails[sIndex].postponed = true;
                sessionDetails[sIndex].executed = false;
                sessionDetails[sIndex].appointmentId = null;

                tRef('added_services/' + vKey).update({ sessionDetails }).then(() => {
                if (appId && appId !== 'null' && appId !== '') {
                tRef('appointments/' + appId).update({
                status: 'مؤجل',
                postponedAt: Date.now()
                });
                }
                showToast("تم تأجيل الجلسة وتحديث الموعد بنجاح", "success");
                });
                });
                }

                // --- حذف الخدمة المضافة بالكامل ---
                function deleteAddedService(vKey) {
                if (!confirm("هل أنت متأكد من حذف هذه الخدمة بالكامل؟ سيتم حذف جميع جلساتها ومواعيدها المرتبطة."))
                return;

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
                <div id="edit-service-entry-modal"
                    style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10006; backdrop-filter: blur(4px);">
                    <div
                        style="background: white; padding: 25px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); width: 90%; max-width: 450px; text-align: right;">
                        <h3 style="margin: 0 0 20px 0; color: var(--primary);"><i class="fas fa-edit"></i> تعديل بيانات
                            الخدمة المضافة</h3>

                        <div class="form-group">
                            <label>اسم الخدمة</label>
                            <input type="text" id="edit-as-name"
                                value="${v.services && v.services[0] ? v.services[0].name : 'خدمة غير معروفة'}" readonly
                                style="background:#f1f5f9; cursor:not-allowed;">
                            <small style="color:var(--secondary); font-size:11px;">لا يمكن تغيير اسم الخدمة
                                الأساسية.</small>
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
                            <textarea id="edit-as-notes"
                                style="width:100%; height:80px; padding:10px; border:2px solid var(--border); border-radius:8px; font-family:'Cairo';">${v.notes || ''}</textarea>
                        </div>

                        <div style="margin-top: 25px; display: flex; gap: 10px;">
                            <button class="btn-primary" style="flex: 2;" id="confirm-edit-as-btn">حفظ التغييرات</button>
                            <button class="btn-logout"
                                style="flex: 1; background: linear-gradient(to right, #64748b, #94a3b8); color: white; border: none;"
                                onclick="document.getElementById('edit-service-entry-modal').remove()">إلغاء</button>
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
                    showToast("يرجى إدخال بيانات صحيحة", "error" ); return; } let sessionDetails=v.sessionDetails ||
                    Array.from({ length: v.sessions || 1 }, ()=> ({ executed: false, paid: false, appointmentId: null
                    }));
                    const oldCount = sessionDetails.length;

                    if (sessions > oldCount) {
                    // إضافة جلسات جديدة
                    for (let i = 0; i < sessions - oldCount; i++) { sessionDetails.push({ executed: false, paid: false,
                        appointmentId: null }); } } else if (sessions < oldCount) { // تنبيه المستخدم عند تقليل عدد
                        الجلسات const sessionsToRemove=sessionDetails.slice(sessions); const
                        hasExecuted=sessionsToRemove.some(s=> s.executed);
                        const appIdsToRemove = sessionsToRemove.map(s => s.appointmentId).filter(id => id);

                        let confirmMsg = `سيتم حذف ${oldCount - sessions} جلسة/جلسات من نهاية القائمة.`;
                        if (hasExecuted) confirmMsg += "nتحذير: بعض الجلسات التي سيتم حذفها معلمة كمنفذة!";
                        if (appIdsToRemove.length > 0) confirmMsg += `nسيتم أيضاً حذف ${appIdsToRemove.length}
                        موعد/مواعيد مرتبطة بها.`;
                        confirmMsg += "nهل أنت متأكد من الاستمرار؟";

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
                        const execDate = new Date().toISOString().split('T')[0];
                        tRef('added_services/' + vKey).once('value', snap => {
                        const v = snap.val();
                        if (!v) return;

                        let sessionDetails = v.sessionDetails || Array.from({ length: v.sessions }, () => ({ executed:
                        false, paid: false, appointmentId: null }));

                        // إنهاء جميع الجلسات المتبقية
                        let hasUnfinishedSessions = false;
                        for (let i = 0; i < sessionDetails.length; i++) { if (!sessionDetails[i].executed) {
                            sessionDetails[i].executed=true; sessionDetails[i].executionDate=execDate; // Add an entry
                            to the new 'visits' node for each executed session const sessionPrice=(parseFloat(v.total)
                            || 0) / (parseInt(v.sessions) || 1); tRef('visits').push({ visitId: "EXEC-" +
                            Date.now().toString().slice(-8), pId: v.pId, pName: v.pName, date: execDate, timestamp:
                            Date.now(), serviceName: v.services.map(s=> s.name).join(' + ') + ` (جلسة ${i + 1})`,
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
                            <div id="payment-method-modal"
                                style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10006; backdrop-filter: blur(4px);">
                                <div
                                    style="background: white; padding: 25px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); width: 90%; max-width: 400px; text-align: right;">
                                    <h3 style="margin: 0 0 20px 0; color: var(--primary);"><i
                                            class="fas fa-money-bill-wave"></i> تسجيل دفعة جديدة</h3>

                                    <div class="form-group">
                                        <label>المبلغ المراد دفعه (د.ع)</label>
                                        <input type="number" id="pay-modal-amount"
                                            value="${Math.round(suggestedAmount)}"
                                            style="font-size: 18px; font-weight: 700; text-align: center;">
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
                                        <button class="btn-primary"
                                            style="flex: 2; background: linear-gradient(to right, #10b981, #34d399); border: none;"
                                            id="confirm-pay-btn">تأكيد الدفع وطباعة الوصل</button>
                                        <button class="btn-logout"
                                            style="flex: 1; background: linear-gradient(to right, #64748b, #94a3b8); color: white; border: none;"
                                            onclick="document.getElementById('payment-method-modal').remove()">إلغاء</button>
                                    </div>
                                </div>
                            </div>
                            `;

                            document.body.insertAdjacentHTML('beforeend', modalHtml);

                            document.getElementById('confirm-pay-btn').onclick = () => {
                            const amount = parseFloat(document.getElementById('pay-modal-amount').value);
                            const method = document.getElementById('pay-modal-method').value;

                            if (isNaN(amount) || amount <= 0) { showToast("يرجى إدخال مبلغ صحيح", "error" ); return; }
                                tRef('added_services/' + vKey).once('value', snap=> {
                                const v = snap.val();
                                const newPaid = (parseFloat(v.paidAmount) || 0) + amount;
                                const serviceName = v.services.map(s => s.name).join(' + ');

                                tRef('added_services/' + vKey).update({
                                paidAmount: newPaid,
                                paymentStatus: newPaid >= v.total ? 'مدفوع بالكامل' : (newPaid > 0 ? 'مسدد جزئياً' :
                                'غير مسدد')
                                }).then(() => {
                                const paymentRecord = {
                                vId: vKey, // الربط البرمجي
                                visitId: v.vId || vKey.slice(-6), // المعرف المقروء
                                pId: v.pId,
                                pName: v.pName,
                                amount: amount,
                                method: method,
                                serviceName: serviceName,
                                date: new Date().toISOString().split('T')[0],
                                timestamp: Date.now(),
                                type: 'دفع جلسة/خدمة'
                                };

                                tRef('payments_log').push(paymentRecord).then(() => {
                                showToast("تم تسجيل الدفعة بنجاح", "success");
                                document.getElementById('payment-method-modal').remove();
                                // إضافة بيانات مالية إضافية للطباعة
                                paymentRecord.totalCost = v.total;
                                paymentRecord.totalPaid = newPaid;
                                printReceipt(null, paymentRecord);
                                });
                                });
                                });
                                };
                                }

                                // --- استرجاع الوصل المدفوع وتحديث سجل المراجع ---
                                function refundPayment(paymentKey) {

                                tRef('payments_log/' + paymentKey).once('value', snap => {
                                const p = snap.val();
                                if (!p) {
                                showToast("لم يتم العثور على بيانات الوصل", "error");
                                return;
                                }

                                const amount = parseFloat(p.amount) || 0;
                                const vIdInPayment = p.vId || p.visitId; // دعم المعرف البرمجي أو رقم الوصل

                                // تحديث بيانات الخدمة المضافة (سجل المراجع)
                                if (vIdInPayment) {
                                // المحاولة الأولى: التعامل معه كمفتاح (Key) يبدأ بـ -
                                tRef('added_services/' + vIdInPayment).once('value', asSnap => {
                                let asData = asSnap.val();
                                let targetKey = vIdInPayment;

                                if (!asData) {
                                // المحاولة الثانية: البحث بواسطة الحقل vId (المعرف المقروء أو البرمجي المخزن كحقل)
                                tRef('added_services').orderByChild('vId').equalTo(vIdInPayment).once('value',
                                searchSnap => {
                                if (searchSnap.exists()) {
                                searchSnap.forEach(child => {
                                asData = child.val();
                                targetKey = child.key;
                                });
                                if (asData) performRefundUpdate(targetKey, asData, amount);
                                } else {
                                // المحاولة الثالثة: البحث بواسطة visitId (في حال كان مخزناً بهذا الاسم)
                                tRef('added_services').orderByChild('visitId').equalTo(vIdInPayment).once('value', vSnap
                                => {
                                vSnap.forEach(child => {
                                asData = child.val();
                                targetKey = child.key;
                                });
                                if (asData) performRefundUpdate(targetKey, asData, amount);
                                });
                                }
                                });
                                } else {
                                performRefundUpdate(targetKey, asData, amount);
                                }
                                });
                                }

                                function performRefundUpdate(key, data, refundAmount) {
                                const currentPaid = parseFloat(data.paidAmount) || 0;
                                const newPaid = Math.max(0, currentPaid - refundAmount);
                                const total = parseFloat(data.total) || 0;
                                const newStatus = newPaid >= total ? 'مدفوع بالكامل' : (newPaid > 0 ? 'مسدد جزئياً' :
                                'غير مسدد');

                                tRef('added_services/' + key).update({
                                paidAmount: newPaid,
                                paymentStatus: newStatus
                                });
                                }

                                // تمييز الوصل كمسترجع في سجل المدفوعات
                                tRef('payments_log/' + paymentKey).update({
                                refunded: true,
                                amount: 0,
                                oldAmount: amount,
                                refundDate: new Date().toISOString().split('T')[0]
                                }).then(() => {
                                showToast("تم استرجاع الوصل وتحديث سجلات المراجع بنجاح", "success");
                                }).catch(err => {
                                console.error("Refund error:", err);
                                showToast("حدث خطأ أثناء عملية الاسترجاع", "error");
                                });
                                });
                                }


                                // --- نظام مراقبة حالة تسجيل الدخول وتوجيه المستخدم ---
                                auth.onAuthStateChanged(user => {
                                const loader = document.getElementById('loader');
                                if (user) {
                                // إذا كان المستخدم مسجل دخول، نقوم بتعريف مسار البيانات الخاص به (Username)
                                tenantPath = "clinics/" + user.email.split('@')[0] + "/";

                                // إخفاء شاشة التحميل "جاري التحقق من الصلاحيات"
                                if (loader) loader.style.display = 'none';

                                // تحديث إحصائيات الصفحة الرئيسية إذا كانت الدالة معرفة
                                if (typeof updateDashboardStats === 'function') updateDashboardStats();

                                // تهيئة القوائم المنسدلة للتاريخ في صفحة المواعيد
                                if (typeof initDateSelectors === 'function') initDateSelectors();

                                // جلب اسم العيادة من الإعدادات لعرضه في الشريط العلوي
                                tRef('settings/clinicName').on('value', snap => {
                                officialClinicName = snap.val() || "ClinicZone247";
                                const clinicEl = document.getElementById('navbar-clinic-name');
                                if (clinicEl) clinicEl.textContent = officialClinicName;
                                });

                                // عرض رسالة ترحيب باسم المستخدم في الأعلى
                                const username = (user.displayName || user.email.split('@')[0]);
                                const greetingEl = document.getElementById('navbar-greeting');
                                if (greetingEl) greetingEl.textContent = "مرحباً، " + username;

                                } else {
                                // إذا سجل المستخدم الخروج، نقوم بتوجيهه فوراً لصفحة تسجيل الدخول
                                window.location.href = "index.html";
                                }
                                });

                                // دالة عرض التنبيهات (Toast Notifications)
                                function showToast(message, type = 'success') {
                                const container = document.getElementById('toast-container');
                                if (!container) return;
                                const toast = document.createElement('div');
                                toast.className = `toast ${type} show`;
                                toast.innerHTML = message;
                                container.appendChild(toast);
                                setTimeout(() => {
                                toast.classList.remove('show');
                                setTimeout(() => toast.remove(), 300);
                                }, 3000);
                                }

                                // دالة الحذف مع التأكيد
                                function deleteEntry(path, itemName = "") {
                                const msg = itemName ? `هل أنت متأكد من حذف "${itemName}"؟` : "هل أنت متأكد من الحذف؟";
                                if (confirm(msg)) {
                                tRef(path).remove().then(() => {
                                showToast(itemName ? `تم حذف "${itemName}" بنجاح` : "تم الحذف بنجاح", 'success');
                                }).catch(err => {
                                showToast("خطأ أثناء الحذف: " + err.message, "error");
                                });
                                }
                                }

                                // دالة تحديث إحصائيات لوحة التحكم (Stub)
                                let homeVisitsChart = null;
                                let homeIncomeChart = null;

                                function updateDashboardStats() {
                                // 1. Patients Count
                                tRef('patients').on('value', snap => {
                                const el = document.getElementById('stat-patients');
                                if (el) el.innerText = snap.numChildren();
                                });

                                const todayStr = new Date().toISOString().split('T')[0];
                                const last30Days = [];
                                for (let i = 29; i >= 0; i--) {
                                const d = new Date();
                                d.setDate(d.getDate() - i);
                                last30Days.push(d.toISOString().split('T')[0]);
                                }

                                // 2. Payments Log (Visits & Income)
                                tRef('payments_log').on('value', snap => {
                                let todayVisits = 0;
                                let todayIncome = 0;
                                const dailyVisits = {};
                                const dailyIncome = {};

                                // Initialize daily maps
                                last30Days.forEach(day => {
                                dailyVisits[day] = 0;
                                dailyIncome[day] = 0;
                                });

                                snap.forEach(child => {
                                const val = child.val();
                                let date = val.date || '';
                                const amount = Number(val.amount) || 0;

                                // Convert legacy Arabic dates (if any) or format differences for comparison
                                // We only need to check if it represents 'Today'
                                const isToday = date === todayStr || date.includes(todayStr.replace(/-/g, '/'));

                                if (isToday) {
                                todayVisits++;
                                todayIncome += amount;
                                }

                                if (dailyVisits[date] !== undefined || isToday) {
                                const targetKey = dailyVisits[date] !== undefined ? date : todayStr;
                                dailyVisits[targetKey]++;
                                dailyIncome[targetKey] += amount;
                                }
                                });

                                const vTodayEl = document.getElementById('stat-visits-today');
                                const iTodayEl = document.getElementById('stat-income-today');
                                if (vTodayEl) vTodayEl.innerText = todayVisits;
                                if (iTodayEl) iTodayEl.innerText = todayIncome.toLocaleString() + ' د.ع';

                                // Update Charts
                                renderHomeCharts(last30Days, dailyVisits, dailyIncome);
                                });
                                }

                                function renderHomeCharts(labels, visitsData, incomeData) {
                                const ctxVisits = document.getElementById('visitsChart')?.getContext('2d');
                                const ctxIncome = document.getElementById('incomeChart')?.getContext('2d');

                                if (!ctxVisits || !ctxIncome) return;

                                const chartOptions = {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                y: {
                                beginAtZero: true,
                                grid: { color: '#f1f5f9' },
                                ticks: { font: { family: 'Cairo', size: 10 } }
                                },
                                x: {
                                grid: { display: false },
                                ticks: { font: { family: 'Cairo', size: 10 } }
                                }
                                }
                                };

                                // Common dataset style
                                const getDatasetStyle = (color) => ({
                                backgroundColor: color,
                                hoverBackgroundColor: color,
                                borderRadius: 6,
                                borderWidth: 0,
                                barThickness: 'flex',
                                maxBarThickness: 20
                                });

                                // Visits Chart
                                if (homeVisitsChart) homeVisitsChart.destroy();
                                homeVisitsChart = new Chart(ctxVisits, {
                                type: 'bar',
                                data: {
                                labels: labels.map(l => l.split('-').slice(1).join('/')),
                                datasets: [{
                                label: 'عدد الزيارات',
                                data: labels.map(l => visitsData[l]),
                                ...getDatasetStyle('#0d9488')
                                }]
                                },
                                options: {
                                ...chartOptions,
                                scales: {
                                ...chartOptions.scales,
                                y: {
                                ...chartOptions.scales.y,
                                ticks: {
                                ...chartOptions.scales.y.ticks,
                                stepSize: 1,
                                precision: 0
                                }
                                }
                                }
                                }
                                });

                                // Income Chart
                                if (homeIncomeChart) homeIncomeChart.destroy();
                                homeIncomeChart = new Chart(ctxIncome, {
                                type: 'bar',
                                data: {
                                labels: labels.map(l => l.split('-').slice(1).join('/')),
                                datasets: [{
                                label: 'الدخل',
                                data: labels.map(l => incomeData[l]),
                                ...getDatasetStyle('#1e40af')
                                }]
                                },
                                options: chartOptions
                                });
                                }

                                // --- إعدادات العيادة ---
                                function saveClinicName() {
                                const name = document.getElementById('set-clinic-name').value;
                                if (!name) { showToast("يرجى إدخال اسم العيادة", "error"); return; }
                                tRef('settings').update({ clinicName: name }).then(() => {
                                showToast("تم حفظ اسم العيادة بنجاح", "success");
                                });
                                }

                                // --- إعدادات الجدول ---
                                function saveScheduleSettings() {
                                const checkboxes = document.querySelectorAll('#working-days input:checked');
                                const days = Array.from(checkboxes).map(cb => cb.value);
                                const start = document.getElementById('sch-start').value;
                                const end = document.getElementById('sch-end').value;

                                tRef('settings/schedule').set({
                                workingDays: days,
                                startTime: start,
                                endTime: end
                                }).then(() => {
                                showToast("تم حفظ إعدادات الجدول بنجاح", "success");
                                });
                                }

                                function loadScheduleSettings() {
                                tRef('settings/schedule').once('value', snap => {
                                const s = snap.val();
                                if (s) {
                                if (s.workingDays) {
                                document.querySelectorAll('#working-days input').forEach(cb => {
                                cb.checked = s.workingDays.includes(cb.value);
                                });
                                }
                                if (s.startTime) document.getElementById('sch-start').value = s.startTime;
                                if (s.endTime) document.getElementById('sch-end').value = s.endTime;
                                }
                                });

                                tRef('settings/clinicName').once('value', snap => {
                                const name = snap.val();
                                if (name) {
                                const el = document.getElementById('set-clinic-name');
                                if (el) el.value = name;
                                }
                                });
                                }

                                // --- إعدادات الخدمات ---
                                let editingServiceId = null;

                                function addService() {
                                const name = document.getElementById('s-name').value.trim();
                                const price = document.getElementById('s-price').value;
                                const sessions = document.getElementById('s-sessions').value;
                                const duration = document.getElementById('s-duration').value;

                                if (!name || !price) {
                                showToast("يرجى إدخال اسم الخدمة والسعر", "error");
                                return;
                                }

                                const data = { name, price: parseFloat(price), sessions: parseInt(sessions) || 1,
                                duration: parseInt(duration) || 30 };

                                if (editingServiceId) {
                                tRef('services/' + editingServiceId).update(data).then(() => {
                                showToast("تم تحديث الخدمة بنجاح", "success");
                                resetServiceForm();
                                });
                                } else {
                                tRef('services').push(data).then(() => {
                                showToast("تم إضافة الخدمة بنجاح", "success");
                                resetServiceForm();
                                });
                                }
                                }

                                function resetServiceForm() {
                                editingServiceId = null;
                                document.getElementById('s-name').value = "";
                                document.getElementById('s-price').value = "";
                                document.getElementById('s-sessions').value = "1";
                                document.getElementById('s-duration').value = "30";
                                const addBtn = document.getElementById('btn-add-service');
                                const resetBtn = document.getElementById('btn-reset-service');
                                if (addBtn) addBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة خدمة';
                                if (resetBtn) resetBtn.style.display = 'none';
                                const title = document.getElementById('service-form-title');
                                if (title) title.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة خدمة جديدة';
                                }

                                function prepareEditService(id, name, price, sessions, duration) {
                                editingServiceId = id;
                                document.getElementById('s-name').value = name;
                                document.getElementById('s-price').value = price;
                                document.getElementById('s-sessions').value = sessions;
                                document.getElementById('s-duration').value = duration || 30;
                                const addBtn = document.getElementById('btn-add-service');
                                const resetBtn = document.getElementById('btn-reset-service');
                                if (addBtn) addBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
                                if (resetBtn) resetBtn.style.display = 'inline-block';
                                const title = document.getElementById('service-form-title');
                                if (title) title.innerHTML = '<i class="fas fa-edit"></i> تعديل الخدمة';
                                // Scroll to form
                                document.getElementById('s-name').scrollIntoView({ behavior: 'smooth', block: 'center'
                                });
                                }

                                function deleteService(id) {
                                if (confirm("هل أنت متأكد من حذف هذه الخدمة؟")) {
                                tRef('services/' + id).remove().then(() => {
                                showToast("تم حذف الخدمة بنجاح", "success");
                                });
                                }
                                }

                                function loadServices() {
                                tRef('services').on('value', snap => {
                                const list = document.getElementById('services-list');
                                if (!list) return;
                                if (snap.numChildren() === 0) {
                                    <td colspan="5"
                                        style="text-align:center; color: var(--text-secondary); padding: 30px;"><i
                                            class="fas fa-concierge-bell"
                                            style="font-size:24px; margin-bottom:10px; display:block;"></i>لا توجد خدمات
                                        بعد</td>
                                return;
                                }
                                let html = "";
                                snap.forEach(child => {
                                const s = child.val();
                                html += `
                                <tr>
                                    <td style="font-weight:700;">${s.name}</td>
                                    <td>${parseFloat(s.price || 0).toLocaleString()} د.ع</td>
                                    <td>${s.duration || 30} دقيقة</td>
                                    <td>${s.sessions || 1} جلسات</td>
                                    <td>
                                        <div style="display:flex; gap:5px;">
                                            <button class="btn-action btn-edit"
                                                onclick="prepareEditService('${child.key}', '${safeName}', '${s.price}', '${s.sessions}', '${s.duration || 30}')"><i
                                                    class="fas fa-edit"></i> تعديل</button>
                                            <button class="btn-action btn-delete"
                                                onclick="deleteService('${child.key}')"><i class="fas fa-trash"></i>
                                                حذف</button>
                                        </div>
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
                                const rows = document.querySelectorAll('#expenses-list tr');
                                                                 rows.forEach(row => {
                                const name = row.cells[0].textContent.toLowerCase();
                                row.style.display = name.includes(term) ? "" : "none";
                                });
                                }

                                function loadServicesView() {
                                tRef('services').once('value', snap => {
                                const list = document.getElementById('services-grid');
                                if (!list) return;
                                let html = "";
                                snap.forEach(child => {
                                const s = child.val();
                                html += `
                                <div class="card"
                                    style="padding: 15px; border-radius: 12px; background: white; border: 1px solid var(--border);">
                                    <h4 style="margin: 0 0 10px 0; color: var(--primary);">${s.name}</h4>
                                    <p style="margin: 5px 0;">السعر: <strong>${parseFloat(s.price).toLocaleString()}
                                            د.ع</strong></p>
                                    <p style="margin: 5px 0;">عدد الجلسات: <strong>${s.sessions}</strong></p>
                                </div>
                                `;
                                });
                                list.innerHTML = html;
                                });
                                }


                                // ========================================
                                // === دوال المواعيد (Appointments) ===
                                // ========================================

                                function onDateSelectChange() {
                                const day = document.getElementById('app-day-select').value;
                                const month = document.getElementById('app-month-select').value;
                                const year = document.getElementById('app-year-select').value;
                                if (day && month !== '' && year) {
                                const dateStr = year + '-' + String(parseInt(month) + 1).padStart(2, '0') + '-' +
                                String(day).padStart(2, '0');
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
                                const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب',
                                'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];

                                // Days
                                daySelect.innerHTML = '';
                                for (let d = 1; d <= 31; d++) { const opt=document.createElement('option'); opt.value=d;
                                    opt.textContent=d; if (d===now.getDate()) opt.selected=true;
                                    daySelect.appendChild(opt); } // Months monthSelect.innerHTML='' ;
                                    months.forEach((name, i)=> {
                                    const opt = document.createElement('option');
                                    opt.value = i;
                                    opt.textContent = name;
                                    if (i === now.getMonth()) opt.selected = true;
                                    monthSelect.appendChild(opt);
                                    });

                                    // Years
                                    yearSelect.innerHTML = '';
                                    for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) { const
                                        opt=document.createElement('option'); opt.value=y; opt.textContent=y; if
                                        (y===now.getFullYear()) opt.selected=true; yearSelect.appendChild(opt); } }
                                        function selectAppDate(dateStr, event, endDate) {
                                        document.getElementById('selected-app-date').value=dateStr; // Update the
                                        dropdowns to reflect selection const parts=dateStr.split('-'); if
                                        (parts.length===3) { const dayEl=document.getElementById('app-day-select');
                                        const monthEl=document.getElementById('app-month-select'); const
                                        yearEl=document.getElementById('app-year-select'); if (dayEl)
                                        dayEl.value=parseInt(parts[2]); if (monthEl) monthEl.value=parseInt(parts[1]) -
                                        1; if (yearEl) yearEl.value=parts[0]; } loadAppointments(dateStr, endDate); }
                                        let appointmentsListener=null; function loadAppointments(dateStr, endDate) { if
                                        (!dateStr) { dateStr=document.getElementById('selected-app-date').value || new
                                        Date().toISOString().split('T')[0]; } // Detach previous listener if
                                        (appointmentsListener) { tRef('appointments').off('value',
                                        appointmentsListener); } appointmentsListener=tRef('appointments').on('value',
                                        snap=> {
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
                                        entries.sort((a, b) => {
                                        const parseTime = (t) => {
                                        if (!t) return 0;
                                        const match = t.match(/(\d{2}):(\d{2})\s*(AM|PM|ص|م)?/i);
                                        if (!match) return 0;
                                        let h = parseInt(match[1], 10);
                                        let m = parseInt(match[2], 10);
                                        const period = match[3] ? match[3].toUpperCase() : null;
                                        if ((period === 'PM' || period === 'م') && h !== 12) h += 12;
                                        if ((period === 'AM' || period === 'ص') && h === 12) h = 0;
                                        return h * 60 + m;
                                        };
                                        return parseTime(a.time) - parseTime(b.time);
                                        });

                                        entries.forEach(a => {
                                        const appDate = a.date || '';
                                        let show = false;
                                        if (endDate) {
                                        show = appDate >= dateStr && appDate <= endDate; } else {
                                            show=appDate===dateStr; } if (!show) return; count++; const
                                            statusClass=a.status==='تم الحضور' ? 'success' : (a.status==='مؤجل'
                                            ? 'warning' : (a.status==='ملغي' ? 'danger' : 'warning' )); const
                                            statusBg=a.status==='تم الحضور' ? 'var(--success)' : (a.status==='مؤجل'
                                            ? 'var(--warning)' : (a.status==='ملغي' ? 'var(--danger)' : 'var(--warning)'
                                            )); let actionButtons='' ; if (a.status !=='تم الحضور' && a.status !=='مؤجل'
                                            && a.status !=='ملغي' ) { actionButtons=` <button
                                            class="btn-action btn-edit" onclick="attendAppointment('${a._key}')"><i
                                                class="fas fa-check"></i> حضور</button>
                                            <button class="btn-action btn-delete"
                                                onclick="cancelAppointment('${a._key}')"><i class="fas fa-times"></i>
                                                إلغاء</button>
                                            `;
                                            }
                                            html += `<tr class="appointment-row"
                                                data-search="${(a.pName || '')} ${(a.phone || '')} ${(a.serviceName || '')}"
                                                data-status="${a.status || 'قادم'}">
                                                <td>
                                                    <div><strong>${a.date}</strong></div>
                                                    <div style="color:var(--primary); font-weight:700;">
                                                        ${formatTimeTo12h(a.time)}</div>
                                                </td>
                                                <td style="font-weight:700;">${a.pName || '---'}</td>
                                                <td>${a.serviceName || '---'}</td>
                                                <td>${a.duration || 30} دقيقة</td>
                                                <td>${a.amount ? parseFloat(a.amount).toLocaleString() + ' د.ع' : '---'}
                                                </td>
                                                <td><span class="badge-${statusClass}"
                                                        style="padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; background:${statusBg}; color:white;">${a.status
                                                        || 'قادم'}</span></td>
                                                <td>${a.notes || '---'}</td>
                                                <td>
                                                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                                                        ${actionButtons}
                                                    </div>
                                                </td>
                                            </tr>`;

                                            // Time card
                                            const cardBorder = a.status === 'تم الحضور' ? 'var(--success)' : (a.status
                                            === 'ملغي' ? 'var(--danger)' : 'var(--primary)');
                                            cardsHtml += `<div
                                                style="background: white; border-radius: 12px; padding: 15px; position: relative; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); min-width: 180px;">
                                                <div
                                                    style="position: absolute; top: 0; right: 0; width: 4px; height: 100%; background: linear-gradient(to right, #2b4fa3, #1abc9c);">
                                                </div>
                                                <div
                                                    style="font-weight:800; color: var(--primary); font-size: 16px; margin-bottom: 5px;">
                                                    ${formatTimeTo12h(a.time)}</div>
                                                <div style="font-weight:700; font-size: 14px; margin-bottom: 3px;">
                                                    ${a.pName || '---'}</div>
                                                <div style="font-size: 12px; color: var(--text-secondary);">
                                                    ${a.serviceName || ''}</div>
                                                <div style="margin-top: 8px;"><span
                                                        style="padding:3px 10px; border-radius:15px; font-size:11px; font-weight:700; background:${statusBg}; color:white;">${a.status
                                                        || 'قادم'}</span></div>
                                            </div>`;
                                            });

                                            if (count === 0) {
                                                <td colspan="8"
                                                    style="text-align:center; padding:30px; color:var(--text-secondary);">
                                                    <i class="fas fa-calendar-times"
                                                        style="font-size:28px; margin-bottom:10px; display:block;"></i>لا
                                                    توجد مواعيد في هذا التاريخ
                                                </td>
                                                style="text-align:center; padding:30px; color:var(--text-secondary);"><i
                                                    class="fas fa-calendar-check"
                                                    style="font-size:28px; margin-bottom:10px; display:block;"></i>لا
                                            }

                                            list.innerHTML = html;
                                            if (cardsContainer) cardsContainer.innerHTML = cardsHtml;

                                            // Render Available Slots Grid
                                            renderDailyAvailabilityGrid(dateStr, entries);
                                            });
                                            }

                                            function renderDailyAvailabilityGrid(dateStr, bookedEntries) {
                                            const grid = document.getElementById('available-slots-grid');
                                            if (!grid) return;

                                            const bookedTimes = bookedEntries.filter(e => e.status !== 'ملغي' &&
                                            e.status !== 'مؤجل').map(e => e.time);

                                            let html = '';
                                            const startHour = 9; // صباحاً
                                            const endHour = 21; // مساءً
                                            const interval = 30; // 30 دقيقة

                                            for (let h = startHour; h < endHour; h++) { for (let m=0; m < 60; m
                                                +=interval) { const period=h>= 12 ? 'م' : 'ص';
                                                const h12 = h % 12 || 12;
                                                const time = `${String(h12).padStart(2, '0')}:${String(m).padStart(2,
                                                '0')} ${period}`;
                                                const legacyTime = `${String(h).padStart(2,
                                                '0')}:${String(m).padStart(2, '0')}`;
                                                const isBooked = bookedTimes.includes(time) ||
                                                bookedTimes.includes(legacyTime);
                                                const appointment = bookedEntries.find(e => (e.time === time || e.time
                                                === legacyTime) && e.status !== 'ملغي' && e.status !== 'مؤجل');

                                                html += `
                            background: ${isBooked ? '#eff6ff' : 'white'}; 
                            box-shadow: ${isBooked ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'};
                                                    <div
                                                        style="font-weight: 800; font-size: 13px; color: ${isBooked ? 'var(--primary)' : 'var(--text-secondary)'};">
                                                        ${time}</div>
                                                    <div
                                                        style="font-size: 10px; margin-top: 4px; font-weight: 700; color: ${isBooked ? 'var(--primary)' : 'var(--success)'};">
                                                        ${isBooked ? `<i class="fas fa-user-lock"></i>
                                                        ${appointment.pName.split(' ')[0]}` : '<i class="fas fa-user-lock"></i>'
                                                    </div>
                                                </div>
                                                `;
                                                }
                                                }
                                                grid.innerHTML = html;
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
                                                if (confirm("هل أنت متأكد من تأجيل هذا الموعد؟")) {
                                                tRef('appointments/' + key).once('value', snap => {
                                                const a = snap.val();
                                                if (!a) return;

                                                const updates = {
                                                status: 'مؤجل',
                                                postponedAt: Date.now()
                                                };

                                                tRef('appointments/' + key).update(updates).then(() => {
                                                // Link back to added_services if it came from a session
                                                if (a.sourceAddedServiceId && a.sessionIndex !== undefined) {
                                                tRef('added_services/' + a.sourceAddedServiceId).once('value', sSnap =>
                                                {
                                                const v = sSnap.val();
                                                if (v) {
                                                let sessionDetails = v.sessionDetails;
                                                sessionDetails[a.sessionIndex].postponed = true;
                                                sessionDetails[a.sessionIndex].appointmentId = null;
                                                tRef('added_services/' + a.sourceAddedServiceId).update({ sessionDetails
                                                });
                                                }
                                                });
                                                }
                                                showToast("تم تأجيل الموعد وتحديث سجل المراجع بنجاح", "warning");
                                                });
                                                });
                                                }
                                                }

                                                function filterAppointments() {
                                                const searchTerm =
                                                normalizeArabic(document.getElementById('appointment-search').value);
                                                const statusFilter =
                                                document.getElementById('appointment-status-filter').value;
                                                const rows = document.querySelectorAll('.appointment-row');

                                                const rows = document.querySelectorAll('#expenses-list tr');
                                                                 rows.forEach(row => {
                                                const searchData = normalizeArabic(row.getAttribute('data-search') ||
                                                '');
                                                const rowStatus = row.getAttribute('data-status') || '';
                                                const matchSearch = !searchTerm || searchData.includes(searchTerm);
                                                const matchStatus = statusFilter === 'الكل' || rowStatus ===
                                                statusFilter;
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
                                                const isRefunded = v.refunded === true;
                                                const amount = parseFloat(v.amount || 0);

                                                totalCount++;
                                                if (!isRefunded) totalPaid += amount;

                                                const vId = v.visitId || v._key.slice(-6);
                                                const sName = normalizeArabic(v.serviceName || '');
                                                const method = v.method || '';

                                                html += `<tr class="invoice-row" data-id="${vId.toLowerCase()}"
                                                    data-name="${normalizeArabic(v.pName || '')}"
                                                    data-phone="${v.phone || ''}" data-date="${v.date || ''}"
                                                    data-service="${sName}" data-method="${method}"
                                                    style="${isRefunded ? 'opacity: 0.6; background: #fff1f2;' : ''}">
                                                    <td style="font-weight:700; color:var(--primary);">${vId}</td>
                                                    <td style="font-weight:700;">${v.pName || '---'}</td>
                                                    <td>${v.phone || '---'}</td>
                                                    <td>${v.date || '---'}</td>
                                                        : ''}</td>
                                                    <td
                                                        style="font-weight:800; color:${isRefunded ? '#94a3b8' : 'var(--success)'}; text-decoration:${isRefunded ? 'line-through' : 'none'};">
                                                        ${(isRefunded ? (v.oldAmount || 0) : amount).toLocaleString()}
                                                        د.ع
                                                    </td>
                                                    <td>
                                                        <div style="display:flex; gap:5px;">
                                                            <button class="btn-action btn-edit"
                                                                onclick="printReceipt('${v._key}')" ${isRefunded
                                                                ? 'disabled style="opacity:0.5; cursor:not-allowed;"'
                                                                : '' }><i class="fas fa-print"></i> طباعة</button>
                                                            ${!isRefunded ? `<button class="btn-action btn-delete"
                                                                onclick="refundPayment('${v._key}')"><i
                                                                    class="fas fa-undo"></i> استرجاع</button>` : ''}
                                                        </div>
                                                    </td>
                                                </tr>`;
                                                });

                                                if (totalCount === 0) {
                                                    <td colspan="7"
                                                        style="text-align:center; padding:30px; color:var(--text-secondary);">
                                                        لا توجد فواتير</td>
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
                                                const phone =
                                                patientSelect.options[patientSelect.selectedIndex].getAttribute('data-phone')
                                                || '';
                                                const sessionsCount =
                                                parseInt(document.getElementById('visit-sessions-count').value) || 1;

                                                // Get selected services
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
                                                const dateAr = new Date().toISOString().split('T')[0];

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
                                                const idSearch =
                                                document.getElementById('invoice-id-search').value.toLowerCase();
                                                const searchTerm =
                                                normalizeArabic(document.getElementById('invoice-patient-search').value);
                                                const serviceSearch =
                                                normalizeArabic(document.getElementById('invoice-service-search').value);
                                                const methodSearch =
                                                document.getElementById('invoice-method-search').value;
                                                const dateFrom = document.getElementById('invoice-date-from').value;
                                                const dateTo = document.getElementById('invoice-date-to').value;

                                                const rows = document.querySelectorAll('.invoice-row');
                                                const rows = document.querySelectorAll('#expenses-list tr');
                                                                 rows.forEach(row => {
                                                const id = row.getAttribute('data-id') || '';
                                                const name = row.getAttribute('data-name') || '';
                                                const phone = row.getAttribute('data-phone') || '';
                                                const date = row.getAttribute('data-date') || '';
                                                const service = row.getAttribute('data-service') || '';
                                                const method = row.getAttribute('data-method') || '';

                                                const matchId = !idSearch || id.includes(idSearch);
                                                const matchSearch = !searchTerm || name.includes(searchTerm) ||
                                                phone.includes(searchTerm);
                                                const matchService = !serviceSearch || service.includes(serviceSearch);
                                                const matchMethod = !methodSearch || method === methodSearch;
                                                const matchDateFrom = !dateFrom || date >= dateFrom;
                                                const matchDateTo = !dateTo || date <= dateTo;
                                                    row.style.display=(matchId && matchSearch && matchService &&
                                                    matchMethod && matchDateFrom && matchDateTo) ? '' : 'none' ; }); }
                                                    function resetInvoiceFilters() {
                                                    document.getElementById('invoice-id-search').value='' ;
                                                    document.getElementById('invoice-patient-search').value='' ;
                                                    document.getElementById('invoice-service-search').value='' ;
                                                    document.getElementById('invoice-method-search').value='' ;
                                                    document.getElementById('invoice-date-from').value='' ;
                                                    document.getElementById('invoice-date-to').value='' ;
                                                    filterInvoices(); } function filterVisitServices() { const
                                                    term=normalizeArabic(document.getElementById('visit-service-search').value);
                                                    const name = normalizeArabic(label.textContent);
                                                    label.style.display = name.includes(term) ? '' : 'none';
                                                    });
                                                    }

                                                    function updateVisitBilling() {
                                                    let total = 0;
                                                    let summaryHtml = '';

                                                    checkboxes.forEach(cb => {
                                                    const name = cb.getAttribute('data-name');
                                                    const price = parseFloat(cb.getAttribute('data-price')) || 0;
                                                    total += price;
                                                    summaryHtml += `<div
                                                        style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed var(--border);">
                                                        <span>${name}</span>
                                                        <span style="font-weight:700;">${price.toLocaleString()}
                                                            د.ع</span>
                                                    </div>`;
                                                    });

                                                    const sessions =
                                                    parseInt(document.getElementById('visit-sessions-count').value) ||
                                                    1;
                                                    const sessionPrice = total / sessions;

                                                    document.getElementById('selected-services-summary').innerHTML =
                                                        style="font-size: 13px; color: var(--text-secondary); margin: 0;">
                                                    document.getElementById('visit-total-display').textContent =
                                                    total.toLocaleString() + ' د.ع';
                                                    document.getElementById('session-price-display').textContent =
                                                    Math.round(sessionPrice).toLocaleString() + ' د.ع';
                                                    }

                                                    function printReceipt(paymentKey, directData = null) {
                                                    if (!paymentKey && !directData) {
                                                    showToast("خطأ في بيانات الفاتورة", "error");
                                                    return;
                                                    }

                                                    showToast("جاري تحضير الفاتورة...", "info");

                                                    try {
                                                    if (directData) {
                                                    renderAndPrint(directData, paymentKey || 'NEW');
                                                    } else {
                                                    tRef('payments_log/' + paymentKey).once('value', snap => {
                                                    const v = snap.val();
                                                    if (!v) {
                                                    showToast("لم يتم العثور على بيانات الفاتورة", "error");
                                                    return;
                                                    }
                                                    renderAndPrint(v, paymentKey);
                                                    }, error => {
                                                    console.error("Firebase fetch error:", error);
                                                    showToast("فشل جلب بيانات الفاتورة من الخادم", "error");
                                                    });
                                                    }
                                                    } catch (err) {
                                                    console.error("Print error:", err);
                                                    showToast("حدث خطأ أثناء تحضير الفاتورة", "error");
                                                    }

                                                    function renderAndPrint(v, key) {
                                                    try {
                                                    const clinicName = officialClinicName || "ClinicZone247";
                                                    document.getElementById('print-clinic-name').textContent =
                                                    clinicName;
                                                    document.getElementById('print-v-id').textContent = v.visitId ||
                                                    (key && typeof key === 'string' ? key.slice(-6) : '---');
                                                    document.getElementById('print-date').textContent = v.date || '';
                                                    document.getElementById('print-p-name').textContent = v.pName || '';

                                                    let itemsHtml = '';
                                                    if (v.services && Array.isArray(v.services) && v.services.length) {
                                                    v.services.forEach(s => {
                                                    if (s && s.name) {
                                                    itemsHtml += `<tr>
                                                        <td>${s.name}</td>
                                                        <td style="text-align:left;">${parseFloat(s.price ||
                                                            0).toLocaleString()} د.ع</td>
                                                    </tr>`;
                                                    }
                                                    });
                                                    } else {
                                                    const sName = v.serviceName || 'خدمات طبية';
                                                    const sAmount = v.amount || 0;
                                                    itemsHtml = `<tr>
                                                        <td>${sName}</td>
                                                        <td style="text-align:left;">
                                                            ${parseFloat(sAmount).toLocaleString()} د.ع</td>
                                                    </tr>`;
                                                    }

                                                    document.getElementById('print-items').innerHTML = itemsHtml;
                                                    document.getElementById('print-total').textContent =
                                                    parseFloat(v.amount || 0).toLocaleString() + ' د.ع';

                                                    // معالجة البيانات المالية الإضافية
                                                    const rowTotalCost = document.getElementById('row-total-cost');
                                                    const rowTotalPaid = document.getElementById('row-total-paid');
                                                    const rowRemaining = document.getElementById('row-remaining');

                                                    if (v.totalCost !== undefined && v.totalCost !== null) {
                                                    if (rowTotalCost) rowTotalCost.style.display = 'flex';
                                                    document.getElementById('print-total-cost').textContent =
                                                    parseFloat(v.totalCost).toLocaleString() + ' د.ع';
                                                    if (rowTotalPaid) rowTotalPaid.style.display = 'flex';
                                                    document.getElementById('print-total-paid').textContent =
                                                    parseFloat(v.totalPaid || 0).toLocaleString() + ' د.ع';
                                                    if (rowRemaining) rowRemaining.style.display = 'flex';
                                                    document.getElementById('print-remaining').textContent =
                                                    } else {
                                                    if (rowTotalCost) rowTotalCost.style.display = 'none';
                                                    if (rowTotalPaid) rowTotalPaid.style.display = 'none';
                                                    if (rowRemaining) rowRemaining.style.display = 'none';
                                                    }

                                                    // المحاولة الأخيرة لإنشاء الـ QR Code بنجاح
                                                    try {
                                                    const qrContainer = document.getElementById('print-qrcode');
                                                    if (qrContainer && typeof QRCode !== 'undefined') {
                                                    qrContainer.innerHTML = '';
                                                    qrContainer.style.display = 'block'; // التأكد من أنه ليس مخفياً

                                                    const displayId = v.visitId || (key && typeof key === 'string' ?
                                                    key.slice(-6) : '---');
                                                    // نص بسيط جداً لضمان العمل (أرقام ومعرفات فقط في هذه المرحلة)
                                                    const qrData = `ID:${displayId} | AMT:${v.amount || 0} |
                                                    DATE:${v.date || ''}`;

                                                    new QRCode(qrContainer, {
                                                    text: qrData,
                                                    width: 80,
                                                    height: 80,
                                                    colorDark: "#000000",
                                                    colorLight: "#ffffff",
                                                    correctLevel: QRCode.CorrectLevel.H
                                                    });

                                                    // تنسيق فوري
                                                    setTimeout(() => {
                                                    const qrImg = qrContainer.querySelector('img');
                                                    if (qrImg) {
                                                    qrImg.style.display = 'inline-block';
                                                    qrImg.style.width = '80px';
                                                    qrImg.style.height = '80px';
                                                    }
                                                    const qrCanvas = qrContainer.querySelector('canvas');
                                                    if (qrCanvas) qrCanvas.style.display = 'none';
                                                    }, 200);
                                                    }
                                                    } catch (qrErr) {
                                                    console.error("Critical QR Error:", qrErr);
                                                    }

                                                    // زيادة وقت الانتظار لضمان ظهور كل شيء قبل الطباعة (2 ثانية)
                                                    setTimeout(() => {
                                                    window.print();
                                                    }, 2000);
                                                    } catch (innerErr) {
                                                    console.error("Render error:", innerErr);
                                                    showToast("خطأ في عرض بيانات الوصل: " + innerErr.message, "error");
                                                    }
                                                    }
                                                    }

                                                    // ========================================
                                                    // === دوال التقارير (Reports) ===
                                                    // ========================================

                                                    let reportServicesChart = null;
                                                    let reportPaymentsChart = null;

                                                    function handleReportPeriodChange() {
                                                    const period =
                                                    document.getElementById('report-period-select').value;
                                                    const customDates = document.getElementById('report-custom-dates');
                                                    if (customDates) {
                                                    customDates.style.display = period === 'custom' ? 'flex' : 'none';
                                                    }
                                                    }

                                                    function getReportDateRange() {
                                                    const period =
                                                    document.getElementById('report-period-select').value;
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
                                                    startDate = now.getFullYear() + '-' + String(now.getMonth() +
                                                    1).padStart(2, '0') + '-01';
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
                                                    sel.innerHTML += `<option value="${s.name}">${s.name}</option>`;
                                                    });
                                                    });
                                                    }

                                                    function loadReports() {
                                                    const { startDate, endDate } = getReportDateRange();
                                                    const methodFilter =
                                                    document.getElementById('report-method-filter').value;
                                                    const serviceFilter =
                                                    document.getElementById('report-service-filter').value;

                                                    if (!startDate || !endDate) return;

                                                    // Fetch Payments
                                                    tRef('payments_log').once('value', pSnap => {
                                                    let totalIncome = 0;
                                                    let totalVisits = 0;
                                                    let serviceMap = {};
                                                    let methodMap = {};
                                                    let paymentsHtml = '';

                                                    pSnap.forEach(child => {
                                                    const v = child.val();
                                                    const date = v.date || '';
                                                    if (date < startDate || date> endDate) return;
                                                        if (methodFilter !== 'all' && v.method !== methodFilter) return;
                                                        if (serviceFilter !== 'all' && !(v.serviceName ||
                                                        '').includes(serviceFilter)) return;

                                                        const isRefunded = v.refunded === true;
                                                        if (isRefunded) return; // Skip refunded payments in stats

                                                        const amount = parseFloat(v.amount) || 0;
                                                        totalIncome += amount;
                                                        totalVisits++;

                                                        const sName = v.serviceName || 'غير محدد';
                                                        serviceMap[sName] = (serviceMap[sName] || 0) + amount;

                                                        const method = v.method || 'نقداً';
                                                        methodMap[method] = (methodMap[method] || 0) + amount;

                                                        paymentsHtml += `<tr>
                                                            <td>${v.date || '---'}</td>
                                                            <td style="font-weight:700;">${v.pName || '---'}</td>
                                                            <td>${v.serviceName || '---'}</td>
                                                            <td
                                                                style="font-weight:700; color:${isRefunded ? '#94a3b8' : 'var(--success)'}; text-decoration:${isRefunded ? 'line-through' : 'none'};">
                                                                ${(isRefunded ? (v.oldAmount || 0) :
                                                                : ''}</td>
                                                            <td>${v.method || 'نقداً'}</td>
                                                            <td style="text-align:center;">
                                                                <button class="btn-action btn-history"
                                                                    onclick="printReceipt('${child.key}')"
                                                                    title="طباعة الوصل">
                                                                    <i class="fas fa-print"></i>
                                                                </button>
                                                            </td>
                                                        </tr>`;
                                                        });

                                                        // Fetch Expenses for Net Profit
                                                        tRef('expenses').once('value', eSnap => {
                                                        let totalExpenses = 0;
                                                        eSnap.forEach(child => {
                                                        const e = child.val();
                                                        if (e.date >= startDate && e.date <= endDate) { totalExpenses
                                                            +=parseFloat(e.amount) || 0; } }); const
                                                            netProfit=totalIncome - totalExpenses;
                                                            document.getElementById('report-total-income').textContent=totalIncome.toLocaleString()
                                                            + ' د.ع' ;
                                                            document.getElementById('report-total-expenses').textContent=totalExpenses.toLocaleString()
                                                            + ' د.ع' ;
                                                            document.getElementById('report-net-profit').textContent=netProfit.toLocaleString()
                                                            + ' د.ع' ;
                                                            document.getElementById('report-total-visits').textContent=totalVisits;
                                                            document.getElementById('report-net-profit').style.color=netProfit>
                                                            = 0 ? 'var(--success)' : 'var(--danger)';

                                                            const paymentsList =
                                                            document.getElementById('report-payments-list');
                                                            if (paymentsList) {
                                                                <td colspan="6"
                                                                    style="text-align:center; padding:30px;">لا توجد
                                                                    بيانات في هذه الفترة</td>
                                                            }

                                                            updateReportCharts(serviceMap, methodMap);
                                                            });
                                                            });
                                                            }

                                                            function updateReportCharts(serviceMap, methodMap) {
                                                            // Services chart
                                                            const sCtx = document.getElementById('reportServicesChart');
                                                            if (sCtx && typeof Chart !== 'undefined') {
                                                            if (reportServicesChart) reportServicesChart.destroy();
                                                            const sLabels = Object.keys(serviceMap);
                                                            const sData = Object.values(serviceMap);
                                                            const colors = ['#0d5c63', '#a2d240', '#d4af37', '#ef4444',
                                                            '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899'];

                                                            reportServicesChart = new Chart(sCtx, {
                                                            type: 'doughnut',
                                                            data: {
                                                            labels: sLabels,
                                                            datasets: [{ data: sData, backgroundColor: colors.slice(0,
                                                            sLabels.length), borderWidth: 2, borderColor: '#fff' }]
                                                            },
                                                            options: {
                                                            responsive: true, maintainAspectRatio: false,
                                                            plugins: { legend: { position: 'bottom', labels: { font: {
                                                            family: 'Cairo', size: 12 } } } }
                                                            }
                                                            });
                                                            }

                                                            // Payment methods chart
                                                            const pCtx = document.getElementById('reportPaymentsChart');
                                                            if (pCtx && typeof Chart !== 'undefined') {
                                                            if (reportPaymentsChart) reportPaymentsChart.destroy();
                                                            const pLabels = Object.keys(methodMap);
                                                            const pData = Object.values(methodMap);
                                                            const pColors = ['#059669', '#3b82f6', '#f59e0b',
                                                            '#ef4444'];

                                                            reportPaymentsChart = new Chart(pCtx, {
                                                            type: 'pie',
                                                            data: {
                                                            labels: pLabels,
                                                            datasets: [{ data: pData, backgroundColor: pColors.slice(0,
                                                            pLabels.length), borderWidth: 2, borderColor: '#fff' }]
                                                            },
                                                            options: {
                                                            responsive: true, maintainAspectRatio: false,
                                                            plugins: { legend: { position: 'bottom', labels: { font: {
                                                            family: 'Cairo', size: 12 } } } }
                                                            }
                                                            });
                                                            }
                                                            }

                                                            function printReport() {
                                                            document.body.classList.add('printing-report');

                                                            // إضافة ستايل ديناميكي لإلغاء حجم ورق A6 الخاص بالوصل وجعله
                                                            A4 للتقارير
                                                            const printStyle = document.createElement('style');
                                                            printStyle.id = 'report-print-style';
                                                            printStyle.innerHTML = `
                                                            @page { size: A4 portrait; margin: 10mm; }
                                                            body.printing-report #print-area { display: none !important;
                                                            }
                                                            body.printing-report .sidebar,
                                                            body.printing-report .topbar,
                                                            body.printing-report section:not(#reports),
                                                            body.printing-report button { display: none !important; }
                                                            body.printing-report #reports > *:not(#report-table-card) {
                                                            display: none !important; }
                                                            body.printing-report .main-content { margin: 0 !important;
                                                            padding: 0 !important; width: 100% !important; }
                                                            body.printing-report #reports { display: block !important;
                                                            width: 100% !important; }
                                                            /* تعديل حجم الرسوم البيانية لتناسب الطباعة */
                                                            body.printing-report canvas { max-width: 100% !important;
                                                            height: auto !important; }
                                                            `;
                                                            document.head.appendChild(printStyle);

                                                            window.print();

                                                            setTimeout(() => {
                                                            document.body.classList.remove('printing-report');
                                                            const styleElem =
                                                            document.getElementById('report-print-style');
                                                            if (styleElem) styleElem.remove();
                                                            }, 500);
                                                            }

                                                            function exportPaymentsToCsv() {
                                                            const rows =
                                                            document.querySelectorAll('#report-payments-list tr');
                                                            let csv = '\uFEFF'; // BOM for Arabic support in Excel
                                                            csv += 'التاريخ,المراجع,الخدمة,المبلغ,طريقة الدفع\n';
                                                            const rows = document.querySelectorAll('#expenses-list tr');
                                                                 rows.forEach(row => {
                                                            const cells = row.querySelectorAll('td');
                                                            if (cells.length >= 5) {
                                                            }
                                                            });
                                                            const blob = new Blob([csv], { type:
                                                            'text/csv;charset=utf-8;' });
                                                            const link = document.createElement('a');
                                                            link.href = URL.createObjectURL(blob);
                                                            link.download = 'report_' + new
                                                            Date().toISOString().split('T')[0] + '.csv';
                                                            link.click();
                                                            }

                                                            // المتغيرات لحفظ حالة الحجز في الصفحة
                                                            let currentBookingContext = {};

                                                            function openLargeCalendarForSession(pId, pName, vKey,
                                                            bookingGroupId, sIndex, appId, appDate, appTime) {
                                                            const today = new Date().toISOString().split('T')[0];
                                                            const initialDate = appDate || today;

                                                            currentBookingContext = { pId, pName, vKey, sIndex, appId,
                                                            chosenTime: appTime };

                                                            document.getElementById('sb-page-title').innerHTML = `<i
                                                                class="fas fa-calendar-alt"
                                                                style="color: var(--primary); margin-left: 10px;"></i>
                                                            موعد جديد للجلسة'}`;
                                                            document.getElementById('sb-page-subtitle').innerHTML =
                                                            `للمراجع: <strong>${pName}</strong> | جلسة رقم ${sIndex +
                                                            1}`;
                                                            document.getElementById('sb-page-date').value = initialDate;
                                                            document.getElementById('sb-page-chosen-time').textContent =
                                                            formatTimeTo12h(appTime);

                                                            document.getElementById('sb-page-save-btn').onclick =
                                                            function () {
                                                            saveSessionAppointment(pId, pName, vKey, sIndex, (appId &&
                                                            appId !== 'null') ? appId : '');
                                                            };

                                                            showSection('session-booking-page');
                                                            renderTimeSlotsForPage();
                                                            }

                                                            function backFromSessionBooking() {
                                                            showSection('patient-history');
                                                            }

                                                            function renderTimeSlotsForPage() {
                                                            const date = document.getElementById('sb-page-date').value;
                                                            const container =
                                                            document.getElementById('sb-page-time-slots');
                                                            if (!container) return;

                                                                style="grid-column: 1/-1; text-align:center; padding:20px;">
                                                                <i class="fas fa-spinner fa-spin"></i> جاري التحميل...

                                                            // Get booked times for this date
                                                            tRef('appointments').orderByChild('date').equalTo(date).once('value',
                                                            snap => {
                                                            const booked = [];
                                                            snap.forEach(child => {
                                                            const a = child.val();
                                                            if (a.status !== 'ملغي' && a.status !== 'مؤجل') {
                                                            booked.push(a.time);
                                                            }
                                                            });

                                                            // Generate slots (9 AM to 9 PM)
                                                            let html = '';
                                                            const startHour = 9;
                                                            const endHour = 21;
                                                            const interval = 30; // 30 minutes
                                                            const chosenTime = currentBookingContext.chosenTime;

                                                            for (let h = startHour; h < endHour; h++) { for (let m=0; m
                                                                < 60; m +=interval) { const period=h>= 12 ? 'م' : 'ص';
                                                                const h12 = h % 12 || 12;
                                                                const time = `${String(h12).padStart(2,
                                                                '0')}:${String(m).padStart(2, '0')} ${period}`;
                                                                const legacyTime = `${String(h).padStart(2,
                                                                '0')}:${String(m).padStart(2, '0')}`;
                                                                const isBooked = booked.includes(time) ||
                                                                booked.includes(legacyTime);
                                                                const isSelected = time === chosenTime || legacyTime ===
                                                                chosenTime;

                                                                html += `
                                                                <div onclick="${isBooked ? '' : `selectTimeForPage('${time}')`}"
                                background: ${isSelected ? 'var(--primary)' : (isBooked ? '#f1f5f9' : 'white')}; 
                                color: ${isSelected ? 'white' : (isBooked ? '#94a3b8' : 'var(--text)')};
                                border: 2px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'};
                                transition: 0.2s;" ${!isBooked ? `onmouseover="if(this.style.background!=='var(--primary)') this.style.background='#eff6ff'; this.style.borderColor='var(--primary)'"
                                                                    onmouseout="if(this.style.background!=='var(--primary)') {this.style.background='white'; this.style.borderColor='#e2e8f0';}"
                                                                    ` : '' }>
                                                                    ${time}
                                                                        style="font-size:10px; opacity:0.7; margin-top: 4px;">
                                                                </div>
                                                                `;
                                                                }
                                                                }
                                                                container.innerHTML = html;
                                                                });
                                                                }

                                                                function selectTimeForPage(time) {
                                                                currentBookingContext.chosenTime = time;
                                                                document.getElementById('sb-page-chosen-time').textContent
                                                                = time;
                                                                const slots =
                                                                document.querySelectorAll('#sb-page-time-slots div');
                                                                slots.forEach(s => {
                                                                if (s.children.length > 0 && s.children[0].textContent
                                                                === 'محجوز') return;

                                                                if (s.textContent.includes(time)) {
                                                                s.style.background = 'var(--primary)';
                                                                s.style.color = 'white';
                                                                s.style.borderColor = 'var(--primary)';
                                                                } else if (!s.textContent.includes('محجوز')) {
                                                                s.style.background = 'white';
                                                                s.style.color = 'var(--text)';
                                                                s.style.borderColor = '#e2e8f0';
                                                                }
                                                                });
                                                                }

                                                                function saveSessionAppointment(pId, pName, vKey,
                                                                sIndex, appId) {
                                                                const date =
                                                                document.getElementById('sb-page-date').value;
                                                                const time =
                                                                document.getElementById('sb-page-chosen-time').textContent;

                                                                if (time === '--:--') {
                                                                showToast("يرجى اختيار الوقت أولاً", "warning");
                                                                return;
                                                                }

                                                                const btn = document.getElementById('sb-page-save-btn');
                                                                btn.disabled = true;

                                                                tRef('added_services/' + vKey).once('value', snap => {
                                                                const v = snap.val();
                                                                if (!v) return;

                                                                const appData = {
                                                                pId, pName, date, time,
                                                                serviceName: v.services.map(s => s.name).join(' + ') + `
                                                                (جلسة ${sIndex + 1})`,
                                                                status: 'قادم',
                                                                sourceAddedServiceId: vKey,
                                                                sessionIndex: sIndex,
                                                                timestamp: Date.now()
                                                                };

                                                                const savePromise = appId ? tRef('appointments/' +
                                                                appId).update(appData) :
                                                                tRef('appointments').push(appData);

                                                                savePromise.then((newAppSnap) => {
                                                                const finalAppId = appId || newAppSnap.key;

                                                                // Update sessionDetails in added_services
                                                                let sessionDetails = v.sessionDetails || Array.from({
                                                                length: v.sessions }, () => ({ executed: false, paid:
                                                                false, appointmentId: null }));
                                                                sessionDetails[sIndex].appointmentId = finalAppId;
                                                                sessionDetails[sIndex].postponed = false; // Reset if it
                                                                was postponed

                                                                tRef('added_services/' + vKey).update({ sessionDetails
                                                                }).then(() => {
                                                                showToast("تم حفظ الموعد بنجاح", "success");
                                                                backFromSessionBooking();
                                                                // Refresh patient history if open
                                                                if (typeof viewPatientHistory === 'function' &&
                                                                currentHistoryPId === pId) {
                                                                viewPatientHistory(pId, pName);
                                                                }
                                                                });
                                                                }).catch(err => {
                                                                showToast("خطأ أثناء الحفظ: " + err.message, "error");
                                                                btn.disabled = false;
                                                                });
                                                                });
                                                                }

                                                                // --- دالة الحجز العامة (Missing in dashboard) ---
                                                                function bookAppointment() {
                                                                // This is for the main appointments section if a form
                                                                is added.
                                                                }

                                                                // --- إدارة المصروفات ---
                                                                function addExpense() {
                                                                const desc = document.getElementById('exp-desc').value;
                                                                const amount =
                                                                parseFloat(document.getElementById('exp-amount').value);
                                                                const category =
                                                                document.getElementById('exp-category').value;
                                                                const date = document.getElementById('exp-date').value;

                                                                if (!desc || !amount || !date) {
                                                                return showToast("يرجى ملء كافة الحقول", "error");
                                                                }

                                                                const expenseData = {
                                                                desc, amount, category, date,
                                                                timestamp: Date.now()
                                                                };

                                                                tRef('expenses').push(expenseData).then(() => {
                                                                showToast("تم حفظ المصروف بنجاح", "success");
                                                                document.getElementById('exp-desc').value = '';
                                                                document.getElementById('exp-amount').value = '';
                                                                loadExpenses();
                                                                if (typeof loadReports === 'function') loadReports();
                                                                });
                                                                }

                                                                function loadExpenses() {
                                                                tRef('expenses').once('value', snap => {
                                                                const list = document.getElementById('expenses-list');
                                                                if (!list) return;
                                                                let html = '';
                                                                const entries = [];
                                                                snap.forEach(child => {
                                                                entries.push({ ...child.val(), _key: child.key });
                                                                });
                                                                entries.sort((a, b) => (b.date > a.date ? 1 : -1));

                                                                entries.forEach(e => {
                                                                html += `<tr>
                                                                    <td>${e.date}</td>
                                                                    <td style="font-weight:700;">${e.desc}</td>
                                                                    <td><span class="badge-info"
                                                                            style="background:#f1f5f9; color:var(--text);">${e.category}</span>
                                                                    </td>
                                                                    <td style="font-weight:700; color:var(--danger);">
                                                                        ${e.amount.toLocaleString()} د.ع</td>
                                                                    <td>
                                                                        <button class="btn-action btn-delete"
                                                                            onclick="deleteExpense('${e._key}')">
                                                                            <i class="fas fa-trash"></i> حذف
                                                                        </button>
                                                                    </td>
                                                                </tr>`;
                                                                });
                                                                list.innerHTML = html || '<tr><td colspan="5"style="text-align:center; padding:20px;">لا توجدمصروفات مسجلة</td></tr>';
                                                                });
                                                                }

                                                                function deleteExpense(key) {
                                                                if (confirm("هل أنت متأكد من حذف هذا المصروف؟")) {
                                                                tRef('expenses/' + key).remove().then(() => {
                                                                showToast("تم حذف المصروف", "warning");
                                                                loadExpenses();
                                                                if (typeof loadReports === 'function') loadReports();
                                                                });
                                                                }
                                                                }

                                                                function filterExpenses() {
                                                                const q =
                                                                document.getElementById('expense-search').value.toLowerCase();
                                                                const rows = document.querySelectorAll('#expenses-list tr');
                                                                 rows.forEach(row => {
                                                                row.style.display =
                                                                row.innerText.toLowerCase().includes(q) ? '' : 'none';
                                                                });
                                                                }

                                                                