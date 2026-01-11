/* --- THE JOURNEY: LOGIC ENGINE --- */

// 1. MUSIC PLAYLIST 
// Update this list to add or remove music. 
// Files should be in a folder named 'music' relative to index.html.
const PLAYLIST = [
    { title: "Jamiroquai - Tallulah", src: "music/tallulah.mp3" },
    { title: "Neneh Cherry, Youssou N'Dour - 7 seconds away", src: "music/seven_seconds.mp3" },
];

// 2. CONFIGURATION
const ACCESS_PASSWORD = "2026"; 
const START_DATE = new Date(2025, 9, 1); // October 1st, 2025
const END_DATE = new Date(2026, 11, 31); // December 31st, 2026
const INTERVAL_DAYS = 15;

const POLLS = [
    { q: "Pineapple on pizza: Yes or No?", options: ["Yes, heavenly!", "No, it's a crime!"] },
    { q: "Better Movie: Interstellar vs. Inception?", options: ["Interstellar", "Inception"] },
    { q: "Morning Bird or Night Owl?", options: ["Early Bird", "Night Owl"] },
    { q: "Coffee or Tea?", options: ["Morning Coffee", "Cozy Tea"] }
];

// SVG Assets
const LOCKED_SVG = `<svg class="lock-icon" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm9 13H6v-8h12v8z"/></svg>`;
const UNLOCKED_SVG = `<svg class="lock-icon" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-7V7c0-1.654 1.346-3 3-3s3 1.346 3 3v1h2V7c0-2.757-2.243-5-5-5zM6 12h12v8H6v-8z"/></svg>`;

// 3. AUTHENTICATION
function checkPassword() {
    const input = document.getElementById('password-input').value;
    if (input === ACCESS_PASSWORD) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('nav-bar').classList.remove('hidden');
        
        const musicContainer = document.getElementById('music-container');
        if (musicContainer) {
            musicContainer.classList.remove('hidden');
            // Ensure the window is open (unfolded) by default
            musicContainer.classList.remove('folded');
            const foldIcon = document.getElementById('fold-icon');
            if (foldIcon) foldIcon.innerText = "🎶";
        }

        generateGrid();
        setupMusic();
        
        // Start playing music automatically after the user interaction (click)
        togglePlay();
    } else {
        const error = document.getElementById('error-msg');
        error.innerText = "Incorrect Code. Access Denied.";
        setTimeout(() => error.innerText = "", 3000);
    }
}

// 4. NAVIGATION
function showView(view) {
    const milestones = document.getElementById('milestones-view');
    const polls = document.getElementById('polls-view');
    const btnM = document.getElementById('nav-milestones');
    const btnP = document.getElementById('nav-polls');

    if (view === 'milestones') {
        milestones.classList.remove('hidden');
        polls.classList.add('hidden');
        btnM.classList.add('active');
        btnP.classList.remove('active');
    } else {
        milestones.classList.add('hidden');
        polls.classList.remove('hidden');
        btnP.classList.add('active');
        btnM.classList.remove('active');
        renderPolls();
    }
}

// 5. GRID GENERATION (Archives)
function generateGrid() {
    const grid = document.getElementById('calendar-grid');
    const today = new Date(); 
    let current = new Date(START_DATE);
    let unlockedCount = 0;
    let totalCount = 0;
    let stagger = 0;

    grid.innerHTML = "";
    while (current <= END_DATE) {
        const boxDate = new Date(current);
        const isPast = today >= boxDate;
        if (isPast) unlockedCount++;
        totalCount++;

        const box = document.createElement('div');
        box.className = `box ${isPast ? 'available' : 'locked'}`;
        box.style.animationDelay = `${stagger}s`;
        stagger += 0.05;

        const dateStr = boxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        box.innerHTML = `${isPast ? UNLOCKED_SVG : LOCKED_SVG} <div class="date-label">${dateStr}</div>`;
        
        if (isPast) box.onclick = () => openModal(dateStr);
        grid.appendChild(box);
        current.setDate(current.getDate() + INTERVAL_DAYS); 
    }
    document.getElementById('status-pill').innerText = `${unlockedCount} / ${totalCount} Milestones Unlocked`;
}

// 6. POLL LOGIC (Great Debate)
function renderPolls() {
    const grid = document.getElementById('polls-grid');
    if (!grid) return;
    grid.innerHTML = "";
    POLLS.forEach((poll, i) => {
        const card = document.createElement('div');
        card.className = "box poll-card available";
        card.style.animationDelay = `${i * 0.1}s`;
        card.innerHTML = `
            <div class="poll-question">${poll.q}</div>
            <div style="width: 100%;">
                ${poll.options.map(opt => `<button class="poll-btn" onclick="vote('${opt}')">${opt}</button>`).join('')}
            </div>
        `;
        grid.appendChild(card);
    });
}

function vote(choice) {
    alert(`Choice recorded: "${choice}". Great talking point for the next conversation!`);
}

// 7. MUSIC PLAYER LOGIC
let trackIdx = 0;
const audio = document.getElementById('audio-element');
const playBtn = document.getElementById('play-btn');

function setupMusic() {
    if (PLAYLIST.length === 0 || !audio) return;
    updateTrackInfo();
    audio.onended = () => changeTrack(1);
}

function updateTrackInfo() {
    const track = PLAYLIST[trackIdx];
    const trackNameEl = document.getElementById('current-track-name');
    if (trackNameEl) trackNameEl.innerText = track.title;
    if (audio) audio.src = track.src;
}

function togglePlay() {
    if (!audio) return;
    if (audio.paused) {
        audio.play().catch(e => console.log("User interaction required for audio."));
        if (playBtn) playBtn.innerText = "⏸";
    } else {
        audio.pause();
        if (playBtn) playBtn.innerText = "▶";
    }
}

function changeTrack(dir) {
    trackIdx = (trackIdx + dir + PLAYLIST.length) % PLAYLIST.length;
    updateTrackInfo();
    if (audio) {
        audio.play().catch(e => console.log("Audio switched, click play."));
        if (playBtn) playBtn.innerText = "⏸";
    }
}

function toggleMusicFold() {
    const player = document.getElementById('music-container');
    const foldIcon = document.getElementById('fold-icon');
    if (player) {
        player.classList.toggle('folded');
        if (foldIcon) foldIcon.innerText = player.classList.contains('folded') ? "🎵" : "🎶";
    }
}

function suggestMusic() {
    const link = prompt("Enter a song name or a YouTube/Spotify link you'd like to suggest:");
    if (link) alert("Success! Your suggestion has been added to the review queue.");
}

// 8. MODAL HELPERS
function openModal(date) {
    const modal = document.getElementById('content-modal');
    const body = document.getElementById('modal-body');
    if (modal && body) {
        body.innerHTML = `
            <h2 style="color:var(--deep-navy);">${date}</h2>
            <div style="width:40px; height:3px; background:var(--terracotta); margin:15px auto;"></div>
            <p style="line-height:1.6;">The archive for this milestone is now open. Here you can revisit all shared memories from this period.</p>
            <p style="margin-top:20px; font-weight: 700; color: var(--terracotta);">COLLECTION ACCESSED 🔓</p>
        `;
        modal.classList.remove('hidden');
    }
}

function closeModal() { 
    const modal = document.getElementById('content-modal');
    if (modal) modal.classList.add('hidden'); 
}

function closeOnOutsideClick(e) { 
    if (e.target.classList.contains('modal-overlay')) closeModal(); 
}

// 9. PARTICLE ENGINE
const canvas = document.getElementById('particle-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];

function initParticles() {
    if (!canvas || !ctx) return;
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
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
    });
    requestAnimationFrame(animateParticles);
}

// Global Listeners
const passwordInput = document.getElementById('password-input');
if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') checkPassword(); 
    });
}

// Initialization
initParticles();
animateParticles();
window.onresize = initParticles;