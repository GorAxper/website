/* --- THE JOURNEY: LOGIC ENGINE --- */

// 1. CONFIGURATION
const ACCESS_PASSWORD = "2026"; 
const VANCOUVER_COORDS = { lat: 49.2827, lon: -123.1207 };
const GORIS_COORDS = { lat: 39.5074, lon: 46.3317 };

const START_DATE = new Date(2025, 9, 1); 
const END_DATE = new Date(2026, 11, 31); 
const INTERVAL_DAYS = 15;

const PLAYLIST = [
    { title: "Jamiroquai - Tallulah", src: "music/tallulah.mp3" },
    { title: "Neneh Cherry, Youssou N'Dour - 7 seconds away", src: "music/seven_seconds.mp3" },
];

const POLLS = [
    { q: "Pineapple on pizza: Yes or No?", options: ["Yes, heavenly!", "No, it's a crime!"] },
    { q: "Better Movie: Interstellar vs. Inception?", options: ["Interstellar", "Inception"] },
    { q: "Morning Bird or Night Owl?", options: ["Early Bird", "Night Owl"] },
    { q: "Coffee or Tea?", options: ["Morning Coffee", "Cozy Tea"] }
];

// SVG Assets
const LOCKED_SVG = `<svg class="lock-icon" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm9 13H6v-8h12v8z"/></svg>`;
const UNLOCKED_SVG = `<svg class="lock-icon" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-7V7c0-1.654 1.346-3 3-3s3 1.346 3 3v1h2V7c0-2.757-2.243-5-5-5zM6 12h12v8H6v-8z"/></svg>`;

// 2. AUTHENTICATION
function checkPassword() {
    const input = document.getElementById('password-input').value;
    if (input === ACCESS_PASSWORD) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('nav-bar').classList.remove('hidden');
        
        const musicContainer = document.getElementById('music-container');
        if (musicContainer) {
            musicContainer.classList.remove('hidden');
            musicContainer.classList.remove('folded');
            const foldIcon = document.getElementById('fold-icon');
            if (foldIcon) foldIcon.innerText = "🎶";
        }

        initHomeView();
        generateGrid();
        setupMusic();
        togglePlay(); 
    } else {
        const error = document.getElementById('error-msg');
        error.innerText = "Incorrect Code.";
        setTimeout(() => error.innerText = "", 3000);
    }
}

// 3. NAVIGATION
function showView(view) {
    const views = ['home', 'milestones', 'polls'];
    views.forEach(v => {
        const viewEl = document.getElementById(`${v}-view`);
        if (viewEl) viewEl.classList.add('hidden');
        
        const navBtn = document.getElementById(`nav-${v === 'home' ? 'home' : v}`);
        if (navBtn) navBtn.classList.remove('active');
    });

    document.getElementById(`${view}-view`).classList.remove('hidden');
    document.getElementById(`nav-${view === 'home' ? 'home' : view}`).classList.add('active');

    if (view === 'polls') renderPolls();
    if (view === 'milestones') generateGrid();
    if (view === 'home') updateWeatherAndClocks();
}

// 4. PAGE 1 LOGIC: LIVE CONNECTION
function initHomeView() {
    updateWeatherAndClocks();
    calculateLiveDistance();
    setInterval(updateWeatherAndClocks, 1000); 
    setInterval(fetchLiveWeather, 600000); 
    fetchLiveWeather();
}

function calculateLiveDistance() {
    const R = 6371; 
    const dLat = (GORIS_COORDS.lat - VANCOUVER_COORDS.lat) * Math.PI / 180;
    const dLon = (GORIS_COORDS.lon - VANCOUVER_COORDS.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(VANCOUVER_COORDS.lat * Math.PI / 180) * Math.cos(GORIS_COORDS.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; 
    const distEl = document.getElementById('live-distance');
    if (distEl) distEl.innerText = `${d.toLocaleString(undefined, {maximumFractionDigits: 2})} KM`;
}

function updateWeatherAndClocks() {
    const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const optionsDate = { weekday: 'long', month: 'long', day: 'numeric' };

    const vanTimeEl = document.getElementById('vancouver-time');
    const vanDateEl = document.getElementById('vancouver-date');
    if (vanTimeEl) vanTimeEl.innerText = new Intl.DateTimeFormat('en-US', { ...optionsTime, timeZone: 'America/Vancouver' }).format(new Date());
    if (vanDateEl) vanDateEl.innerText = new Intl.DateTimeFormat('en-US', { ...optionsDate, timeZone: 'America/Vancouver' }).format(new Date());

    const gorTimeEl = document.getElementById('goris-time');
    const gorDateEl = document.getElementById('goris-date');
    if (gorTimeEl) gorTimeEl.innerText = new Intl.DateTimeFormat('en-US', { ...optionsTime, timeZone: 'Asia/Yerevan' }).format(new Date());
    if (gorDateEl) gorDateEl.innerText = new Intl.DateTimeFormat('en-US', { ...optionsDate, timeZone: 'Asia/Yerevan' }).format(new Date());
}

async function fetchLiveWeather() {
    try {
        const vanRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${VANCOUVER_COORDS.lat}&longitude=${VANCOUVER_COORDS.lon}&current_weather=true`);
        const gorRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${GORIS_COORDS.lat}&longitude=${GORIS_COORDS.lon}&current_weather=true`);
        
        const vanData = await vanRes.json();
        const gorData = await gorRes.json();

        updateWeatherUI('vancouver', vanData.current_weather);
        updateWeatherUI('goris', gorData.current_weather);
    } catch (e) { console.error("Weather failed", e); }
}

function updateWeatherUI(city, data) {
    const tempEl = document.getElementById(`${city}-temp`);
    const descEl = document.getElementById(`${city}-desc`);
    const videoEl = document.getElementById(`${city}-weather-video`);
    
    const codeMap = { 
        0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast", 
        45: "Foggy", 48: "Foggy", 
        51: "Drizzle", 53: "Drizzle", 55: "Drizzle",
        61: "Rainy", 63: "Rainy", 65: "Rainy",
        71: "Snowy", 73: "Snowy", 75: "Snowy",
        95: "Thunderstorm" 
    };
    
    if (tempEl) tempEl.innerText = `${data.temperature}°C`;
    if (descEl) descEl.innerText = codeMap[data.weathercode] || "Clear";
    
    if (videoEl) {
        let weatherType = 'clear';
        if (data.weathercode >= 1 && data.weathercode <= 3) weatherType = 'cloudy';
        else if (data.weathercode >= 45 && data.weathercode <= 48) weatherType = 'fog';
        else if (data.weathercode >= 51 && data.weathercode <= 65) weatherType = 'rain';
        else if (data.weathercode >= 71 && data.weathercode <= 77) weatherType = 'snow';
        else if (data.weathercode >= 95) weatherType = 'storm';

        const folder = city === 'vancouver' ? 'dynamic/Vancouver' : 'dynamic/Goris';
        const newSrc = `${folder}/${weatherType}.mp4`;
        
        if (videoEl.getAttribute('src') !== newSrc) {
            videoEl.src = newSrc;
            videoEl.load();
            videoEl.play().catch(() => {});
        }
    }
    
    if (city === 'goris') applyWeatherEffect(data.weathercode);
}

function applyWeatherEffect(code) {
    const overlay = document.getElementById('weather-effect-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    
    if (code >= 61 && code <= 65) { 
        for(let i=0; i<50; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = Math.random() * 100 + 'vw';
            drop.style.animation = `fall ${Math.random() + 0.5}s linear infinite`;
            overlay.appendChild(drop);
        }
    } else if (code >= 71 && code <= 77) {
        for(let i=0; i<30; i++) {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            flake.innerText = '❄';
            flake.style.left = Math.random() * 100 + 'vw';
            flake.style.animation = `fall ${Math.random() * 3 + 2}s linear infinite`;
            overlay.appendChild(flake);
        }
    }
}

// 5. PAGE 2 LOGIC: ARCHIVES
function generateGrid() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
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
    const statusPill = document.getElementById('status-pill');
    if (statusPill) statusPill.innerText = `${unlockedCount} / ${totalCount} Milestones Unlocked`;
}

// 6. PAGE 3 LOGIC: THE GREAT DEBATE
function renderPolls() {
    const grid = document.getElementById('polls-grid');
    if (!grid) return;
    grid.innerHTML = "";
    POLLS.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = "box poll-card available";
        card.style.animationDelay = `${i * 0.1}s`;
        card.innerHTML = `
            <div class="poll-question">${p.q}</div>
            <div style="width: 100%;">
                ${p.options.map(opt => `<button class="poll-btn" onclick="vote('${opt}')">${opt}</button>`).join('')}
            </div>
        `;
        grid.appendChild(card);
    });
}

function vote(c) { alert(`Vote recorded: ${c}`); }

// 7. MUSIC PLAYER
let trackIdx = 0;
const audio = document.getElementById('audio-element');
const playBtn = document.getElementById('play-btn');
const volumeControl = document.getElementById('volume-control');

function setupMusic() {
    if (!audio) return;
    
    // Set default volume to 50%
    audio.volume = 0.5;
    if (volumeControl) volumeControl.value = 0.5;

    updateTrackInfo();
    audio.onended = () => changeTrack(1);

    // Volume Listener
    if (volumeControl) {
        volumeControl.addEventListener('input', (e) => {
            audio.volume = e.target.value;
        });
    }
}

function updateTrackInfo() {
    const trackNameEl = document.getElementById('current-track-name');
    if (trackNameEl) trackNameEl.innerText = PLAYLIST[trackIdx].title;
    if (audio) audio.src = PLAYLIST[trackIdx].src;
}

function togglePlay() {
    if (!audio) return;
    if (audio.paused) { 
        audio.play().catch(e => {}); 
        if (playBtn) playBtn.innerText = "⏸"; 
    } else { 
        audio.pause(); 
        if (playBtn) playBtn.innerText = "▶"; 
    }
}

function changeTrack(d) {
    trackIdx = (trackIdx + d + PLAYLIST.length) % PLAYLIST.length;
    updateTrackInfo(); 
    if (audio) { 
        audio.play().catch(() => {}); 
        if (playBtn) playBtn.innerText = "⏸"; 
    }
}

function toggleMusicFold() { 
    const container = document.getElementById('music-container');
    if (container) container.classList.toggle('folded'); 
}

function suggestMusic() { const l = prompt("Enter suggestion:"); if (l) alert("Success!"); }

function openModal(d) {
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('content-modal');
    if (modal && modalBody) {
        modalBody.innerHTML = `<h2>${d}</h2><p>Archive opened 🔓</p>`;
        modal.classList.remove('hidden');
    }
}

function closeModal() { 
    const modal = document.getElementById('content-modal');
    if (modal) modal.classList.add('hidden'); 
}

function closeOnOutsideClick(e) { if (e.target.classList.contains('modal-overlay')) closeModal(); }

// 8. PARTICLE ENGINE
const canvas = document.getElementById('particle-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
function initParticles() {
    if (!canvas || !ctx) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    particles = [];
    for (let i = 0; i < 60; i++) {
        particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, size: Math.random()*3+1, dx: (Math.random()-0.5)*0.4, dy: (Math.random()-0.5)*0.4, opacity: Math.random()*0.2+0.03 });
    }
}
function animateParticles() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
        ctx.globalAlpha = p.opacity; ctx.fillStyle = '#f18d5e'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x<0) p.x=canvas.width; if (p.x>canvas.width) p.x=0; if (p.y<0) p.y=canvas.height; if (p.y>canvas.height) p.y=0;
    });
    requestAnimationFrame(animateParticles);
}

const passwordInput = document.getElementById('password-input');
if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkPassword(); });
}

initParticles(); animateParticles();
window.onresize = initParticles;