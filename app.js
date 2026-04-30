// Configuración de Google Sheets
const SHEET_ID = '1-IvHq5EtHb_B-jd1IknuOv0twCpiaa6G8wlqiIdaEkQ';
const API_KEY = 'AIzaSyAF6ZLnTBWyLmXN2o3Z-Hjgt1xcx_QKCfs';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyuxbTHJ49-gLW03TmFZ6C3sqaxphUDdQjgxB2ZpcL2nr4TDY1fdk7hPwdOLuBklc8ENg/exec';
const RANGE_CITAS = 'Citas!A:J';
const RANGE_USUARIOS = 'Usuarios!A:F';

// Estado de la aplicación
let currentUser = null;
let allBookings = JSON.parse(localStorage.getItem('bookings')) || [];

// Estado del wizard
let wizardState = {
    step: 1,
    service: null,
    serviceLabel: null,
    date: null,
    dateLabel: null,
    time: null,
    notes: ''
};

// Servicios con precios y duración
const SERVICES = {
    corte: { label: 'Corte de cabello', price: '$12.000', duration: '45 min' },
    claritos: { label: 'Claritos', price: '$20.000', duration: '60 min' },
    global: { label: 'Global', price: '$20.000', duration: '60 min' }
};

// Google OAuth
const GOOGLE_CLIENT_ID = '344608296288-c5cq6cph8hokiutucm3pd2lrgc3reqtm.apps.googleusercontent.com';

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    document.getElementById('completeProfileForm').addEventListener('submit', handleCompleteProfile);
    // Esperar a que Google cargue
    if (typeof google !== 'undefined') {
        initializeGoogleLogin();
    } else {
        window.addEventListener('load', () => setTimeout(initializeGoogleLogin, 300));
    }
});

function initializeGoogleLogin() {
    if (GOOGLE_CLIENT_ID === 'TU_GOOGLE_CLIENT_ID_AQUI') {
        console.log('Google Client ID no configurado');
        return;
    }

    if (typeof google === 'undefined') {
        setTimeout(initializeGoogleLogin, 500);
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin
    });

    google.accounts.id.renderButton(
        document.getElementById('google-login-button'),
        { theme: 'outline', size: 'large', width: '100%' }
    );
}

// Verificar autenticación
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
        currentUser = user;
        showScreen('clientScreen');
        displayUser();
        renderWizardStep1();
        updateWizardUI();
    } else {
        showScreen('loginScreen');
    }
}

// Toggle entre login y registro
// Handle complete profile form
async function handleCompleteProfile(e) {
    e.preventDefault();
    const name = document.getElementById('profileName').value.trim();
    const lastname = document.getElementById('profileLastname').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();

    if (!name || !lastname || !phone) {
        alert('Por favor completa todos los campos');
        return;
    }

    if (window.pendingGoogleUser) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const newUser = {
            ...window.pendingGoogleUser,
            name,
            lastname,
            phone,
            id: Date.now(),
            role: 'client'
        };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        currentUser = { name, lastname, phone, email: newUser.email, id: newUser.id, googleId: newUser.googleId, role: 'client' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        document.getElementById('completeProfileForm').reset();
        document.getElementById('completeProfileForm').classList.add('hidden');
        window.pendingGoogleUser = null;

        showScreen('clientScreen');
        displayUser();
        wizardState = { step: 1, service: null, serviceLabel: null, date: null, dateLabel: null, time: null, notes: '' };
        renderWizardStep1();
        updateWizardUI();
    }
}

// Handle Login (DEPRECATED - kept for compatibility)
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('loginError');

    if (!email || !password) {
        errorDiv.textContent = 'Por favor completa todos los campos';
        return;
    }

    // Primero intenta con localStorage
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let user = users.find(u => u.email.toLowerCase() === email);

    // Si no encuentra en localStorage, intenta cargar de Google Sheets
    // if (!user) {
    //     const sheetUsers = await loadUsersFromGoogleSheet();
    //     if (sheetUsers) {
    //         users = sheetUsers;
    //         localStorage.setItem('users', JSON.stringify(users));
    //         user = users.find(u => u.email.toLowerCase() === email);
    //     }
    // }

    if (user) {
        let passwordMatch = false;

        console.log('Usuario encontrado:', user.email);
        console.log('Contraseña guardada:', user.password.substring(0, 20));
        console.log('Contraseña ingresada:', password);

        // Comprobar si es contraseña hasheada (comienza con $2a$ o $2b$ o $2y$)
        if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$'))) {
            passwordMatch = await bcrypt.compare(password, user.password);
            console.log('Comparando con bcrypt:', passwordMatch);
        } else {
            // Contraseña antigua sin hashear (compatibilidad)
            passwordMatch = user.password === password;
            console.log('Comparando texto plano:', passwordMatch);

            // Si coincide, rehashear y actualizar
            if (passwordMatch) {
                const hashedPassword = await bcrypt.hash(password, 10);
                user.password = hashedPassword;
                users[users.findIndex(u => u.email.toLowerCase() === email)] = user;
                localStorage.setItem('users', JSON.stringify(users));
                // sendUserToGoogleSheet(user);
                console.log('Contraseña actualizada a bcrypt');
            }
        }

        if (passwordMatch) {
            currentUser = { name: user.name, lastname: user.lastname, phone: user.phone, email: user.email, id: user.id, role: 'client' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showScreen('clientScreen');
            displayUser();
            loadClientBookings();
            renderWizardStep1();
            errorDiv.textContent = '';
        } else {
            errorDiv.textContent = 'Email o contraseña incorrectos';
        }
    } else {
        console.log('Usuario no encontrado. Email:', email);
        console.log('Usuarios disponibles:', users.map(u => u.email));
        errorDiv.textContent = 'Email o contraseña incorrectos';
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const lastname = document.getElementById('regLastname').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    const errorDiv = document.getElementById('loginError');

    // Validar campos vacíos
    if (!name || !lastname || !phone || !email || !password || !passwordConfirm) {
        errorDiv.textContent = 'Por favor completa todos los campos';
        return;
    }

    if (password !== passwordConfirm) {
        errorDiv.textContent = 'Las contraseñas no coinciden';
        return;
    }

    if (password.length < 4) {
        errorDiv.textContent = 'La contraseña debe tener al menos 4 caracteres';
        return;
    }

    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.find(u => u.email.toLowerCase() === email)) {
        errorDiv.textContent = 'El email ya está registrado';
        return;
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = { name, lastname, phone, email, password: hashedPassword, id: Date.now(), role: 'client' };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    sendUserToGoogleSheet(newUser);

    currentUser = { name, lastname, phone, email, id: newUser.id, role: 'client' };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    document.getElementById('registerForm').reset();
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';

    showScreen('clientScreen');
    displayUser();
    wizardState = { step: 1, service: null, serviceLabel: null, date: null, dateLabel: null, time: null, notes: '' };
    renderWizardStep1();
    updateWizardUI();
}

// Display user info
function displayUser() {
    const display = document.getElementById('userDisplay');
    if (currentUser) {
        display.textContent = `${currentUser.name} ${currentUser.lastname}`;
    }
}

// ======== SWIPE WIZARD ========
(function() {
    let startX = 0;
    let dragging = false;

    // Touch (mobile)
    let startY = 0;
    let ignoreSwipe = false;
    document.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        ignoreSwipe = !!e.target.closest('#daysScroll, .time-grid, input, button, select, textarea');
    }, { passive: true });
    document.addEventListener('touchend', e => {
        if (ignoreSwipe) return;
        const diffX = startX - e.changedTouches[0].clientX;
        const diffY = startY - e.changedTouches[0].clientY;
        if (Math.abs(diffX) < 80) return;
        if (Math.abs(diffY) > Math.abs(diffX)) return;
        if (diffX > 0) goToStep(wizardState.step + 1);
        else goToStep(wizardState.step - 1);
    }, { passive: true });

})();

// ======== WIZARD FUNCTIONS ========

function goToStep(stepNum) {
    if (stepNum === 2 && !wizardState.service) {
        alert('Selecciona un servicio');
        return;
    }
    if (stepNum === 3 && !wizardState.date) {
        alert('Selecciona un día');
        return;
    }
    if (stepNum === 4 && !wizardState.time) {
        alert('Selecciona una hora');
        return;
    }

    wizardState.step = stepNum;
    updateWizardUI();

    if (stepNum === 2) renderWizardStep2();
    if (stepNum === 3) renderWizardStep3();
    if (stepNum === 4) renderWizardStep4();
}

function updateWizardUI() {
    const steps = document.querySelectorAll('.wizard-step');
    steps.forEach(step => step.classList.add('hidden'));
    document.getElementById(`step${wizardState.step}`).classList.remove('hidden');

    const progress = (wizardState.step / 4) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = `Paso ${wizardState.step} de 4`;
}

// STEP 1: Servicios
function renderWizardStep1() {
    const grid = document.getElementById('servicesGrid');
    grid.innerHTML = Object.entries(SERVICES).map(([key, service]) => `
        <div class="service-card ${wizardState.service === key ? 'selected' : ''}" onclick="selectService('${key}', '${service.label}')">
            <h3>${service.label}</h3>
            <p class="service-price">${service.price}</p>
            <p class="service-duration">${service.duration}</p>
        </div>
    `).join('');
}

function selectService(key, label) {
    wizardState.service = key;
    wizardState.serviceLabel = label;
    renderWizardStep1();
}

// STEP 2: Días
function renderWizardStep2() {
    const scroll = document.getElementById('daysScroll');
    const today = new Date();
    const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    let html = '';
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        const dayOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getDay();
        const dayLabel = dayNames[dayOfWeek];
        const dayNum = date.getDate();
        const monthStr = months[date.getMonth()];
        const hasAvailability = generateAvailableHours(dayOfWeek, dateStr).length > 0;

        if (!hasAvailability) continue;

        const isToday = i === 0;
        const selected = wizardState.date === dateStr ? 'selected' : '';

        html += `
            <button type="button" class="day-button ${selected}" onclick="selectDay('${dateStr}', '${isToday ? 'Hoy' : dayLabel} ${dayNum} ${monthStr}')" ${!hasAvailability ? 'disabled' : ''}>
                <span class="day-label">${isToday ? 'Hoy' : dayLabel}</span>
                <span class="day-number">${dayNum}</span>
            </button>
        `;
    }
    scroll.innerHTML = html;
}

function selectDay(dateStr, label) {
    wizardState.date = dateStr;
    wizardState.dateLabel = label;
    renderWizardStep2();
}

// STEP 3: Horarios
function renderWizardStep3() {
    const grid = document.getElementById('timesGrid');
    const [y,m,d] = wizardState.date.split('-').map(Number);
    const dayOfWeek = new Date(y, m-1, d).getDay();
    const hours = generateAvailableHours(dayOfWeek, wizardState.date);

    grid.innerHTML = hours.map(hour => `
        <button type="button" class="time-button ${wizardState.time === hour ? 'selected' : ''}" onclick="selectTime('${hour}')">
            ${hour}
        </button>
    `).join('');
}

function selectTime(time) {
    wizardState.time = time;
    renderWizardStep3();
}

// STEP 4: Confirmación
function renderWizardStep4() {
    document.getElementById('confirmService').textContent = wizardState.serviceLabel;
    document.getElementById('confirmDate').textContent = wizardState.dateLabel;
    document.getElementById('confirmTime').textContent = wizardState.time;
}

function confirmBooking() {
    const notesEl = document.getElementById('notes');
    const notes = notesEl ? notesEl.value : '';
    const errorDiv = document.getElementById('bookingError');

    const booking = {
        id: Date.now(),
        userId: currentUser.id,
        name: currentUser.name,
        lastname: currentUser.lastname,
        phone: currentUser.phone,
        email: currentUser.email,
        service: wizardState.service,
        date: wizardState.date,
        time: wizardState.time,
        notes,
        status: 'confirmada',
        createdAt: new Date().toISOString()
    };

    allBookings.push(booking);
    localStorage.setItem('bookings', JSON.stringify(allBookings));

    sendToGoogleSheet(booking);

    // Reset wizard
    wizardState = { step: 1, service: null, serviceLabel: null, date: null, dateLabel: null, time: null, notes: '' };
    if (document.getElementById('notes')) document.getElementById('notes').value = '';

    // Success message
    const successDiv = document.getElementById('bookingSuccess');
    successDiv.textContent = '✓ ¡Turno confirmado!';
    successDiv.classList.remove('hidden');
    errorDiv.textContent = '';

    loadClientBookings();
    renderWizardStep1();
    goToStep(1);

    setTimeout(() => {
        successDiv.classList.add('hidden');
    }, 3000);
}

// Google Sheets - Guardar citas
async function sendToGoogleSheet(booking) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                type: 'cita',
                nombre: booking.name,
                apellido: booking.lastname,
                telefono: booking.phone,
                email: booking.email,
                servicio: SERVICES[booking.service]?.label || booking.service,
                fecha: booking.date,
                hora: booking.time,
                notas: booking.notes || ''
            })
        });
    } catch (error) {
        console.error('Error Google Sheets:', error);
    }
}

// Google Sheets - Guardar usuario
async function sendUserToGoogleSheet(user) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                type: 'usuario',
                nombre: user.name,
                apellido: user.lastname,
                email: user.email,
                telefono: user.phone
            })
        });
    } catch (error) {
        console.error('Error guardando usuario:', error);
    }
}

// Google Sheets - Cargar usuarios
async function loadUsersFromGoogleSheet() {
    if (!SHEET_ID || SHEET_ID === 'TU_SHEET_ID_AQUI' || !API_KEY || API_KEY === 'TU_API_KEY_AQUI') {
        console.log('Google Sheets no configurado.');
        return null;
    }

    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE_USUARIOS}?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.values || data.values.length === 0) {
            return null;
        }

        // Convertir filas de Google Sheets a objetos usuario
        const users = data.values.slice(1).map((row, idx) => ({
            name: row[0] || '',
            lastname: row[1] || '',
            email: row[2] || '',
            phone: row[3] || '',
            password: row[4] || '',
            id: idx,
            role: 'client'
        }));

        return users;
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        return null;
    }
}

// Load client bookings
function loadClientBookings() {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;
    const userBookings = allBookings.filter(b => b.userId === currentUser.id);

    if (userBookings.length === 0) {
        bookingsList.innerHTML = '<p class="empty-state">No tienes citas agendadas</p>';
        return;
    }

    bookingsList.innerHTML = userBookings
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
        .map(booking => `
        <div class="booking-card">
            <h4>${SERVICES[booking.service].label}</h4>
            <p><strong>Fecha:</strong> ${formatDate(booking.date)}</p>
            <p><strong>Hora:</strong> ${booking.time}</p>
            ${booking.notes ? `<p><strong>Notas:</strong> ${booking.notes}</p>` : ''}
            <button onclick="cancelBooking(${booking.id})" class="btn-secondary" style="margin-top: 10px; width: auto;">Cancelar</button>
        </div>
    `).join('');
}

function cancelBooking(id) {
    if (confirm('¿Cancelar esta cita?')) {
        allBookings = allBookings.filter(b => b.id !== id);
        localStorage.setItem('bookings', JSON.stringify(allBookings));
        loadClientBookings();
    }
}

// Availability
function generateAvailableHours(dayOfWeek, dateStr) {
    const availability = getDefaultAvailability();
    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dayOfWeek];
    const dayData = availability[dayName];

    if (!dayData || !dayData.available) return [];

    const hours = [];
    const [startH, startM] = dayData.start.split(':');
    const [endH, endM] = dayData.end.split(':');

    let current = parseInt(startH) * 60 + parseInt(startM);
    const end = parseInt(endH) * 60 + parseInt(endM);
    const duration = 30;

    while (current + duration <= end) {
        const hour = String(Math.floor(current / 60)).padStart(2, '0');
        const min = String(current % 60).padStart(2, '0');
        const timeStr = `${hour}:${min}`;

        const isBooked = allBookings.some(b =>
            b.date === dateStr && b.time === timeStr && b.status !== 'cancelada'
        );

        if (!isBooked) hours.push(timeStr);
        current += duration;
    }

    return hours;
}

function getDefaultAvailability() {
    return {
        lunes: { available: true, start: '09:00', end: '19:00' },
        martes: { available: true, start: '09:00', end: '19:00' },
        miércoles: { available: true, start: '09:00', end: '19:00' },
        jueves: { available: true, start: '09:00', end: '19:00' },
        viernes: { available: true, start: '09:00', end: '19:00' },
        sábado: { available: true, start: '10:00', end: '14:00' },
        domingo: { available: false, start: '00:00', end: '00:00' }
    };
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Show screen
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });

    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.classList.add('active');
        if (screenId === 'loginScreen') {
            activeScreen.style.display = 'flex';
        } else {
            activeScreen.style.display = 'block';
        }
    }
}

// Google Login Handler
function handleGoogleLogin(response) {
    const token = response.credential;

    // Decodificar JWT manualmente
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const userData = JSON.parse(jsonPayload);
    console.log('Google login:', userData);

    // Crear o actualizar usuario
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let user = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());

    if (!user) {
        // Nuevo usuario - pedir nombre, apellido y teléfono
        window.pendingGoogleUser = {
            email: userData.email,
            googleId: userData.sub
        };

        document.getElementById('profileName').value = userData.given_name || '';
        document.getElementById('profileLastname').value = userData.family_name || '';
        document.getElementById('profilePhone').value = '';

        document.getElementById('completeProfileForm').classList.remove('hidden');
        return;
    }

    // Usuario existente, actualizar Google ID
    if (!user.googleId) {
        user.googleId = userData.sub;
        users[users.findIndex(u => u.email.toLowerCase() === userData.email.toLowerCase())] = user;
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Login
    currentUser = {
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        id: user.id,
        role: 'client',
        googleId: user.googleId
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    showScreen('clientScreen');
    displayUser();
    loadClientBookings();
    renderWizardStep1();
    updateWizardUI();
}

// Logout
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    wizardState = { step: 1, service: null, serviceLabel: null, date: null, dateLabel: null, time: null, notes: '' };
    showScreen('loginScreen');

    const profileForm = document.getElementById('completeProfileForm');
    if (profileForm) { profileForm.reset(); profileForm.classList.add('hidden'); }

    if (typeof google !== 'undefined') {
        google.accounts.id.disableAutoSelect();
    }
}
