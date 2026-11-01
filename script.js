/**
 * Integrated Merchant Registration, Admin Portal & POS Suite
 */
const POSApp = (function() {
    let activeUser = null;
    let activeAdmin = false;
    let cart = [];
    let tempProfileDpBase64 = "";

    // ডাটাবেস ইনিশিয়ালাইজেশন (লোকালস্টোরেজ সিঙ্ক)
    let dbUsers = JSON.parse(localStorage.getItem('pos_registered_users')) || [
        {
            id: "REG-1001",
            name: "Dhrubo Saha",
            username: "dhrubo",
            company: "Daily Mart",
            category: "Retail & E-commerce",
            phone: "+8801700000000",
            email: "dhrubo@mart.com",
            dob: "2005-05-16",
            age: "21 Yrs",
            homeAddr: "Khulna",
            permAddr: "Khulna",
            district: "Khulna",
            nationality: "Bangladeshi",
            status: "approved", // pending, approved, rejected, delisted
            assignedUsername: "dhrubo",
            assignedPassword: "Password@123",
            userStatus: "Active", // Active, Inactive
            lastActiveTime: "Just now",
            softwareViews: 12,
            submittedAt: "2026-11-01 10:00 AM",
            photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
            inventory: [],
            statements: [],
            vouchers: [],
            documents: [],
            address: "Khulna, Bangladesh",
            helpline: "+8801700000000",
            dp: ""
        }
    ];

    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function saveToLocalStorage() {
        localStorage.setItem('pos_registered_users', JSON.stringify(dbUsers));
    }

    function playBeepSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const audioCtx = new AudioCtx();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.08);
            }
        } catch(e) {}
    }

    return {
        init: function() {
            saveToLocalStorage();
            this.checkAutoLogin();
            this.initBarcodeScannerListener();
        },

        switchPortal: function(portalId) {
            document.getElementById('portal-user-register').classList.add('hidden');
            document.getElementById('portal-user-login').classList.add('hidden');
            document.getElementById('portal-admin-login').classList.add('hidden');
            document.getElementById('portal-admin-dashboard').classList.add('hidden');
            document.getElementById('portal-pos-suite').classList.add('hidden');

            if (portalId === 'user-register') {
                document.getElementById('portal-user-register').classList.remove('hidden');
            } else if (portalId === 'user-login') {
                document.getElementById('portal-user-login').classList.remove('hidden');
            } else if (portalId === 'admin-login') {
                if (activeAdmin) {
                    document.getElementById('portal-admin-dashboard').classList.remove('hidden');
                    this.renderAdminDashboard();
                } else {
                    document.getElementById('portal-admin-login').classList.remove('hidden');
                }
            }
        },

        calculateRegistrationAge: function() {
            const dobVal = document.getElementById('reg-dob').value;
            if (!dobVal) return;
            const dob = new Date(dobVal);
            const today = new Date();
            let years = today.getFullYear() - dob.getFullYear();
            let months = today.getMonth() - dob.getMonth();
            if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
                years--;
            }
            document.getElementById('reg-age-display').value = `${years} Years`;
        },

        handleRegistrationSubmit: function() {
            const name = document.getElementById('reg-name').value.trim();
            const username = document.getElementById('reg-username').value.trim();
            const company = document.getElementById('reg-company').value.trim();
            const category = document.getElementById('reg-category').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const dob = document.getElementById('reg-dob').value;
            const homeAddr = document.getElementById('reg-home-addr').value.trim();
            const permAddr = document.getElementById('reg-perm-addr').value.trim();
            const district = document.getElementById('reg-district').value.trim();
            const nationality = document.getElementById('reg-nationality').value.trim();

            if (!name || !username || !company) {
                alert('Please fill out all required fields.');
                return;
            }

            const newRecord = {
                id: 'REG-' + Math.floor(1000 + Math.random() * 9000),
                name, username, company, category, phone, email, dob,
                age: document.getElementById('reg-age-display').value || '20 Yrs',
                homeAddr, permAddr, district, nationality,
                status: 'pending',
                assignedUsername: username,
                assignedPassword: 'Pass' + Math.floor(100 + Math.random() * 900),
                userStatus: 'Active',
                lastActiveTime: 'Just now',
                softwareViews: 0,
                submittedAt: new Date().toLocaleString(),
                photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300",
                inventory: [], statements: [], vouchers: [], documents: [],
                address: district + ", Bangladesh", helpline: phone, dp: ""
            };

            dbUsers.unshift(newRecord);
            saveToLocalStorage();
            alert('Registration submitted successfully! Please wait for Admin verification and credential assignment.');
            this.switchPortal('user-login');
        },

        /* ADMIN AUTHENTICATION & CONTROL PANEL */
        handleAdminLogin: function() {
            const u = document.getElementById('admin-user-input').value.trim();
            const p = document.getElementById('admin-pass-input').value;

            // রিকোয়ারমেন্ট অনুযায়ী নির্দিষ্ট ইউজারনেম এবং পাসওয়ার্ড: admin / admin123
            if (u === 'admin' && p === 'admin123') {
                activeAdmin = true;
                document.getElementById('portal-admin-login').classList.add('hidden');
                document.getElementById('portal-admin-dashboard').classList.remove('hidden');
                this.renderAdminDashboard();
            } else {
                alert('Invalid Admin Credentials! Use [admin] and [admin123].');
            }
        },

        handleAdminLogout: function() {
            activeAdmin = false;
            this.switchPortal('user-login');
        },

        switchAdminTab: function(tab) {
            ['pending', 'approved', 'rejected', 'delisted'].forEach(t => {
                document.getElementById(`adm-section-${t}`).classList.add('hidden');
                document.getElementById(`adm-tab-btn-${t}`).className = "px-4 py-2 rounded-lg text-slate-400 hover:text-white transition";
            });
            document.getElementById(`adm-section-${tab}`).classList.remove('hidden');
            document.getElementById(`adm-tab-btn-${tab}`).className = "px-4 py-2 rounded-lg bg-indigo-600 text-white transition";
            this.renderAdminDashboard();
        },

        renderAdminDashboard: function() {
            const pending = dbUsers.filter(x => x.status === 'pending');
            const approved = dbUsers.filter(x => x.status === 'approved');
            const rejected = dbUsers.filter(x => x.status === 'rejected');
            const delisted = dbUsers.filter(x => x.status === 'delisted');

            document.getElementById('adm-count-pending').innerText = pending.length;
            document.getElementById('adm-count-approved').innerText = approved.length;
            document.getElementById('adm-count-rejected').innerText = rejected.length;
            document.getElementById('adm-count-delisted').innerText = delisted.length;

            // Render Pending
            let pHtml = '';
            pending.forEach((u, idx) => {
                pHtml += `
                    <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                        <div class="flex items-center gap-3">
                            <img src="${u.photoUrl}" class="w-12 h-12 rounded-xl object-cover border border-slate-700">
                            <div>
                                <h4 class="font-bold text-white">${escapeHTML(u.name)}</h4>
                                <p class="text-xs text-slate-400">${escapeHTML(u.company)} • ${escapeHTML(u.district)}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg text-xs">
                            <div><span class="text-slate-500">Phone:</span> ${escapeHTML(u.phone)}</div>
                            <div><span class="text-slate-500">Category:</span> ${escapeHTML(u.category)}</div>
                        </div>
                        <div class="space-y-2 pt-2 border-t border-slate-800">
                            <div class="grid grid-cols-2 gap-2">
                                <input type="text" id="adm-user-${u.id}" value="${u.assignedUsername}" class="bg-slate-950 border border-slate-800 p-2 rounded text-xs text-slate-100" placeholder="Username">
                                <input type="text" id="adm-pass-${u.id}" value="${u.assignedPassword}" class="bg-slate-950 border border-slate-800 p-2 rounded text-xs text-slate-100" placeholder="Password">
                            </div>
                            <div class="flex gap-2 pt-1">
                                <button onclick="POSApp.adminApproveUser('${u.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg text-xs font-bold transition">✔ Approve & Send</button>
                                <button onclick="POSApp.adminRejectUser('${u.id}')" class="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 p-2 rounded-lg text-xs font-bold transition">✖ Reject</button>
                            </div>
                        </div>
                    </div>`;
            });
            document.getElementById('admin-pending-container').innerHTML = pHtml || '<div class="col-span-full p-8 text-center text-slate-500">No pending applications.</div>';

            // Render Approved
            let aHtml = '';
            approved.forEach(u => {
                aHtml += `
                    <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                        <div class="flex justify-between items-start">
                            <div class="flex items-center gap-3">
                                <img src="${u.photoUrl}" class="w-12 h-12 rounded-xl object-cover border border-emerald-500/40">
                                <div>
                                    <h4 class="font-bold text-white">${escapeHTML(u.name)}</h4>
                                    <p class="text-xs text-slate-400">@${escapeHTML(u.assignedUsername)} • ${escapeHTML(u.company)}</p>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.userStatus==='Active'?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30':'bg-slate-800 text-slate-400'}">${u.userStatus}</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg text-center text-xs">
                            <div><span class="text-[10px] text-slate-500 block">STATUS</span><span class="font-bold text-emerald-400">${u.userStatus}</span></div>
                            <div><span class="text-[10px] text-slate-500 block">ACTIVE TIME</span><span class="font-medium text-slate-300">${u.lastActiveTime}</span></div>
                            <div><span class="text-[10px] text-slate-500 block">VIEWS</span><span class="font-bold text-blue-400">${u.softwareViews}</span></div>
                        </div>
                        <div class="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                            <button onclick="POSApp.adminToggleUserStatus('${u.id}')" class="text-amber-400 hover:underline">Toggle Active/Inactive</button>
                            <button onclick="POSApp.adminDelistUser('${u.id}')" class="bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded font-bold">Delist Account</button>
                        </div>
                    </div>`;
            });
            document.getElementById('admin-approved-container').innerHTML = aHtml || '<div class="col-span-full p-8 text-center text-slate-500">No approved merchants.</div>';

            // Render Rejected
            let rHtml = '';
            rejected.forEach(u => {
                rHtml += `
                    <div class="bg-slate-900 border border-rose-950/60 p-5 rounded-xl space-y-2">
                        <h4 class="font-bold text-slate-300 line-through">${escapeHTML(u.name)}</h4>
                        <p class="text-xs text-rose-400">Application Rejected</p>
                        <button onclick="POSApp.adminDeleteUser('${u.id}')" class="text-xs text-rose-500 hover:underline">Permanently Delete</button>
                    </div>`;
            });
            document.getElementById('admin-rejected-container').innerHTML = rHtml || '<div class="col-span-full p-8 text-center text-slate-500">No rejected applications.</div>';

            // Render Delisted
            let dHtml = '';
            delisted.forEach(u => {
                dHtml += `
                    <div class="bg-slate-900 border border-indigo-950 p-5 rounded-xl flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-white">${escapeHTML(u.name)}</h4>
                            <p class="text-xs text-indigo-400">@${escapeHTML(u.assignedUsername)} • Access Revoked</p>
                        </div>
                        <button onclick="POSApp.adminEnlistUser('${u.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold">Enlist & Restore</button>
                    </div>`;
            });
            document.getElementById('admin-delisted-container').innerHTML = dHtml || '<div class="col-span-full p-8 text-center text-slate-500">No delisted accounts.</div>';
        },

        adminApproveUser: function(id) {
            const u = dbUsers.find(x => x.id === id);
            if (!u) return;
            u.assignedUsername = document.getElementById(`adm-user-${id}`).value.trim() || u.username;
            u.assignedPassword = document.getElementById(`adm-pass-${id}`).value.trim() || 'Password@123';
            u.status = 'approved';
            u.userStatus = 'Active';
            saveToLocalStorage();
            this.renderAdminDashboard();
            alert(`User approved! Credentials sent to phone & email.\nUsername: ${u.assignedUsername}\nPassword: ${u.assignedPassword}`);
        },

        adminRejectUser: function(id) {
            const u = dbUsers.find(x => x.id === id);
            if (u) {
                u.status = 'rejected';
                saveToLocalStorage();
                this.renderAdminDashboard();
            }
        },

        adminDeleteUser: function(id) {
            dbUsers = dbUsers.filter(x => x.id !== id);
            saveToLocalStorage();
            this.renderAdminDashboard();
        },

        adminToggleUserStatus: function(id) {
            const u = dbUsers.find(x => x.id === id);
            if (u) {
                u.userStatus = u.userStatus === 'Active' ? 'Inactive' : 'Active';
                saveToLocalStorage();
                this.renderAdminDashboard();
            }
        },

        adminDelistUser: function(id) {
            const u = dbUsers.find(x => x.id === id);
            if (u) {
                u.status = 'delisted';
                u.userStatus = 'Inactive';
                saveToLocalStorage();
                this.renderAdminDashboard();
            }
        },

        adminEnlistUser: function(id) {
            const u = dbUsers.find(x => x.id === id);
            if (u) {
                u.status = 'approved';
                u.userStatus = 'Active';
                saveToLocalStorage();
                this.renderAdminDashboard();
            }
        },

        /* MERCHANT POS LOGIN & WORKSPACE */
        handleMerchantLogin: function() {
            const uInput = document.getElementById('login-username').value.trim();
            const pInput = document.getElementById('login-password').value;

            const merchant = dbUsers.find(x => x.assignedUsername === uInput && x.assignedPassword === pInput && x.status === 'approved');

            if (merchant) {
                if (merchant.userStatus === 'Inactive') {
                    alert('Your account is currently Inactive or Delisted by Admin. Please contact support.');
                    return;
                }
                activeUser = merchant.id;
                merchant.softwareViews = (merchant.softwareViews || 0) + 1;
                merchant.lastActiveTime = "Just now";
                saveToLocalStorage();
                this.loadPosSuite();
            } else {
                alert('Invalid Username or Password, or your registration is pending/rejected.');
            }
        },

        checkAutoLogin: function() {
            // ডিফল্টভাবে লগইন পেজ দেখাবে
            this.switchPortal('user-login');
        },

        handleMerchantLogout: function() {
            activeUser = null;
            this.switchPortal('user-login');
        },

        loadPosSuite: function() {
            document.getElementById('portal-user-login').classList.add('hidden');
            document.getElementById('portal-pos-suite').classList.remove('hidden');
            const userData = dbUsers.find(x => x.id === activeUser);

            document.getElementById('app-company-name').innerText = userData.company;
            document.getElementById('app-username').innerText = `User: ${userData.assignedUsername}`;

            if (userData.dp) {
                document.getElementById('sidebar-dp').src = userData.dp;
                document.getElementById('sidebar-dp').classList.remove('hidden');
                document.getElementById('sidebar-initial-logo').classList.add('hidden');
            } else {
                document.getElementById('sidebar-dp').classList.add('hidden');
                document.getElementById('sidebar-initial-logo').classList.remove('hidden');
                document.getElementById('sidebar-initial-logo').innerText = userData.company.substring(0, 1).toUpperCase();
            }

            document.getElementById('prof-address').value = userData.address || "";
            document.getElementById('prof-helpline').value = userData.helpline || "";

            this.switchTab('tab-pos');
            this.renderInventory();
            this.renderStatements();
            this.renderVouchersTable();
            this.renderBusinessDocuments();
        },

        getCurrentUser: function() {
            return dbUsers.find(x => x.id === activeUser);
        },

        switchTab: function(tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
            document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('bg-indigo-600', 'text-white'));
            document.getElementById(tabId).classList.remove('hidden');
            document.getElementById(`btn-${tabId}`).classList.add('bg-indigo-600', 'text-white');
        },

        previewProfileDp: function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    tempProfileDpBase64 = e.target.result;
                    document.getElementById('profile-preview-img').src = tempProfileDpBase64;
                };
                reader.readAsDataURL(file);
            }
        },

        saveProfileConfiguration: function() {
            const user = this.getCurrentUser();
            user.address = document.getElementById('prof-address').value.trim();
            user.helpline = document.getElementById('prof-helpline').value.trim();
            if (tempProfileDpBase64) {
                user.dp = tempProfileDpBase64;
            }
            saveToLocalStorage();
            alert('Profile Settings updated successfully!');
            this.loadPosSuite();
        },

        /* DOCUMENTS MANAGEMENT */
        uploadBusinessDocument: function() {
            const user = this.getCurrentUser();
            const titleInput = document.getElementById('doc-title');
            const fileInput = document.getElementById('doc-file-input');
            const title = titleInput.value.trim();
            const file = fileInput.files[0];

            if (!title || !file) {
                alert('Provide title and select file.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                user.documents.push({
                    title, fileData: e.target.result, fileType: file.type, fileName: file.name
                });
                saveToLocalStorage();
                this.renderBusinessDocuments();
                titleInput.value = '';
                fileInput.value = '';
                alert('Document uploaded successfully!');
            };
            reader.readAsDataURL(file);
        },

        renderBusinessDocuments: function() {
            const user = this.getCurrentUser();
            const docs = user.documents || [];
            const tbody = document.getElementById('business-docs-table-body');
            tbody.innerHTML = '';
            docs.forEach((doc, index) => {
                tbody.innerHTML += `
                    <tr class="text-sm">
                        <td class="p-3 font-medium text-slate-200">${escapeHTML(doc.title)}</td>
                        <td class="p-3 text-xs text-slate-400 uppercase">${doc.fileType.includes('pdf') ? 'PDF' : 'Image'}</td>
                        <td class="p-3 text-center space-x-2">
                            <button onclick="POSApp.viewDocument(${index})" class="text-indigo-400 hover:underline text-xs">View</button>
                            <button onclick="POSApp.deleteDocument(${index})" class="text-red-400 hover:underline text-xs">Delete</button>
                        </td>
                    </tr>`;
            });
            if (docs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-500 text-xs">No documents uploaded.</td></tr>`;
            }
        },

        viewDocument: function(index) {
            const user = this.getCurrentUser();
            const doc = user.documents[index];
            document.getElementById('modal-doc-title').innerText = doc.title;
            const contentDiv = document.getElementById('modal-doc-content');
            if (doc.fileType.includes('pdf')) {
                contentDiv.innerHTML = `<iframe src="${doc.fileData}" class="w-full h-[60vh] border rounded"></iframe>`;
            } else {
                contentDiv.innerHTML = `<img src="${doc.fileData}" class="max-w-full h-auto rounded" alt="${escapeHTML(doc.title)}">`;
            }
            document.getElementById('doc-modal').classList.remove('hidden');
        },

        closeDocModal: function() {
            document.getElementById('doc-modal').classList.add('hidden');
        },

        deleteDocument: function(index) {
            const user = this.getCurrentUser();
            user.documents.splice(index, 1);
            saveToLocalStorage();
            this.renderBusinessDocuments();
        },

        /* VOUCHERS & CHALLANS */
        openVoucherModal: function() {
            document.getElementById('voucher-modal').classList.remove('hidden');
            this.renderVoucherFormFields();
        },

        closeVoucherModal: function() {
            document.getElementById('voucher-modal').classList.add('hidden');
        },

        renderVoucherFormFields: function() {
            const type = document.getElementById('v-type-select').value;
            const container = document.getElementById('voucher-dynamic-fields');
            const user = this.getCurrentUser();
            const uniqueNum = type === 'Challan' ? 'CH-' + Math.floor(1000 + Math.random() * 9000) : (type === 'Credit Voucher' ? 'CR-' + Math.floor(1000 + Math.random() * 9000) : 'DR-' + Math.floor(1000 + Math.random() * 9000));
            const todayStr = new Date().toISOString().split('T')[0];

            if (type === 'Credit Voucher') {
                container.innerHTML = `
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Business Name</label><input type="text" id="cv-bus" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" value="${user.company}"></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Voucher Number</label><input type="text" id="cv-num" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm font-mono font-bold" value="${uniqueNum}" readonly></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Date</label><input type="date" id="cv-date" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" value="${todayStr}"></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Received From</label><input type="text" id="cv-received" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" placeholder="Payer Name"></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Amount (৳)</label><input type="number" step="any" id="cv-amount" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" placeholder="0.00"></div>
                `;
            } else if (type === 'Debit Voucher') {
                container.innerHTML = `
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Business Name</label><input type="text" id="dv-bus" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" value="${user.company}"></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Voucher Number</label><input type="text" id="dv-num" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm font-mono font-bold" value="${uniqueNum}" readonly></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Date</label><input type="date" id="dv-date" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" value="${todayStr}"></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Paid To</label><input type="text" id="dv-paidto" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" placeholder="Payee Name"></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Amount (৳)</label><input type="number" step="any" id="dv-amount" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" placeholder="0.00"></div>
                `;
            } else {
                container.innerHTML = `
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Business Name</label><input type="text" id="ch-bus" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" value="${user.company}"></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Challan Number</label><input type="text" id="ch-num" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm font-mono font-bold" value="${uniqueNum}" readonly></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Date</label><input type="date" id="ch-date" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" value="${todayStr}"></div>
                    <div><label class="block text-xs font-semibold text-slate-400 mb-1">Customer Name</label><input type="text" id="ch-cname" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" placeholder="Customer Name"></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="block text-xs font-semibold text-slate-400 mb-1">Product Name</label><input type="text" id="ch-pname" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" placeholder="Product"></div>
                        <div><label class="block text-xs font-semibold text-slate-400 mb-1">Quantity</label><input type="number" step="any" id="ch-qty" class="w-full bg-slate-950 border border-slate-800 p-2 rounded text-sm" placeholder="0"></div>
                    </div>
                `;
            }
        },

        saveAndGenerateVoucher: function() {
            const user = this.getCurrentUser();
            const type = document.getElementById('v-type-select').value;
            let record = { type };

            if (type === 'Credit Voucher') {
                record.businessName = document.getElementById('cv-bus').value;
                record.uniqueNum = document.getElementById('cv-num').value;
                record.date = document.getElementById('cv-date').value;
                record.receivedFrom = document.getElementById('cv-received').value;
                record.amount = document.getElementById('cv-amount').value;
            } else if (type === 'Debit Voucher') {
                record.businessName = document.getElementById('dv-bus').value;
                record.uniqueNum = document.getElementById('dv-num').value;
                record.date = document.getElementById('dv-date').value;
                record.paidTo = document.getElementById('dv-paidto').value;
                record.amount = document.getElementById('dv-amount').value;
            } else {
                record.businessName = document.getElementById('ch-bus').value;
                record.uniqueNum = document.getElementById('ch-num').value;
                record.date = document.getElementById('ch-date').value;
                record.cname = document.getElementById('ch-cname').value;
                record.pname = document.getElementById('ch-pname').value;
                record.qty = document.getElementById('ch-qty').value;
            }

            user.vouchers.push(record);
            saveToLocalStorage();
            this.closeVoucherModal();
            this.renderVouchersTable();
            this.previewVoucherObject(record);
        },

        renderVouchersTable: function() {
            const user = this.getCurrentUser();
            const vouchers = user.vouchers || [];
            const tbody = document.getElementById('vouchers-table-body');
            tbody.innerHTML = '';
            vouchers.forEach((v, index) => {
                const entity = v.type === 'Challan' ? v.cname : (v.type === 'Credit Voucher' ? v.receivedFrom : v.paidTo);
                const amtOrQty = v.type === 'Challan' ? `${v.qty || 0} units` : `${parseFloat(v.amount || 0).toFixed(2)} TK`;
                tbody.innerHTML += `
                    <tr class="text-sm">
                        <td class="p-4 font-mono font-bold text-indigo-400">${escapeHTML(v.uniqueNum)}</td>
                        <td class="p-4">${escapeHTML(v.type)}</td>
                        <td class="p-4">${escapeHTML(v.date)}</td>
                        <td class="p-4">${escapeHTML(entity)}</td>
                        <td class="p-4 font-bold">${escapeHTML(amtOrQty)}</td>
                        <td class="p-4 text-center">
                            <button onclick="POSApp.deleteVoucher(${index})" class="text-red-400 hover:underline">Delete</button>
                        </td>
                    </tr>`;
            });
            if (vouchers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">No vouchers found.</td></tr>`;
            }
        },

        previewVoucherObject: function(v) {
            document.getElementById('pv-business-name').innerText = v.businessName;
            document.getElementById('pv-voucher-title').innerText = v.type;
            document.getElementById('pv-voucher-number').innerText = v.uniqueNum;
            document.getElementById('pv-date').innerText = v.date;
            const grid = document.getElementById('pv-details-grid');
            grid.innerHTML = `
                <div><strong>Entity:</strong> ${escapeHTML(v.receivedFrom || v.paidTo || v.cname)}</div>
                <div><strong>Details:</strong> ${escapeHTML(v.pname || 'General Transaction')}</div>
            `;
            document.getElementById('pv-amount-label').innerText = v.type === 'Challan' ? 'Quantity:' : 'Amount:';
            document.getElementById('pv-amount-value').innerText = v.type === 'Challan' ? `${v.qty} Units` : `${parseFloat(v.amount || 0).toFixed(2)} TK`;
            document.getElementById('voucher-preview-modal').classList.remove('hidden');
        },

        closeVoucherPreview: function() {
            document.getElementById('voucher-preview-modal').classList.add('hidden');
        },

        printVoucher: function() {
            window.print();
        },

        downloadVoucherPDF: function() {
            const element = document.getElementById('printable-voucher-box');
            html2pdf().from(element).save('Voucher.pdf');
        },

        deleteVoucher: function(index) {
            const user = this.getCurrentUser();
            user.vouchers.splice(index, 1);
            saveToLocalStorage();
            this.renderVouchersTable();
        },

        /* POS CORE LOGIC */
        updatePOSUnitDisplay: function() {
            const user = this.getCurrentUser();
            const select = document.getElementById('bill-product-select');
            const badge = document.getElementById('pos-unit-badge');
            if (select.value === "") { badge.innerText = "Unit"; return; }
            badge.innerText = user.inventory[select.value].unit;
            this.calculateLivePOSBreakdown();
        },

        calculateLivePOSBreakdown: function() {
            const user = this.getCurrentUser();
            const select = document.getElementById('bill-product-select');
            const qty = parseFloat(document.getElementById('bill-qty-input').value) || 0;
            const panel = document.getElementById('live-calculation-panel');
            if (select.value === "" || qty <= 0) { panel.classList.add('hidden'); return; }
            const item = user.inventory[select.value];
            panel.classList.remove('hidden');
            document.getElementById('live-unit-price').innerText = `${item.sell.toFixed(2)} TK`;
            document.getElementById('live-subtotal').innerText = `${(item.sell * qty).toFixed(2)} TK`;
            document.getElementById('live-vat-dis').innerText = `Dis: -${(item.discount * qty).toFixed(2)} TK`;
            document.getElementById('live-gift').innerText = item.gift || 'None';
        },

        togglePaidInputDisplay: function() {
            const status = document.getElementById('bill-receive-status').value;
            const container = document.getElementById('paid-amount-input-container');
            if (status === 'Unpaid') {
                container.classList.add('hidden');
            } else {
                container.classList.remove('hidden');
            }
        },

        addToCart: function() {
            const select = document.getElementById('bill-product-select');
            const qty = parseFloat(document.getElementById('bill-qty-input').value);
            if (select.value === "" || isNaN(qty) || qty <= 0) { alert('Enter valid quantity!'); return; }
            this.executeAddToCartProcessing(select.value, qty);
            document.getElementById('bill-qty-input').value = '';
            select.value = '';
        },

        executeAddToCartProcessing: function(invIndex, qty) {
            const user = this.getCurrentUser();
            const item = user.inventory[invIndex];
            if (!item) return;

            if (qty > item.qty) { alert('Insufficient stock!'); return; }
            let finalUnitPrice = (item.sell - item.discount) * (1 + (item.vat / 100));
            
            cart.push({
                inventoryIndex: invIndex, name: item.name, qty, unit: item.unit,
                rawSell: item.sell, rawDiscount: item.discount, rawVat: item.vat,
                gift: item.gift, total: qty * finalUnitPrice
            });
            this.renderCart();
            document.getElementById('live-calculation-panel').classList.add('hidden');
        },

        initBarcodeScannerListener: function() {
            const self = this;
            window.addEventListener('keydown', function(e) {
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
                const currentTime = Date.now();
                if (currentTime - lastKeyTime > 50) barcodeBuffer = '';
                lastKeyTime = currentTime;
                if (e.key === 'Enter') {
                    if (barcodeBuffer.length >= 3) {
                        self.processHardwareScannerStroke(barcodeBuffer.trim());
                        barcodeBuffer = '';
                        e.preventDefault();
                    }
                } else if (e.key.length === 1) {
                    barcodeBuffer += e.key;
                }
            });
        },

        processHardwareScannerStroke: function(barcode) {
            if (!activeUser) return;
            const user = this.getCurrentUser();
            const index = user.inventory.findIndex(item => item.barcode === barcode);
            if (index > -1) {
                this.executeAddToCartProcessing(index, 1);
                playBeepSound();
            }
        },

        renderCart: function() {
            const tbody = document.getElementById('cart-table-body');
            tbody.innerHTML = '';
            let grandTotal = 0, totalQty = 0;
            cart.forEach((item, index) => {
                grandTotal += item.total;
                totalQty += item.qty;
                tbody.innerHTML += `
                    <tr class="text-sm">
                        <td class="p-4">${escapeHTML(item.name)}</td>
                        <td class="p-4">${item.qty} ${escapeHTML(item.unit)}</td>
                        <td class="p-4">${item.rawSell.toFixed(2)} TK</td>
                        <td class="p-4">-${item.rawDiscount.toFixed(2)} TK</td>
                        <td class="p-4 font-bold text-indigo-400">${item.total.toFixed(2)} TK</td>
                        <td class="p-4 text-center"><button onclick="POSApp.removeFromCart(${index})" class="text-red-400 hover:underline">Remove</button></td>
                    </tr>`;
            });
            if (cart.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500">Cart is empty.</td></tr>`;
            }
            document.getElementById('cart-item-count').innerText = `${cart.length} Items`;
            document.getElementById('summary-items-qty').innerText = totalQty;
            document.getElementById('summary-total').innerText = `${grandTotal.toFixed(2)} TK`;
        },

        removeFromCart: function(index) {
            cart.splice(index, 1);
            this.renderCart();
        },

        renderInventory: function() {
            const user = this.getCurrentUser();
            const items = user.inventory || [];
            const tbody = document.getElementById('inventory-table-body');
            tbody.innerHTML = '';
            const select = document.getElementById('bill-product-select');
            select.innerHTML = '<option value="">Select Product Manually</option>';

            items.forEach((item, index) => {
                select.innerHTML += `<option value="${index}">${escapeHTML(item.name)} (${item.qty} ${escapeHTML(item.unit)})</option>`;
                tbody.innerHTML += `
                    <tr class="text-sm">
                        <td class="p-4">${escapeHTML(item.name)}<br><span class="text-xs text-slate-500">SKU: ${escapeHTML(item.barcode)}</span></td>
                        <td class="p-4">${item.qty} ${escapeHTML(item.unit)}</td>
                        <td class="p-4">${item.buy.toFixed(2)} TK</td>
                        <td class="p-4 font-semibold text-indigo-400">${item.sell.toFixed(2)} TK</td>
                        <td class="p-4 text-red-400">-${item.discount.toFixed(2)} TK</td>
                        <td class="p-4 text-amber-400">+${item.vat}%</td>
                        <td class="p-4 text-emerald-400">${escapeHTML(item.gift) || '-'}</td>
                        <td class="p-4 text-center"><svg id="barcode-${item.barcode}"></svg></td>
                        <td class="p-4 text-center"><button onclick="POSApp.deleteInventoryItem(${index})" class="text-red-400 hover:underline">Delete</button></td>
                    </tr>`;
                setTimeout(() => {
                    JsBarcode(`#barcode-${item.barcode}`, item.barcode, { format: "CODE128", width: 1, height: 25, displayValue: false });
                }, 10);
            });
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-500">No products in inventory.</td></tr>`;
            }
        },

        deleteInventoryItem: function(index) {
            const user = this.getCurrentUser();
            user.inventory.splice(index, 1);
            saveToLocalStorage();
            this.renderInventory();
        },

        handleSaveProduct: function() {
            const user = this.getCurrentUser();
            const name = document.getElementById('inv-name').value.trim();
            const sku = document.getElementById('inv-sku').value.trim() || "SKU" + Math.floor(10000 + Math.random() * 90000);
            const qty = parseFloat(document.getElementById('inv-qty').value);
            const unit = document.getElementById('inv-unit').value;
            const buy = parseFloat(document.getElementById('inv-buy').value);
            const sell = parseFloat(document.getElementById('inv-sell').value);
            const discount = parseFloat(document.getElementById('inv-discount').value) || 0;
            const vat = parseFloat(document.getElementById('inv-vat').value) || 0;
            const gift = document.getElementById('inv-gift').value.trim();

            if (!name || isNaN(qty) || isNaN(buy) || isNaN(sell)) {
                alert('Fill out required fields.');
                return;
            }

            user.inventory.push({ name, qty, unit, buy, sell, discount, vat, gift, barcode: sku });
            saveToLocalStorage();
            this.renderInventory();
            document.getElementById('inv-name').value = '';
            document.getElementById('inv-sku').value = '';
            document.getElementById('inv-qty').value = '';
            document.getElementById('inv-buy').value = '';
            document.getElementById('inv-sell').value = '';
        },

        processFinalInvoice: function() {
            if (cart.length === 0) { alert('Cart is empty.'); return; }
            const user = this.getCurrentUser();
            const receiveStatus = document.getElementById('bill-receive-status').value;
            const totalBill = cart.reduce((sum, item) => sum + item.total, 0);
            const paidAmount = receiveStatus === 'Unpaid' ? 0 : totalBill;
            const dueAmount = totalBill - paidAmount;

            cart.forEach(item => {
                user.inventory[item.inventoryIndex].qty -= item.qty;
            });

            const newStatement = {
                date: new Date().toLocaleString().split(',')[0],
                total: totalBill, paid: paidAmount, due: dueAmount, method: receiveStatus
            };
            user.statements.push(newStatement);
            saveToLocalStorage();

            document.getElementById('bill-shop-name').innerText = user.company;
            document.getElementById('bill-date').innerText = newStatement.date;
            const tbody = document.getElementById('bill-items-body');
            tbody.innerHTML = '';
            cart.forEach(item => {
                tbody.innerHTML += `<tr><td>${item.name}</td><td class="text-right">${item.qty}</td><td class="text-right">${item.rawSell}</td><td class="text-right">${item.total.toFixed(2)}</td></tr>`;
            });
            document.getElementById('bill-total-price').innerHTML = `Grand Total: ${totalBill.toFixed(2)} TK`;
            document.getElementById('bill-paid-price').innerText = paidAmount.toFixed(2);
            document.getElementById('bill-due-price').innerText = dueAmount.toFixed(2);

            cart = [];
            this.renderCart();
            this.renderInventory();
            this.renderStatements();

            document.getElementById('portal-pos-suite').classList.add('hidden');
            document.getElementById('print-area').classList.remove('hidden');
        },

        closeInvoiceView: function() {
            document.getElementById('print-area').classList.add('hidden');
            document.getElementById('portal-pos-suite').classList.remove('hidden');
        },

        renderStatements: function() {
            const user = this.getCurrentUser();
            const statements = user.statements || [];
            const tbody = document.getElementById('statement-table-body');
            tbody.innerHTML = '';
            let s=0, r=0, d=0;
            statements.forEach(st => {
                s+=st.total; r+=st.paid; d+=st.due;
                tbody.innerHTML += `<tr class="text-sm"><td>${st.date}</td><td>${st.total.toFixed(2)} TK</td><td class="text-emerald-400">${st.paid.toFixed(2)} TK</td><td class="text-rose-400">${st.due.toFixed(2)} TK</td><td>${st.method}</td></tr>`;
            });
            document.getElementById('widget-total-sales').innerText = `${s.toFixed(2)} TK`;
            document.getElementById('widget-total-received').innerText = `${r.toFixed(2)} TK`;
            document.getElementById('widget-total-due').innerText = `${d.toFixed(2)} TK`;
        },

        handleDownloadCSV: function() {
            const user = this.getCurrentUser();
            let csv = 'Timestamp,Gross Total,Paid,Due,Method\n';
            (user.statements || []).forEach(st => {
                csv += `"${st.date}",${st.total},${st.paid},${st.due},"${st.method}"\n`;
            });
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;' });
            const lnk = document.createElement("a");
            lnk.href = URL.createObjectURL(blob);
            lnk.download = 'Statement.csv';
            lnk.click();
        }
    };
})();

window.addEventListener('DOMContentLoaded', () => {
    POSApp.init();
});
