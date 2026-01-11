/* --- THE JOURNEY: IMPROVED LOGIC --- */

// 1. CONFIGURATION
const ACCESS_PASSWORD = "2026"; 
const START_DATE = new Date(2025, 9, 1); 
const END_DATE = new Date(2026, 11, 31); 
const INTERVAL_DAYS = 15;

// SVG Assets
const LOCKED_SVG = `<svg class="lock-icon" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm9 13H6v-8h12v8z"/></svg>`;
const UNLOCKED_SVG = `<svg class="lock-icon" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-7V7c0-1.654 1.346-3 3-3s3 1.346 3 3v1h2V7c0-2.757-2.243-5-5-5zM6 12h12v8H6v-8z"/></svg>`;

// 2. PARTICLE ENGINE
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function initParticles() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];
    const colors = ['#f18d5e', '#b06085', '#051937', '#ffcc99'];
    
    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            opacity: Math.random() * 0.2 + 0.03
        });
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
    });
    requestAnimationFrame(animateParticles);
}

// 3. ENTER KEY LISTENER
document.getElementById('password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkPassword();
    }
});

// 4. APP ENGINE
function checkPassword() {
    const input = document.getElementById('password-input').value;
    if (input === ACCESS_PASSWORD) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        generateGrid();
    } else {
        const error = document.getElementById('error-msg');
        error.innerText = "Incorrect Code. Access Denied.";
        setTimeout(() => error.innerText = "", 3000);
    }
}

function generateGrid() {
    const grid = document.getElementById('calendar-grid');
    const today = new Date(); 
    let current = new Date(START_DATE);
    let unlockedCount = 0;
    let totalCount = 0;
    let staggerDelay = 0;

    grid.innerHTML = "";

    while (current <= END_DATE) {
        const boxDate = new Date(current);
        const isPast = today >= boxDate;
        if (isPast) unlockedCount++;
        totalCount++;

        const box = document.createElement('div');
        box.className = `box ${isPast ? 'available' : 'locked'}`;
        
        // Add staggered animation delay
        box.style.animationDelay = `${staggerDelay}s`;
        staggerDelay += 0.05;

        const dateStr = boxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        box.innerHTML = `
            ${isPast ? UNLOCKED_SVG : LOCKED_SVG}
            <div class="date-label">${dateStr}</div>
        `;

        if (isPast) {
            box.onclick = () => openModal(dateStr);
        }

        grid.appendChild(box);
        current.setDate(current.getDate() + INTERVAL_DAYS); 
    }
    document.getElementById('status-pill').innerText = `${unlockedCount} / ${totalCount} Milestones Unlocked`;
}

function openModal(date) {
    const modal = document.getElementById('content-modal');
    document.getElementById('modal-body').innerHTML = `
        <h2 style="color:var(--deep-navy); margin-bottom:12px;">${date}</h2>
        <div style="width:40px; height:3px; background:var(--terracotta); margin:15px auto;"></div>
        <p style="font-size: 1.1rem; line-height: 1.6; color: var(--deep-navy);">The archive for this milestone is now open.</p>
        <p style="margin-top:20px; font-weight: 700; color: var(--terracotta);">COLLECTION ACCESSED 🔓</p>
    `;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('content-modal').classList.add('hidden');
}

function closeOnOutsideClick(e) {
    if (e.target.classList.contains('modal-overlay')) closeModal();
}

// Initialize
initParticles();
animateParticles();
window.onresize = initParticles;