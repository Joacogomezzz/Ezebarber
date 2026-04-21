// Configuración de Google Sheets
const SHEET_ID = 'TU_SHEET_ID_AQUI';
const API_KEY = 'TU_API_KEY_AQUI';
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
    corte: { label: 'Corte de cabello', price: '$30', duration: '45 min' },
    barba: { label: 'Arreglo de barba', price: '$20', duration: '30 min' },
    completo: { label: 'Corte + Barba', price: '$45', duration: '60 min' },
    tinte: { label: 'Tinte', price: '$35', duration: '45 min' }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
});

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
function toggleForm(e) {
    e.preventDefault();
    document.getElementById('loginForm').classList.toggle('hidden');
    document.getElementById('registerForm').classList.toggle('hidden');
    document.getElementById('loginError').textContent = '';
}

// Handle Login
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
    let user = users.find(u => u.email.toLowerCase() === email && u.password === password);

    // Si no encuentra en localStorage, intenta cargar de Google Sheets
    if (!user) {
        const sheetUsers = await loadUsersFromGoogleSheet();
        if (sheetUsers) {
            users = sheetUsers;
            localStorage.setItem('users', JSON.stringify(users));
            user = users.find(u => u.email.toLowerCase() === email && u.password === password);
        }
    }

    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showScreen('clientScreen');
        displayUser();
        loadClientBookings();
        renderWizardStep1();
        errorDiv.textContent = '';
    } else {
        errorDiv.textContent = 'Email o contraseña incorrectos';
    }
}

// Handle Register
function handleRegister(e) {
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

    const newUser = { name, lastname, phone, email, password, id: Date.now(), role: 'client' };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    // Guardar en Google Sheets
    sendUserToGoogleSheet(newUser);

    currentUser = newUser;
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
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
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
    const dayOfWeek = new Date(wizardState.date).getDay();
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
    const notes = document.getElementById('notes').value;
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
    document.getElementById('notes').value = '';

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
    if (!SHEET_ID || SHEET_ID === 'TU_SHEET_ID_AQUI' || !API_KEY || API_KEY === 'TU_API_KEY_AQUI') {
        console.log('Google Sheets no configurado.');
        return;
    }

    const values = [[
        booking.name,
        booking.lastname,
        booking.phone,
        booking.email,
        booking.service,
        booking.date,
        booking.time,
        booking.notes || '',
        'pendiente',
        new Date().toLocaleString('es-ES')
    ]];

    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE_CITAS}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values })
        });
    } catch (error) {
        console.error('Error Google Sheets:', error);
    }
}

// Google Sheets - Guardar usuario
async function sendUserToGoogleSheet(user) {
    if (!SHEET_ID || SHEET_ID === 'TU_SHEET_ID_AQUI' || !API_KEY || API_KEY === 'TU_API_KEY_AQUI') {
        console.log('Google Sheets no configurado.');
        return;
    }

    const values = [[
        user.name,
        user.lastname,
        user.email,
        user.phone,
        user.password,
        new Date().toLocaleString('es-ES')
    ]];

    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE_USUARIOS}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values })
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

// Logout
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    wizardState = { step: 1, service: null, serviceLabel: null, date: null, dateLabel: null, time: null, notes: '' };
    showScreen('loginScreen');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}
