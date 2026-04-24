// Local Database Yardımcı Fonksiyonları
function getDb() {
    const db = localStorage.getItem('localDb');
    return db ? JSON.parse(db) : { users: [], messages: [], offers: [] };
}

function saveDb(db) {
    localStorage.setItem('localDb', JSON.stringify(db));
}

function formatTitleCase(str) {
    if (!str) return "";
    return str.trim().split(/\s+/).map(word => {
        if (!word) return "";
        return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR');
    }).join(' ');
}

let currentUser = null;
let currentChatPartner = null;
let currentSubjectFilter = 'Tümü'; 
let currentActiveLesson = 'Tümü';

function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const roleSelect = document.getElementById('reg-role');
    
    // Temizle
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
    const tabTeacher = document.getElementById('tab-teacher');
    if (tabTeacher) tabTeacher.classList.remove('active');

    if (tab === 'login') {
        document.getElementById('auth-selection-view').style.display = 'none';
        document.getElementById('auth-forms-view').style.display = 'block';
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('auth-modal-title').innerText = 'Giriş Yap';
    } else if (tab === 'register') {
        document.getElementById('auth-selection-view').style.display = 'none';
        document.getElementById('auth-forms-view').style.display = 'block';
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        document.getElementById('tab-register').classList.add('active');
        document.getElementById('auth-modal-title').innerText = 'Üye Ol';
    }
}

function toggleRoleFields() {
    const role = document.getElementById('reg-role');
    if (!role) return;
    if (role.value === 'teacher') {
        document.getElementById('teacher-fields').style.display = 'block';
        document.getElementById('student-fields').style.display = 'none';
    } else {
        document.getElementById('teacher-fields').style.display = 'none';
        document.getElementById('student-fields').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    toggleRoleFields();
    let db = getDb();
    if (!db.offers) { db.offers = []; saveDb(db); }
    if (!db.messages) { db.messages = []; saveDb(db); }

    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        migrateStudentData();
        showDashboard();
    }
});

function migrateStudentData() {
    if (!currentUser || currentUser.role !== 'student') return;
    const db = getDb();
    const userInDb = db.users.find(u => u.id === currentUser.id);
    
    if (userInDb && !userInDb.lessons) {
        userInDb.lessons = [];
        if (userInDb.lessonNeeded) {
            userInDb.lessons.push({
                id: Date.now().toString(),
                subject: userInDb.lessonNeeded,
                hours: userInDb.weeklyHoursNeeded || 0
            });
        }
        currentUser.lessons = userInDb.lessons;
        saveDb(db);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}

let regForm = document.getElementById('register-form');
if(regForm) {
    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const db = getDb();
        const role = document.getElementById('reg-role').value;
        const username = document.getElementById('reg-username').value.trim().toLocaleLowerCase('tr-TR');

        if (db.users.find(u => u.username === username)) {
            showToast("Bu kullanıcı adı zaten sistemde kayıtlı.", "error"); return;
        }

        const newUser = {
            id: Date.now().toString(),
            name: formatTitleCase(document.getElementById('reg-name').value),
            username: username,
            password: document.getElementById('reg-password').value,
            role: role
        };

        if (role === 'teacher') {
            newUser.subject = formatTitleCase(document.getElementById('reg-subject').value);
            newUser.hourlyRate = document.getElementById('reg-price').value;
            newUser.weeklyHours = document.getElementById('reg-hours').value;
        } else {
            const subject = formatTitleCase(document.getElementById('reg-need-subject').value);
            const hours = document.getElementById('reg-need-hours').value;
            newUser.lessons = [{
                id: Date.now().toString(),
                subject: subject,
                hours: hours
            }];
            // Eski alanları da şimdilik tutalım (fallback için)
            newUser.lessonNeeded = subject;
            newUser.weeklyHoursNeeded = hours;
        }

        db.users.push(newUser);
        saveDb(db);
        showToast('Kayıt başarılı! Şimdi giriş yapabilirsiniz.', 'success');
        openAuthModal('login');
    });
}

let loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const db = getDb();
        const username = document.getElementById('login-username').value.toLocaleLowerCase('tr-TR');
        const password = document.getElementById('login-password').value;

        const user = db.users.find(u => u.username === username && u.password === password);
        if (!user) { showToast("Geçersiz kullanıcı adı veya şifre.", "error"); return; }

        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        document.getElementById('auth-modal').style.display = 'none';
        document.getElementById('landing-section').style.opacity = '0';
        setTimeout(() => { showDashboard(); document.getElementById('landing-section').style.opacity = '1'; }, 400);
    });
}

function openAuthModal(tab) {
    document.getElementById('auth-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
    
    const selectionView = document.getElementById('auth-selection-view');
    const formsView = document.getElementById('auth-forms-view');

    if (tab === 'selection') {
        selectionView.style.display = 'block';
        formsView.style.display = 'none';
    } else {
        selectionView.style.display = 'none';
        formsView.style.display = 'block';
        switchAuthTab(tab);
    }
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    document.body.style.overflow = 'auto'; 
}

function logout() {
    document.getElementById('app').style.opacity = '0';
    setTimeout(() => {
        currentUser = null; currentChatPartner = null; currentSubjectFilter = 'Tümü'; 
        localStorage.removeItem('currentUser');
        document.getElementById('landing-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('app').style.opacity = '1';
    }, 400);
}

function showDashboard() {
    document.getElementById('landing-section').style.display = 'none';
    closeAuthModal();
    const dash = document.getElementById('dashboard-section');
    dash.style.display = 'flex';
    document.body.style.alignItems = 'flex-start'; 

    const roleText = currentUser.role === 'teacher' ? 'Öğretmen' : 'Öğrenci';
    document.getElementById('user-info-display').innerText = `${formatTitleCase(currentUser.name)} (${roleText})`;

    navigateView('listings'); 
    updateGlobalBadges();
    if (currentUser.role === 'student') bindProfileEvents();
}

// ROUTER (Top Nav Menü Zıplamaları İçin)
function navigateView(viewType) {
    if(!currentUser) return; // Guard clause

    const views = ['listings', 'chat', 'offers', 'profile'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        const btn = document.getElementById(`btn-cat-${v}`);
        if(el) el.style.display = 'none';
        if(btn) btn.classList.remove('active');
    });

    const activeEl = document.getElementById(`view-${viewType}`);
    const activeBtn = document.getElementById(`btn-cat-${viewType}`);
    if(activeEl) activeEl.style.display = 'flex';
    if(activeBtn) activeBtn.classList.add('active');

    // Trigger specific renders
    try {
        if (viewType === 'listings') loadListings();
        if (viewType === 'chat') { 
            loadInbox(); 
            if(!currentChatPartner) {
                document.getElementById('messages-container').innerHTML = `<p class="placeholder-text">Sola bakan Gelen Kutunuzdan mesajlaşmak istediğiniz kişiyi seçin. (Sıfırdan başlamak için İlanlar sayfasını kullanın)</p>`;
                document.getElementById('message-form').style.display = 'none';
                document.getElementById('chat-with-name').innerText = "";
            }
        }
        if (viewType === 'offers') loadProfileOffers();
        if (viewType === 'profile') loadProfile();
        
        updateGlobalBadges();
    } catch(err) {
        console.error("View Render Error:", err);
    }
}

function setSubjectFilter(subject) {
    currentSubjectFilter = subject;
    loadListings(); 
}

// ---------------- ÖĞRENCİ DERS YÖNETİMİ (PROFİL) ----------------
function loadProfile() {
    if (!currentUser) return;

    // Reset sub-view state to 'lessons' by default if first time opening
    const lessonsBtn = document.getElementById('btn-sub-lessons');
    if (lessonsBtn && lessonsBtn.classList.contains('active')) {
        switchProfileSubView('lessons');
    } else {
        switchProfileSubView('account');
    }

    // Teachers don't have 'Ders Ayarları' tab (only students have multiple lessons for now)
    const btnSubLessons = document.getElementById('btn-sub-lessons');
    if (currentUser.role === 'teacher') {
        if (btnSubLessons) btnSubLessons.style.display = 'none';
        switchProfileSubView('account');
    } else {
        if (btnSubLessons) btnSubLessons.style.display = 'block';
    }
}

function switchProfileSubView(subView) {
    const lessonsView = document.getElementById('profile-lessons-view');
    const accountView = document.getElementById('profile-account-view');
    const btnLessons = document.getElementById('btn-sub-lessons');
    const btnAccount = document.getElementById('btn-sub-account');

    if (subView === 'lessons') {
        if (lessonsView) lessonsView.style.display = 'flex';
        if (accountView) accountView.style.display = 'none';
        if (btnLessons) btnLessons.classList.add('active');
        if (btnAccount) btnAccount.classList.remove('active');
        loadStudentLessons(); // Sadece öğrenci derslerini yükle
    } else {
        if (lessonsView) lessonsView.style.display = 'none';
        if (accountView) accountView.style.display = 'block';
        if (btnLessons) btnLessons.classList.remove('active');
        if (btnAccount) btnAccount.classList.add('active');
        loadAccountSettings();
    }
}

function loadStudentLessons() {
    if (currentUser.role !== 'student') return;
    const listEl = document.getElementById('student-lessons-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!currentUser.lessons || currentUser.lessons.length === 0) {
        listEl.innerHTML = '<p class="placeholder-text">Henüz kayıtlı bir dersiniz yok.</p>';
        return;
    }

    currentUser.lessons.forEach(lesson => {
        const item = document.createElement('div');
        item.className = 'card';
        item.style.padding = '15px';
        item.style.flexDirection = 'row';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        
        const isActive = currentActiveLesson === lesson.subject;

        item.innerHTML = `
            <div>
                <div style="font-weight:700; font-size:1.1rem; color:var(--primary)">${lesson.subject}</div>
                <div style="font-size:0.85rem; color:var(--text-muted)">Haftalık: ${lesson.hours} saat</div>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="action-btn" onclick="focusLesson('${lesson.subject}')" style="margin-top:0; border-color:${isActive ? 'var(--primary)' : '#ccc'}; background:${isActive ? 'var(--primary)' : 'white'}; color:${isActive ? 'white' : 'var(--text-muted)'}">
                    ${isActive ? '🔍 Odaklanıldı' : '🔍 Odaklan'}
                </button>
                <button class="action-btn" onclick="deleteLesson('${lesson.id}')" style="margin-top:0; color:#ef4444; border-color:#ef4444;">Sil</button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

function loadAccountSettings() {
    document.getElementById('acc-name').value = currentUser.name;
    document.getElementById('acc-username').value = currentUser.username;
    document.getElementById('acc-password').value = currentUser.password;

    const teacherFields = document.getElementById('acc-teacher-fields');
    if (currentUser.role === 'teacher') {
        teacherFields.style.display = 'block';
        document.getElementById('acc-subject').value = currentUser.subject || '';
        document.getElementById('acc-price').value = currentUser.hourlyRate || '';
    } else {
        teacherFields.style.display = 'none';
    }
}

function updateAccountSettings(e) {
    e.preventDefault();
    const db = getDb();
    const userIndex = db.users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex === -1) return;

    const newName = document.getElementById('acc-name').value;
    const newPass = document.getElementById('acc-password').value;

    db.users[userIndex].name = formatTitleCase(newName);
    db.users[userIndex].password = newPass;

    if (currentUser.role === 'teacher') {
        db.users[userIndex].subject = formatTitleCase(document.getElementById('acc-subject').value);
        db.users[userIndex].hourlyRate = document.getElementById('acc-price').value;
    }

    // Veritabanını ve Mevcut Kullanıcıyı Güncelle
    saveDb(db);
    currentUser = db.users[userIndex];
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // UI Güncelle
    document.getElementById('user-info-display').innerText = `${formatTitleCase(currentUser.name)} (${currentUser.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'})`;
    showToast('Bilgileriniz başarıyla güncellendi.', 'success');
}

function focusLesson(subject) {
    currentActiveLesson = subject;
    currentSubjectFilter = subject; // Otomatik olarak listing filtresini de ayarla
    loadStudentLessons();
    showToast(`"${subject}" dersine odaklanıldı. İlanlar sayfasında bu dersin öğretmenlerini göreceksiniz.`, 'info');
}

function deleteLesson(lessonId) {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz?')) return;
    
    const db = getDb();
    const userInDb = db.users.find(u => u.id === currentUser.id);
    if (userInDb && userInDb.lessons) {
        userInDb.lessons = userInDb.lessons.filter(l => l.id !== lessonId);
        currentUser.lessons = userInDb.lessons;
        saveDb(db);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        loadStudentLessons();
    }
}

// Yeni ders ekleme formu dinleyicisi dashboard yüklendiğinde bağlanmalı
function bindProfileEvents() {
    const addForm = document.getElementById('add-lesson-form');
    if (addForm) {
        addForm.onsubmit = (e) => {
            e.preventDefault();
            const subjectInput = document.getElementById('new-lesson-subject');
            const hoursInput = document.getElementById('new-lesson-hours');
            
            const newLesson = {
                id: Date.now().toString(),
                subject: formatTitleCase(subjectInput.value),
                hours: hoursInput.value
            };

            const db = getDb();
            const userInDb = db.users.find(u => u.id === currentUser.id);
            if (userInDb) {
                if (!userInDb.lessons) userInDb.lessons = [];
                userInDb.lessons.push(newLesson);
                currentUser.lessons = userInDb.lessons;
                
                // Fallback için ilk dersi ana alanlara da yazalım (eğer boşlarsa)
                if (!userInDb.lessonNeeded) {
                    userInDb.lessonNeeded = newLesson.subject;
                    userInDb.weeklyHoursNeeded = newLesson.hours;
                }

                saveDb(db);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                subjectInput.value = '';
                hoursInput.value = '';
                loadStudentLessons();
                showToast('Ders başarıyla eklendi!', 'success');
            }
        };
    }

    const accForm = document.getElementById('account-settings-form');
    if (accForm) {
        accForm.onsubmit = updateAccountSettings;
    }
}

// İLANLAR 
function loadListings() {
    const db = getDb();
    const titleEl = document.getElementById('panel-title');
    const containerEl = document.getElementById('listings-container');
    const filterContainer = document.getElementById('subject-filters');

    if(!titleEl || !containerEl || !filterContainer) return;

    let targetUsers = [];
    
    if (currentUser.role === 'student') {
        titleEl.innerText = 'Tavsiye Edilen Eğitmenler';
        filterContainer.style.display = 'flex';
        
        // Öğrencinin kendi derslerini filtre olarak göster
        let myLessons = currentUser.lessons || [];
        let filterHtml = `<button class="filter-chip ${currentSubjectFilter === 'Tümü' ? 'active' : ''}" onclick="setSubjectFilter('Tümü')">📍 Tümü</button>`;
        
        myLessons.forEach(lesson => {
            const sub = lesson.subject;
            filterHtml += `<button class="filter-chip ${currentSubjectFilter === sub ? 'active' : ''}" onclick="setSubjectFilter('${sub}')">⭐ ${sub}</button>`;
        });
        
        filterContainer.innerHTML = filterHtml;

        let teachers = db.users.filter(u => u.role === 'teacher');
        if (currentSubjectFilter !== 'Tümü') {
            teachers = teachers.filter(t => formatTitleCase(t.subject) === formatTitleCase(currentSubjectFilter));
        }
        targetUsers = teachers;
    } else {
        titleEl.innerText = 'Ders Arayan Öğrenciler';
        filterContainer.style.display = 'flex'; 
        const mySubjectFormatted = formatTitleCase(currentUser.subject);
        let filterHtml = `
            <button class="filter-chip ${currentSubjectFilter === 'Tümü' ? 'active' : ''}" onclick="setSubjectFilter('Tümü')">Tümü</button>
            <button class="filter-chip ${currentSubjectFilter === 'Kendi Branşım' ? 'active' : ''}" onclick="setSubjectFilter('Kendi Branşım')">⭐ Sadece Branşımdakiler (${mySubjectFormatted})</button>
        `;
        filterContainer.innerHTML = filterHtml;

        let students = db.users.filter(u => u.role === 'student');
        if (currentSubjectFilter === 'Kendi Branşım') {
            students = students.filter(s => {
                // Öğrencinin dersleri arasında öğretmenin branşı var mı bak
                const lessons = s.lessons || [];
                return lessons.some(l => formatTitleCase(l.subject) === mySubjectFormatted) || (s.lessonNeeded && formatTitleCase(s.lessonNeeded) === mySubjectFormatted);
            });
        }
        students.sort((a, b) => {
            const aMatch = (a.lessons || []).some(l => formatTitleCase(l.subject) === mySubjectFormatted) || (a.lessonNeeded && formatTitleCase(a.lessonNeeded) === mySubjectFormatted);
            const bMatch = (b.lessons || []).some(l => formatTitleCase(l.subject) === mySubjectFormatted) || (b.lessonNeeded && formatTitleCase(b.lessonNeeded) === mySubjectFormatted);
            return aMatch === bMatch ? 0 : aMatch ? -1 : 1; 
        });
        targetUsers = students;
    }
        
    containerEl.innerHTML = '';
    
    if (targetUsers.length === 0) {
        if(currentSubjectFilter !== 'Tümü') {
            containerEl.innerHTML = `<p class="placeholder-text" style="grid-column: 1 / -1;">Bu kriterlere uygun kişi bulunamadı.</p>`;
        } else {
            containerEl.innerHTML = `
                <div class="placeholder-text" style="grid-column: 1 / -1;">
                    Şu an sistemde kayıtlı profil yok.<br><br>
                </div>`;
        }
        return;
    }

    targetUsers.forEach(user => {
        const dbName = formatTitleCase(user.name);
        const dbSubject = user.subject ? formatTitleCase(user.subject) : '';
        const dbLesson = user.lessonNeeded ? formatTitleCase(user.lessonNeeded) : '';
        const mySubjectFormatted = currentUser.subject ? formatTitleCase(currentUser.subject) : '';

        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.userId = user.id; 
        
        let isMatch = false;
        if (currentUser.role === 'teacher' && dbLesson && dbLesson === mySubjectFormatted) {
            isMatch = true; card.classList.add('card-matched'); 
        }

        let details = '';
        if (user.role === 'teacher') {
            details = `
                <div class="card-info">📖 Branş: <strong>${dbSubject}</strong></div>
                <div class="card-info">💵 Saat Ücreti: <strong>${user.hourlyRate}₺</strong></div>
                <div class="card-info">⏱ Müsaitlik: <strong>${user.weeklyHours}</strong></div>`;
        } else {
            details = `
                <div class="card-info">📚 İhtiyacı Olan Ders: <strong>${dbLesson}</strong></div>
                <div class="card-info">⏱ Bütçe/İstenen: <strong>${user.weeklyHoursNeeded} saat</strong></div>`;
        }

        let offerBtnHtml = '';
        if (currentUser.role === 'student' && user.role === 'teacher') {
            offerBtnHtml = `<button class="action-btn offer-btn" onclick="openOfferModal('${user.id}')">Teklif Ver</button>`;
        }

        card.innerHTML = `
            ${isMatch ? `<div class="match-badge">⭐ Eşleşti</div>` : ''}
            <div class="card-title">${dbName}</div>
            ${details}
            <div style="display:flex; margin-top:10px;">
                <button class="action-btn" onclick="startChat('${user.id}', '${dbName}', true)">Mesaja Git</button>
                ${offerBtnHtml}
            </div>
        `;
        containerEl.appendChild(card);
    });
}

function updateGlobalBadges() {
    if (!currentUser) return;
    const db = getDb();
    if (!db.messages) return;

    const globalUnread = db.messages.filter(m => m.receiverId === currentUser.id && !m.read).length;
    const badgeEl = document.getElementById('nav-chat-badge');
    if(!badgeEl) return;
    
    if (globalUnread > 0) {
        badgeEl.style.display = 'inline-block';
        badgeEl.innerText = globalUnread;
    } else {
        badgeEl.style.display = 'none';
    }
}

// INBOX (GELEN KUTUSU SİSTEMİ)
function loadInbox() {
    const db = getDb();
    const myInteractions = new Set();
    
    // Geçmiş mesajlaşılan eşsiz kullanıcıları bul
    if(db.messages) {
        db.messages.forEach(m => {
            if (m.senderId === currentUser.id) myInteractions.add(m.receiverId);
            if (m.receiverId === currentUser.id) myInteractions.add(m.senderId);
        });
    }

    const inboxListEl = document.getElementById('inbox-list');
    if(!inboxListEl) return;
    
    inboxListEl.innerHTML = '';

    if (myInteractions.size === 0) {
        inboxListEl.innerHTML = `<p class="placeholder-text" style="font-size:0.85rem">Kutunuz boş. Ana ekrandan ilana giderek başlatın.</p>`;
        return;
    }

    myInteractions.forEach(partnerId => {
        const partner = db.users.find(u => u.id === partnerId);
        if (!partner) return;

        const unreadCount = db.messages.filter(m => m.receiverId === currentUser.id && m.senderId === partnerId && !m.read).length;
        const badgeHTML = unreadCount > 0 ? `<span class="badge-mini" style="background:#ef4444">${unreadCount}</span>` : '';

        const item = document.createElement('div');
        item.className = 'inbox-item';
        if (currentChatPartner && currentChatPartner.id === partnerId) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="inbox-name">${formatTitleCase(partner.name)}</div>
            ${badgeHTML}
        `;
        
        item.onclick = () => {
            startChat(partnerId, partner.name, false); 
        };
        inboxListEl.appendChild(item);
    });
}


// SOHBET BAŞLATMA VE YÖNETME
function startChat(partnerId, partnerName, proceedNavigation = true) {
    if(proceedNavigation) {
        navigateView('chat'); 
    }
    
    currentChatPartner = { id: partnerId, name: partnerName };
    document.getElementById('chat-with-name').innerText = ` - ${formatTitleCase(partnerName)}`;
    document.getElementById('message-form').style.display = 'flex';
    
    const container = document.getElementById('messages-container');
    container.style.opacity = '0';
    setTimeout(() => {
        loadMessages(); 
        loadInbox(); // Highlight and badges refresh
        updateGlobalBadges();
        container.style.opacity = '1';
    }, 200);
}

function loadMessages() {
    if (!currentChatPartner) return;
    const db = getDb();
    const container = document.getElementById('messages-container');
    
    const messages = db.messages.filter(m => 
        (m.senderId === currentUser.id && m.receiverId === currentChatPartner.id) || 
        (m.senderId === currentChatPartner.id && m.receiverId === currentUser.id)
    );

    let hasMarkedRead = false;
    messages.forEach(m => {
        if (m.receiverId === currentUser.id && m.senderId === currentChatPartner.id && !m.read) {
            m.read = true; hasMarkedRead = true;
        }
    });    
    if (hasMarkedRead) saveDb(db);

    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = `<p class="placeholder-text">Mesaj Yok! <strong>${formatTitleCase(currentChatPartner.name)}</strong> ile hemen görüşmeye başlayın.</p>`;
        return;
    }

    messages.forEach(msg => {
        const el = document.createElement('div');
        el.className = `message-bubble ${msg.senderId === currentUser.id ? 'message-sent' : 'message-received'}`;
        el.innerText = msg.text;
        container.appendChild(el);
    });
    container.scrollTop = container.scrollHeight;
}

let msgForm = document.getElementById('message-form');
if (msgForm) {
    msgForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentChatPartner) return;
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        if (!text) return;

        const db = getDb();
        db.messages.push({
            id: Date.now().toString(), senderId: currentUser.id, receiverId: currentChatPartner.id, text: text, timestamp: new Date().toISOString(), read: false 
        });
        saveDb(db);
        input.value = '';
        loadMessages();
        loadInbox();
    });
}

// -------------- TEKLİF SİSTEMİ -------------------
function openOfferModal(teacherId) {
    document.getElementById('offer-target-id').value = teacherId;
    document.getElementById('offer-amount').value = '';
    document.getElementById('offer-modal').style.display = 'flex';
}
function closeOfferModal() {
    document.getElementById('offer-modal').style.display = 'none';
}

let offerForm = document.getElementById('offer-form');
if (offerForm) {
    offerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teacherId = document.getElementById('offer-target-id').value;
        const amount = document.getElementById('offer-amount').value;
        const db = getDb();
        
        db.offers.push({ id: Date.now().toString(), studentId: currentUser.id, teacherId: teacherId, proposedPrice: amount, status: 'pending', timestamp: new Date().toISOString()});
        saveDb(db);
        showToast('Teklifiniz başarıyla gönderildi!', 'success');
        closeOfferModal();
    });
}

function loadProfileOffers() {
    const db = getDb();
    const container = document.getElementById('offers-container');
    if(!container) return;
    container.innerHTML = '';

    let myOffers = [];
    if (currentUser.role === 'teacher') {
        document.getElementById('offer-panel-title').innerText = "Gelen İstekler";
        myOffers = db.offers.filter(o => o.teacherId === currentUser.id).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    } else {
        // Öğrencinin Talebi Doğrultusunda Başlık Güncellendi:
        document.getElementById('offer-panel-title').innerText = "Teklifime Verilen Yanıtlar";
        myOffers = db.offers.filter(o => o.studentId === currentUser.id).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    }

    if (myOffers.length === 0) {
        container.innerHTML = `<p class="placeholder-text" style="grid-column: 1 / -1;">Kayıt bulunmuyor.</p>`;
        return;
    }

    myOffers.forEach(o => {
        const partnerId = currentUser.role === 'teacher' ? o.studentId : o.teacherId;
        const partner = db.users.find(u => u.id === partnerId);
        if (!partner) return;

        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'default';

        let statusText = o.status === 'pending' ? 'Bekliyor' : o.status === 'accepted' ? 'Onaylandı' : 'Reddedildi';
        let statusClass = o.status === 'pending' ? 'status-pending' : o.status === 'accepted' ? 'status-accepted' : 'status-rejected';

        let actionHtml = '';
        if (currentUser.role === 'teacher' && o.status === 'pending') {
            actionHtml = `
                <div class="offer-actions" style="margin-top:15px; margin-bottom:5px;">
                    <button class="btn-reject" onclick="respondOffer('${o.id}', 'rejected')">Reddet</button>
                    <button class="btn-accept" onclick="respondOffer('${o.id}', 'accepted')">Onayla</button>
                </div>`;
        } else if (o.status === 'accepted') {
            actionHtml = `<button class="action-btn" style="margin-top:15px;" onclick="startChat('${partnerId}', '${partner.name}', true)">Sohbete Git</button>`;
        }

        card.innerHTML = `
            <div class="card-title" style="font-size: 1.2rem;">${currentUser.role === 'teacher' ? 'Öğrenci:' : 'Öğretmen:'} ${formatTitleCase(partner.name)}</div>
            <div class="card-info" style="margin-top:5px;">Önerilen Bütçe: <strong style="font-size:1.1rem;">${o.proposedPrice} ₺</strong> / Saat</div>
            <div><span class="status-badge ${statusClass}">${statusText}</span></div>
            ${actionHtml}
        `;
        container.appendChild(card);
    });
}

function respondOffer(offerId, newStatus) {
    const db = getDb();
    const offer = db.offers.find(o => o.id === offerId);
    if (!offer) return;
    offer.status = newStatus;

    if (newStatus === 'accepted') {
        if(!db.messages) db.messages = [];
        db.messages.push({
            id: Date.now().toString(), senderId: offer.teacherId, receiverId: offer.studentId,
            text: `🎯 MERHABA! ${offer.proposedPrice} ₺ / Saat bütçesi üzerinden sunduğunuz teklifi ONAYLADIM.`,
            timestamp: new Date().toISOString(), read: false
        });
        alert('Teklif Onaylandı! Otomatik mesaj gönderildi.');
    }
    saveDb(db);
    loadProfileOffers(); 
}

// Canlı Veri Akışı
setInterval(() => {
    if(!currentUser) return;
    
    const chatView = document.getElementById('view-chat');
    if (chatView && chatView.style.display === 'flex') {
        loadInbox();
        if (currentChatPartner) {
            const db = getDb();
            if(db.messages) {
                const unreadExist = db.messages.some(m => m.receiverId === currentUser.id && m.senderId === currentChatPartner.id && !m.read);
                if(unreadExist) loadMessages(); 
            }
        }
    }
    updateGlobalBadges(); 
}, 2000);

function updateGlobalBadges() {
    if (!currentUser) return;
    const db = getDb();
    
    // Mesaj Sayısı Badge
    const unreadMessages = (db.messages || []).filter(m => m.receiverId === currentUser.id && !m.read).length;
    const badge = document.getElementById('nav-chat-badge');
    if (badge) {
        if (unreadMessages > 0) {
            badge.innerText = unreadMessages;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Teklif Sayısı Badge (Canlı Pulse)
    const pendingOffers = (db.offers || []).filter(o => o.receiverId === currentUser.id && o.status === 'pending').length;
    const btnOffers = document.getElementById('btn-cat-offers');
    if (btnOffers) {
        // Eski badge'i kaldır
        const oldBadge = btnOffers.querySelector('.pulse-badge');
        if (oldBadge) oldBadge.remove();

        if (pendingOffers > 0) {
            const pulse = document.createElement('span');
            pulse.className = 'pulse-badge';
            btnOffers.style.position = 'relative'; // Emin olmak için
            btnOffers.appendChild(pulse);
        }
    }
}

// --- LANDING PAGE ETKİLEŞİMLERİ ---
function toggleFaq(el) {
    const item = el.parentElement;
    item.classList.toggle('active');
}

// Menü linkleri için smooth scroll
document.querySelectorAll('.top-nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
// --- MODERN TOAST BİLDİRİM SİSTEMİ ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    // 4 saniye sonra kaldır
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- PREMIUM SCROLL REVEAL ANIMASYONU ---
document.addEventListener('DOMContentLoaded', () => {
    const revealElements = [
        '.section-header', 
        '.step-card', 
        '.campaign-card', 
        '.feature-text', 
        '.feature-img', 
        '.testi-card', 
        '.faq-item',
        '.landing-content'
    ];

    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                // observer.unobserve(entry.target); // Animasyonun her seferinde çalışması için bu satırı yorumda bırakıyoruz
            }
        });
    }, observerOptions);

    revealElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add('reveal');
            revealObserver.observe(el);
        });
    });

    // Ana görsel için hafif mouse parallax etkisi
    const heroImg = document.querySelector('.hero-image');
    if (heroImg) {
        document.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth / 2 - e.pageX) / 50;
            const y = (window.innerHeight / 2 - e.pageY) / 50;
            heroImg.style.transform = `translate(${x}px, ${y}px) scale(1.02)`;
        });
    }
});
