/* --- THE JOURNEY: LOGIC ENGINE --- */

// 1. CONFIGURATION
// const ACCESS_PASSWORD = "2026";
const ACCESS_PASSWORD = "2026";
const VANCOUVER_COORDS = { lat: 49.2827, lon: -123.1207 };
const GORIS_COORDS = { lat: 39.5074, lon: 46.3317 };

const START_DATE = new Date(2025, 9, 1); 
const END_DATE = new Date(2026, 11, 31); 
const INTERVAL_DAYS = 15;

const PLAYLIST = [
    { title: "Arno Babajanyan - Elegia", src: "music/Arno Babajanyan - Elegia.mp3" },
    { title: "Charles Aznavour - She", src: "music/Charles Aznavour - She.mp3" },
    { title: "Imany - You will never know", src: "music/Imany - You will never know.mp3" },
    { title: "Ludovico Einaudi - Una Mattina", src: "music/Ludovico Einaudi - Una Mattina.mp3" },
    { title: "Tigran Mansuryan - Siro Meghedi", src: "music/Tigran Mansuryan - Siro Meghedi.mp3" },
];

const GOR_POLLS = [
    { q: "Pineapple on pizza: Yes or No?", options: ["Yes", "No"] },
    { q: "Better Movie: Interstellar vs. Inception?", options: ["Interstellar", "Inception"] },
    { q: "Morning Bird or Night Owl?", options: ["Early Bird", "Night Owl"] },
    { q: "Coffee or Tea?", options: ["Morning Coffee", "Cozy Tea"] }
];

const GIFT_DAYS = [
    "2025-10-15", "2025-12-25", "2026-01-14", "2026-02-14", "2026-05-20"
];

// --- FIREBASE INITIALIZATION ---
// Replace the config below with your actual project values from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCTRNCNNRLzfDynKGOHdCg3ZWlxUkR_QjQ",
    authDomain: "debate-98336.firebaseapp.com",
    databaseURL: "https://debate-98336-default-rtdb.firebaseio.com",
    projectId: "debate-98336",
    storageBucket: "debate-98336.firebasestorage.app",
    messagingSenderId: "533023732138",
    appId: "1:533023732138:web:53fd75aca036c40ec3fbd3",
    measurementId: "G-NJ8T459BF5"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const ROOM_ID = ACCESS_PASSWORD; // Per user rules: $room_id level

// State variables synchronized with Firebase
let USER_VOTES = {};
let ANI_POLLS = [];

// SVG Assets
const LOCKED_SVG = `<svg class="lock-icon" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm9 13H6v-8h12v8z"/></svg>`;
const UNLOCKED_SVG = `<svg class="lock-icon" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-7V7c0-1.654 1.346-3 3-3s3 1.346 3 3v1h2V7c0-2.757-2.243-5-5-5zM6 12h12v8H6v-8z"/></svg>`;

// 2. AUTHENTICATION & SYNC
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

        startRealtimeSync();
        initHomeView();
        setupMusic();
        togglePlay(); 
    } else {
        const error = document.getElementById('error-msg');
        error.innerText = "Սխալ գաղտնաբառ:";
        setTimeout(() => error.innerText = "", 3000);
    }
}

function startRealtimeSync() {
    const roomRef = database.ref(`debate_cards/${ROOM_ID}`);
    
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            USER_VOTES = data.votes || {};
            // If custom_polls is an object (Firebase pushes), convert to array
            ANI_POLLS = data.custom_polls ? Object.values(data.custom_polls) : [];
        } else {
            USER_VOTES = {};
            ANI_POLLS = [];
        }

        // Re-render only if the polls view is currently active
        const pollsView = document.getElementById('polls-view');
        if (pollsView && !pollsView.classList.contains('hidden')) {
            renderPolls();
        }
    });
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
    if (distEl) distEl.innerText = `${d.toLocaleString(undefined, {maximumFractionDigits: 2})} ԿՄ`;
}

function updateWeatherAndClocks() {
    const daysHy = ["Կիրակի", "Երկուշաբթի", "Երեքշաբթի", "Չորեքշաբթի", "Հինգշաբթի", "Ուրբաթ", "Շաբաթ"];
    const monthsHy = ["Հունվարի", "Փետրվարի", "Մարտի", "Ապրիլի", "Մայիսի", "Հունիսի", "Հուլիսի", "Օգոստոսի", "Սեպտեմբերի", "Հոկտեմբերի", "Նոյեմբերի", "Դեկտեմբերի"];

    const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    function getArmenianDate(tz) {
        const now = new Date(new Date().toLocaleString("en-US", {timeZone: tz}));
        return `${daysHy[now.getDay()]}, ${monthsHy[now.getMonth()]} ${now.getDate()}`;
    }

    // Vancouver
    const vanTimeEl = document.getElementById('vancouver-time');
    const vanDateEl = document.getElementById('vancouver-date');
    if (vanTimeEl) vanTimeEl.innerText = new Intl.DateTimeFormat('en-US', { ...optionsTime, timeZone: 'America/Vancouver' }).format(new Date());
    if (vanDateEl) vanDateEl.innerText = getArmenianDate('America/Vancouver');

    // Goris
    const gorTimeEl = document.getElementById('goris-time');
    const gorDateEl = document.getElementById('goris-date');
    if (gorTimeEl) gorTimeEl.innerText = new Intl.DateTimeFormat('en-US', { ...optionsTime, timeZone: 'Asia/Yerevan' }).format(new Date());
    if (gorDateEl) gorDateEl.innerText = getArmenianDate('Asia/Yerevan');
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
    
    // Comprehensive Armenian Weather Mapping
    const codeMap = { 
        0: "Պարզ երկինք", 
        1: "Հիմնականում պարզ", 
        2: "Մասնակի ամպամած", 
        3: "Ամպամած", 
        45: "Մառախուղ", 
        48: "Մառախուղ", 
        51: "Շաղբի", 53: "Շաղբի", 55: "Շաղբի",
        61: "Անձրև", 63: "Անձրև", 65: "Անձրև",
        71: "Ձյուն", 73: "Ձյուն", 75: "Ձյուն", 77: "Ձյան փաթիլներ",
        80: "Անձրևային տեղումներ", 81: "Անձրևային տեղումներ", 82: "Անձրևային տեղումներ",
        85: "Ձյունոտ տեղումներ", 86: "Ձյունոտ տեղումներ",
        95: "Ամպրոպ" 
    };
    
    if (tempEl) tempEl.innerText = `${data.temperature}°C`;
    
    // Set text description (Defaults to "Պարզ" only if code is unknown)
    const weatherText = codeMap[data.weathercode] || "Պարզ";
    if (descEl) descEl.innerText = weatherText;
    
    if (videoEl) {
        let weatherType = 'clear';
        const code = data.weathercode;

        // Sync video logic with the codeMap ranges
        if (code >= 1 && code <= 3) {
            weatherType = 'cloudy';
        } else if (code === 45 || code === 48) {
            weatherType = 'fog';
        } else if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) {
            weatherType = 'rain';
        } else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
            weatherType = 'snow';
        } else if (code >= 95) {
            weatherType = 'storm';
        } else {
            weatherType = 'clear'; // This handles code 0
        }

        const folder = city === 'vancouver' ? 'dynamic/Vancouver' : 'dynamic/Goris';
        const newSrc = `${folder}/${weatherType}.mp4`;
        
        if (videoEl.getAttribute('src') !== newSrc) {
            videoEl.src = newSrc;
            videoEl.load();
            videoEl.play().catch(() => {});
        }
    }
}

// 5. PAGE 2 LOGIC: ARCHIVES
let currentDisplayDate = new Date(2026, 0, 1); // Starts at Jan 2026

function generateGrid() {
    const gridContainer = document.getElementById('calendar-grid');
    if (!gridContainer) return;
    
    gridContainer.innerHTML = "";
    gridContainer.className = ""; 

    const monthsFullHy = ["Հունվար", "Փետրվար", "Մարտ", "Ապրիլ", "Մայիս", "Հունիս", "Հուլիս", "Օգոստոս", "Սեպտեմբեր", "Հոկտեմբեր", "Նոյեմբեր", "Դեկտեմբեր"];
    
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();
    
    // Manual Armenian Month Title
    const monthName = `${monthsFullHy[month]}  ${year}`;

    const navWrapper = document.createElement('div');
    navWrapper.className = "calendar-nav-bar";
    navWrapper.innerHTML = `
        <button class="nav-btn" onclick="changeMonth(-1)">❮</button>
        <div class="month-name">${monthName}</div>
        <button class="nav-btn" onclick="changeMonth(1)">❯</button>
    `;
    gridContainer.appendChild(navWrapper);

    const monthWrapper = document.createElement('div');
    monthWrapper.className = "milestone-calendar-wrapper";
    const calGrid = document.createElement('div');
    calGrid.className = "milestone-calendar-grid";

    // Armenian Short Weekdays
    ['Կիր', 'Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ'].forEach(day => {
        calGrid.innerHTML += `<div class="calendar-day-header">${day}</div>`;
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Empty cells for padding
    for (let i = 0; i < firstDay; i++) {
        calGrid.innerHTML += `<div class="calendar-cell empty"></div>`;
    }

    // Generate Days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        const isGift = GIFT_DAYS.includes(dateISO);
        const isPastOrToday = today >= dateObj;
        
        const cell = document.createElement('div');
        // Only gift days get the 'available' class and cursor pointer
        cell.className = `calendar-cell ${isGift && isPastOrToday ? 'available gift-day' : 'regular-day'}`;
        
        cell.innerHTML = `<span>${d}</span>${isGift ? '<div class="gift-icon">🎁</div>' : ''}`;
        
        // CLICK LOGIC: Only gift days that have passed or are today can be clicked
        if (isGift && isPastOrToday) {
            cell.onclick = () => openModal(`Gift for ${monthName} ${d}`);
        } else {
            cell.onclick = null; // Ensure others are not clickable
        }
        
        calGrid.appendChild(cell);
    }

    monthWrapper.appendChild(calGrid);
    gridContainer.appendChild(monthWrapper);
    
    // Update the status pill
    const statusPill = document.getElementById('status-pill');
    if (statusPill) statusPill.innerText = "Միայն բացված օրերն են հասանելի";
}

// Function to handle the button clicks
function changeMonth(delta) {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + delta);
    generateGrid();
}

// 6. PAGE 3 LOGIC: THE GREAT DEBATE
function renderPolls() {
    const pollsView = document.getElementById('polls-view');
    if (!pollsView) return;

    pollsView.innerHTML = `
        <header class="page-header">
            <h1 class="header-gradient">Հարց և Պատասխան</h1>
            <p>Մեր ժամանակների ամենակարևոր հարցերի պատասխանները:</p>
        </header>

        <div class="debate-section">
            <h2 class="section-title header-gradient separable-header" style="margin: 40px 0 30px; font-size: 1.8rem;">
                <span>Գոռ</span>
            </h2>
            <div class="calendar-grid" id="gor-grid"></div>
        </div>

        <div class="debate-section">
            <h2 class="section-title header-gradient separable-header" style="margin: 60px 0 30px; font-size: 1.8rem;">
                <span>Անի</span>
            </h2>
            <div class="calendar-grid" id="ani-grid"></div>
        </div>
    `;

    const gorGrid = document.getElementById('gor-grid');
    const aniGrid = document.getElementById('ani-grid');

    GOR_POLLS.forEach((p, i) => {
        const card = createPollCard(p, `gor_${i}`, i * 0.1);
        gorGrid.appendChild(card);
    });

    ANI_POLLS.forEach((p, i) => {
        const card = createPollCard(p, `ani_${i}`, (i + GOR_POLLS.length) * 0.1);
        aniGrid.appendChild(card);
    });

    const plusCard = document.createElement('div');
    plusCard.className = "box available";
    plusCard.style.cursor = "pointer";
    plusCard.style.border = "2px dashed var(--terracotta)";
    plusCard.style.fontSize = "3rem";
    plusCard.style.color = "var(--terracotta)";
    plusCard.style.display = "flex";
    plusCard.style.justifyContent = "center";
    plusCard.style.alignItems = "center";
    plusCard.style.height = "100%";
    plusCard.style.minHeight = "340px"; 
    plusCard.style.aspectRatio = "auto";
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
    card.style.height = "100%"; 
    card.style.minHeight = "300px"; 
    
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
        const count = p.options.length;
        let padding = "12px"; 
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
                <h2 class="header-gradient" style="margin-bottom: 20px; text-align: center;">Ստեղծել նոր հարց</h2>
                <label style="font-size: 0.8rem; font-weight: 700; opacity: 0.7;">ՀԱՐՑ (Առավելագույնը 50 տառ)</label>
                <input type="text" id="new-poll-q" maxlength="50" placeholder="Օրինակ՝ Սիրելի եղանակը" style="width: 100%; margin: 8px 0 20px;">
                <label style="font-size: 0.8rem; font-weight: 700; opacity: 0.7;">ՏԱՐԲԵՐԱԿՆԵՐ (Առնվազն 2)</label>
                <input type="text" class="new-poll-opt" placeholder="Տարբերակ 1" style="width: 100%; margin: 8px 0;">
                <input type="text" class="new-poll-opt" placeholder="Տարբերակ 2" style="width: 100%; margin: 8px 0;">
                <input type="text" class="new-poll-opt" placeholder="Տարբերակ 3 (Ըստ ցանկության)" style="width: 100%; margin: 8px 0;">
                <input type="text" class="new-poll-opt" placeholder="Տարբերակ 4 (Ըստ ցանկության)" style="width: 100%; margin: 8px 0 25px;">
                <button class="nav-btn active" onclick="saveNewPoll()" style="width: 100%; padding: 15px;">Ստեղծել</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }
}

function saveNewPoll() {
    const q = document.getElementById('new-poll-q').value.trim();
    const optInputs = document.querySelectorAll('.new-poll-opt');
    const options = Array.from(optInputs).map(i => i.value.trim()).filter(v => v !== "");

    if (q.length < 3) { alert("Խնդրում ենք մուտքագրել վավեր հարց:"); return; }
    if (options.length < 2) { alert("Խնդրում ենք մուտքագրել առնվազն երկու տարբերակ։"); return; }

    const newPoll = { q, options };
    // Firebase real-time push
    database.ref(`debate_cards/${ROOM_ID}/custom_polls`).push(newPoll);
    
    closeModal();
}

function vote(id, choice) { 
    // Update Firebase votes
    database.ref(`debate_cards/${ROOM_ID}/votes/${id}`).set(choice);
    
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('content-modal');
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div style="padding: 20px;">
                <h2 class="header-gradient" style="margin-bottom: 20px;">Ընտրությունը գրանցված է</h2>
                <p style="font-size: 1.1rem; margin-bottom: 25px;">Դուք ընտրեցիք՝ <strong>${choice}</strong></p>
                <button class="nav-btn active" onclick="closeModal()" style="width: 100%; padding: 15px;">Փակել</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }
}

function resetVote(id) {
    // Remove from Firebase
    database.ref(`debate_cards/${ROOM_ID}/votes/${id}`).remove();
}

// 7. MUSIC PLAYER
let trackIdx = 0;
const audio = document.getElementById('audio-element');
const playBtn = document.getElementById('play-btn');
const volumeControl = document.getElementById('volume-control');

function setupMusic() {
    if (!audio) return;
    audio.volume = 0.5;
    if (volumeControl) volumeControl.value = 0.5;
    updateTrackInfo();
    audio.onended = () => changeTrack(1);
    if (volumeControl) {
        volumeControl.addEventListener('input', (e) => { audio.volume = e.target.value; });
    }
}

function updateTrackInfo() {
    const trackNameEl = document.getElementById('current-track-name');
    if (trackNameEl) trackNameEl.innerText = PLAYLIST[trackIdx].title;
    if (audio) audio.src = PLAYLIST[trackIdx].src;
}

function togglePlay() {
    if (!audio) return;
    const playBtn = document.getElementById('play-btn');
    
    if (audio.paused) { 
        audio.play().catch(e => {}); 
        playBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; // Pause Icon
    } else { 
        audio.pause(); 
        playBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`; // Play Icon
    }
}

function changeTrack(d) {
    trackIdx = (trackIdx + d + PLAYLIST.length) % PLAYLIST.length;
    updateTrackInfo(); 
    if (audio) { 
        audio.play().catch(() => {}); 
        document.getElementById('play-btn').innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
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
                <h2 class="header-gradient" style="margin-bottom: 15px;">Առաջարկել երգ</h2>
                <p style="margin-bottom: 20px; opacity: 0.8;">Ի՞նչ երգ պետք է լինի ընդհանուր փլեյլիստում:</p>
                <input type="text" id="music-suggestion-input" placeholder="Արտիստ - Երգի վերնագիր" style="width: 100%; margin-bottom: 25px;">
                <button class="nav-btn active" onclick="submitMusicSuggestion()" style="width: 100%; padding: 15px;">Ուղարկել ընտրությունը</button>
            </div>
        `;
        modal.classList.remove('hidden');
        setTimeout(() => document.getElementById('music-suggestion-input')?.focus(), 100);
    }
}

function submitMusicSuggestion() {
    const input = document.getElementById('music-suggestion-input');
    const val = input ? input.value.trim() : "";

    if (val) {
        // Save to Firebase under 'music_suggestions'
        database.ref(`debate_cards/${ROOM_ID}/music_suggestions`).push({
            suggestion: val,
            timestamp: Date.now(),
            date: new Date().toLocaleString()
        });

        // Show Success Message
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div style="padding: 20px;">
                <h2 class="header-gradient" style="margin-bottom: 15px;">Ուղարկված է!</h2>
                <p style="margin-bottom: 25px;">"${val}"-ը ավելացվել է գաղտնի ցանկում։ 🎧</p>
                <button class="nav-btn active" onclick="closeModal()" style="width: 100%; padding: 15px;">Փակել</button>
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
