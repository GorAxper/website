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

// Pre-defined polls for Gor
const GOR_POLLS = [
    { q: "Pineapple on pizza: Yes or No?", options: ["Yes, heavenly!", "No, it's a crime!"] },
    { q: "Better Movie: Interstellar vs. Inception?", options: ["Interstellar", "Inception"] },
    { q: "Morning Bird or Night Owl?", options: ["Early Bird", "Night Owl"] },
    { q: "Coffee or Tea?", options: ["Morning Coffee", "Cozy Tea"] }
];

// Persistent state for votes and Ani's custom polls using localStorage
const USER_VOTES = JSON.parse(localStorage.getItem('the_journey_votes')) || {};
let ANI_POLLS = JSON.parse(localStorage.getItem('the_journey_ani_polls')) || [];

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
    const pollsView = document.getElementById('polls-view');
    if (!pollsView) return;

    // We modify the internal structure to have two clear sections
    pollsView.innerHTML = `
        <header class="page-header">
            <h1 class="header-gradient">The Great Debate</h1>
            <p>Settling the most important questions of our time.</p>
        </header>

        <div class="debate-section">
            <h2 class="section-title header-gradient" style="margin: 40px 0 20px; font-size: 1.8rem;">Gor</h2>
            <div class="calendar-grid" id="gor-grid"></div>
        </div>

        <div class="debate-section">
            <h2 class="section-title header-gradient" style="margin: 60px 0 20px; font-size: 1.8rem;">Ani</h2>
            <div class="calendar-grid" id="ani-grid"></div>
        </div>
    `;

    const gorGrid = document.getElementById('gor-grid');
    const aniGrid = document.getElementById('ani-grid');

    // Render Gor's Polls
    GOR_POLLS.forEach((p, i) => {
        const card = createPollCard(p, `gor_${i}`, i * 0.1);
        gorGrid.appendChild(card);
    });

    // Render Ani's Polls
    ANI_POLLS.forEach((p, i) => {
        const card = createPollCard(p, `ani_${i}`, (i + GOR_POLLS.length) * 0.1);
        aniGrid.appendChild(card);
    });

    // Render Ani's PLUS Card
    const plusCard = document.createElement('div');
    plusCard.className = "box available";
    plusCard.style.cursor = "pointer";
    plusCard.style.border = "2px dashed var(--terracotta)";
    plusCard.style.fontSize = "3rem";
    plusCard.style.color = "var(--terracotta)";
    plusCard.style.display = "flex";
    plusCard.style.justifyContent = "center";
    plusCard.style.alignItems = "center";
    // Fixed Uniform Height
    plusCard.style.aspectRatio = "auto";
    plusCard.style.height = "100%";
    plusCard.style.minHeight = "340px"; 
    plusCard.innerHTML = "<span>+</span>";
    plusCard.onclick = openPollCreator;
    aniGrid.appendChild(plusCard);
}

function createPollCard(p, id, delay) {
    const card = document.createElement('div');
    card.className = "box poll-card available";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.animationDelay = `${delay}s`;
    
    // Consistent Fixed Card Length
    card.style.height = "100%"; 
    card.style.minHeight = "300px"; 
    card.style.aspectRatio = "auto"; 
    
    const existingVote = USER_VOTES[id];
    
    let pollHTML = `<div class="poll-question" style="flex: 0 0 auto; margin-bottom: 20px; min-height: 56px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 700;">${p.q}</div>`;
    
    if (existingVote) {
        pollHTML += `
            <div style="margin-top: auto; flex: 1; display: flex; flex-direction: column; justify-content: center; width: 100%; text-align: center;">
                <div style="background: var(--cream-bg); padding: 15px; border-radius: 12px; border: 1px dashed var(--terracotta); margin-bottom: 15px;">
                    <span style="font-size: 0.7rem; opacity: 0.6; display: block; margin-bottom: 4px; letter-spacing: 1px;">YOU CHOSE</span>
                    <strong style="color: var(--terracotta); font-size: 1.1rem;">${existingVote}</strong>
                </div>
                <button class="nav-btn" onclick="resetVote('${id}')" style="width: 100%; font-size: 0.75rem; border: 1px solid var(--border-soft); padding: 12px;">Change Answer</button>
            </div>
        `;
    } else {
        // Dynamic Button Length based on number of options
        const count = p.options.length;
        let padding = "12px"; // Default
        if (count === 4) padding = "10px";
        if (count === 3) padding = "16px";
        if (count === 2) padding = "24px";

        pollHTML += `
            <div style="margin-top: auto; flex: 1; display: flex; flex-direction: column; justify-content: center; width: 100%; gap: 10px;">
                ${p.options.map(opt => `<button class="poll-btn" onclick="vote('${id}', '${opt}')" style="width: 100%; margin: 0; padding: ${padding}; font-weight: 600;">${opt}</button>`).join('')}
            </div>
        `;
    }
    
    card.innerHTML = pollHTML;
    return card;
}

function openPollCreator() {
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('content-modal');
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div style="padding: 10px; text-align: left;">
                <h2 class="header-gradient" style="margin-bottom: 20px; text-align: center;">Create New Card</h2>
                
                <label style="font-size: 0.8rem; font-weight: 700; opacity: 0.7;">QUESTION (Max 50 chars)</label>
                <input type="text" id="new-poll-q" maxlength="50" placeholder="e.g. Favorite Season?" style="width: 100%; margin: 8px 0 20px; border: 1.5px solid var(--border-soft);">
                
                <label style="font-size: 0.8rem; font-weight: 700; opacity: 0.7;">OPTIONS (At least 2)</label>
                <input type="text" class="new-poll-opt" placeholder="Option 1" style="width: 100%; margin: 8px 0; border: 1.5px solid var(--border-soft);">
                <input type="text" class="new-poll-opt" placeholder="Option 2" style="width: 100%; margin: 8px 0; border: 1.5px solid var(--border-soft);">
                <input type="text" class="new-poll-opt" placeholder="Option 3 (Optional)" style="width: 100%; margin: 8px 0; border: 1.5px solid var(--border-soft);">
                <input type="text" class="new-poll-opt" placeholder="Option 4 (Optional)" style="width: 100%; margin: 8px 0 25px; border: 1.5px solid var(--border-soft);">
                
                <button class="nav-btn active" onclick="saveNewPoll()" style="width: 100%; padding: 15px;">Create Card</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }
}

function saveNewPoll() {
    const q = document.getElementById('new-poll-q').value.trim();
    const optInputs = document.querySelectorAll('.new-poll-opt');
    const options = Array.from(optInputs).map(i => i.value.trim()).filter(v => v !== "");

    if (q.length < 3) { alert("Please enter a valid question."); return; }
    if (options.length < 2) { alert("Please enter at least two options."); return; }

    ANI_POLLS.push({ q, options });
    localStorage.setItem('the_journey_ani_polls', JSON.stringify(ANI_POLLS));
    
    closeModal();
    renderPolls();
}

function vote(id, choice) { 
    // Save the choice to state and localStorage
    USER_VOTES[id] = choice;
    localStorage.setItem('the_journey_votes', JSON.stringify(USER_VOTES));
    
    // Refresh the UI
    renderPolls();
    
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('content-modal');
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div style="padding: 20px;">
                <h2 class="header-gradient" style="margin-bottom: 20px;">Choice Recorded!</h2>
                <p style="font-size: 1.1rem; margin-bottom: 25px;">You selected: <strong>${choice}</strong></p>
                <button class="nav-btn active" onclick="closeModal()" style="width: 100%; padding: 15px;">Perfect</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }
}

function resetVote(id) {
    // Clear choice from state and localStorage
    delete USER_VOTES[id];
    localStorage.setItem('the_journey_votes', JSON.stringify(USER_VOTES));
    
    // Refresh the UI
    renderPolls();
}

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

function suggestMusic() { 
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('content-modal');
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div style="padding: 10px;">
                <h2 class="header-gradient" style="margin-bottom: 15px;">Suggest a Track</h2>
                <p style="margin-bottom: 20px; opacity: 0.8;">What should be on our shared playlist?</p>
                <input type="text" id="music-suggestion-input" placeholder="Artist - Song Title" style="width: 100%; margin-bottom: 25px; border: 1.5px solid var(--border-soft);">
                <button class="nav-btn active" onclick="submitMusicSuggestion()" style="width: 100%; padding: 15px;">Submit Suggestion</button>
            </div>
        `;
        modal.classList.remove('hidden');
        // Small delay to ensure focus works on rendered input
        setTimeout(() => document.getElementById('music-suggestion-input')?.focus(), 100);
    }
}

function submitMusicSuggestion() {
    const input = document.getElementById('music-suggestion-input');
    const val = input ? input.value : "";
    if (val.trim()) {
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div style="padding: 20px;">
                <h2 class="header-gradient" style="margin-bottom: 15px;">Got it!</h2>
                <p style="margin-bottom: 25px;">"${val}" has been added to our shared list. 🎧</p>
                <button class="nav-btn active" onclick="closeModal()" style="width: 100%; padding: 15px;">Close</button>
            </div>
        `;
    } else {
        closeModal();
    }
}

function openModal(d) {
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('content-modal');
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <h2 class="header-gradient" style="margin-bottom: 15px;">${d}</h2>
            <p style="margin-bottom: 25px; line-height: 1.6;">Shared memory archived. 🔓</p>
            <button class="nav-btn active" onclick="closeModal()" style="width: 100%; padding: 15px;">Close Archive</button>
        `;
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