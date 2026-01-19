/* --- THE JOURNEY: LOGIC ENGINE --- */

// 1. CONFIGURATION
const ACCESS_PASSWORD = "2026";
const VANCOUVER_COORDS = { lat: 49.2827, lon: -123.1207 };
const GORIS_COORDS = { lat: 39.5074, lon: 46.3317 };

const START_DATE = new Date(2025, 9, 1); 
const END_DATE = new Date(2026, 11, 31); 
const INTERVAL_DAYS = 15;

const PLAYLIST = [
    { title: "Stephen Sanchez - Until I Found You", src: "music/Stephen Sanchez - Until I Found You.mp3" },
    { title: "Arno Babajanyan - Elegia", src: "music/Arno Babajanyan - Elegia.mp3" },
    { title: "Imany - You will never know", src: "music/Imany - You will never know.mp3" },
    { title: "Charles Aznavour - She", src: "music/Charles Aznavour - She.mp3" },
    { title: "Tigran Mansuryan - Siro Meghedi", src: "music/Tigran Mansuryan - Siro Meghedi.mp3" },
    { title: "Lara Fabian - Je t'aime", src: "music/Lara Fabian - Je taime.mp3" },
    { title: "Ludovico Einaudi - Una Mattina", src: "music/Ludovico Einaudi - Una Mattina.mp3" },
    { title: "Ed Sheeran - Perfect", src: "music/Ed Sheeran - Perfect.mp3" },
    
];

const GOR_POLLS = [];

const GIFT_DAYS = [
    "2026-02-02", "2026-03-19", "2026-04-27", "2026-05-20" 
];

// --- FIREBASE INITIALIZATION ---
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
const analytics = firebase.analytics();
const ROOM_ID = ACCESS_PASSWORD; 

let USER_VOTES = {};
let ANI_POLLS = [];
let GOR_POLLS_DISPLAY = []
let THOUGHTS = []; // New variable

function trackEvent(action, category, label) {
    // This sends data to Firebase Analytics
    analytics.logEvent(action, {
        event_category: category,
        event_label: label
    });

    if (typeof gtag === 'function') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label
        });
    }
}

// 2. AUTHENTICATION & SYNC
function checkPassword() {
    const input = document.getElementById('password-input').value;
    if (input === ACCESS_PASSWORD) {
        // Generate a unique ID for this specific browser/device if it doesn't exist
        let deviceID = localStorage.getItem('journey_user_id');
        if (!deviceID) {
            deviceID = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('journey_user_id', deviceID);
        }
        // --- NEW FIREBASE TRACKING ---
        analytics.setUserId(deviceID); // Links the session to this specific ID
        analytics.logEvent('login', { method: 'password' }); 
        window.clarity("identify", deviceID);
        // -----------------------------
        // 1. Send the ID to Google Analytics for session tracking
        gtag('config', 'G-NJ8T459BF5', {
            'user_id': deviceID
        });

        // 2. Log the login event specifically for this ID
        trackEvent('login_success', 'Auth', deviceID);

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
            // Fetch Ani's polls
            ANI_POLLS = data.custom_polls ? Object.entries(data.custom_polls).map(([id, val]) => ({...val, id})) : [];
            // Fetch Gor's dynamic polls
            const gorDynamic = data.gor_custom_polls ? Object.entries(data.gor_custom_polls).map(([id, val]) => ({...val, id})) : [];
            // Combine hardcoded Gor polls with dynamic ones
            GOR_POLLS_DISPLAY = [...GOR_POLLS, ...gorDynamic]; 
            
            THOUGHTS = data.thoughts ? Object.entries(data.thoughts).map(([id, val]) => ({...val, id})).reverse() : [];
        } else {
            USER_VOTES = {};
            ANI_POLLS = [];
            GOR_POLLS_DISPLAY = [...GOR_POLLS];
            THOUGHTS = [];
        }
        if (!document.getElementById('polls-view').classList.contains('hidden')) renderPolls();
        if (!document.getElementById('thoughts-view').classList.contains('hidden')) renderThoughts();
    });
}

// 3. NAVIGATION
function showView(view) {
    trackEvent('navigate_to', 'Navigation', view);
    const views = ['home', 'milestones', 'polls', 'thoughts']; // Added 'thoughts'
    views.forEach(v => {
        const viewEl = document.getElementById(`${v}-view`);
        if (viewEl) viewEl.classList.add('hidden');
        const navBtn = document.getElementById(`nav-${v === 'home' ? 'home' : v}`);
        if (navBtn) navBtn.classList.remove('active');
    });

    document.getElementById(`${view}-view`).classList.remove('hidden');
    document.getElementById(`nav-${view === 'home' ? 'home' : view}`).classList.add('active');

    if (view === 'polls') renderPolls();
    if (view === 'milestones') {
        updateMilestoneHeader();
        // Refresh the header every minute to update the time
        if (window.milestoneInterval) clearInterval(window.milestoneInterval);
        window.milestoneInterval = setInterval(updateMilestoneHeader, 60000); 
        generateGrid();
    } else {
        // Stop the timer if we leave the milestones view to save battery/performance
        if (window.milestoneInterval) {
            clearInterval(window.milestoneInterval);
            window.milestoneInterval = null;
        }
    }
    if (view === 'home') updateWeatherAndClocks();
    if (view === 'thoughts') renderThoughts();
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

    const vanTimeEl = document.getElementById('vancouver-time');
    const vanDateEl = document.getElementById('vancouver-date');
    if (vanTimeEl) vanTimeEl.innerText = new Intl.DateTimeFormat('en-US', { ...optionsTime, timeZone: 'America/Vancouver' }).format(new Date());
    if (vanDateEl) vanDateEl.innerText = getArmenianDate('America/Vancouver');

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
    const codeMap = { 0: "Պարզ երկինք", 1: "Հիմնականում պարզ", 2: "Մասնակի ամպամած", 3: "Ամպամած", 45: "Մառախուղ", 48: "Մառախուղ", 51: "Շաղբի", 53: "Շաղբի", 55: "Շաղբի", 61: "Անձրև", 63: "Անձրև", 65: "Անձրև", 71: "Ձյուն", 73: "Ձյուն", 75: "Ձյուն", 77: "Ձյան փաթիլներ", 80: "Անձրևային տեղումներ", 81: "Անձրևային տեղումներ", 82: "Անձրևային տեղումներ", 85: "Ձյունոտ տեղումներ", 86: "Ձյունոտ տեղումներ", 95: "Ամպրոպ" };
    if (tempEl) tempEl.innerText = `${data.temperature}°C`;
    const weatherText = codeMap[data.weathercode] || "Պարզ";
    if (descEl) descEl.innerText = weatherText;
    if (videoEl) {
        let weatherType = 'clear';
        const code = data.weathercode;
        if (code >= 1 && code <= 3) weatherType = 'cloudy';
        else if (code === 45 || code === 48) weatherType = 'fog';
        else if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) weatherType = 'rain';
        else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) weatherType = 'snow';
        else if (code >= 95) weatherType = 'storm';
        const folder = city === 'vancouver' ? 'dynamic/Vancouver' : 'dynamic/Goris';
        const newSrc = `${folder}/${weatherType}.mp4`;
        if (videoEl.getAttribute('src') !== newSrc) {
            videoEl.src = newSrc;
            videoEl.load();
            videoEl.play().catch(() => {});
        }
    }
}

// 5. PAGE 2 LOGIC: ARCHIVES (RESTORED TO ORIGINAL)
let currentDisplayDate = new Date(2026, 0, 1); 

function updateMilestoneHeader() {
    const headerContainer = document.getElementById('milestone-header-container');
    if (!headerContainer) return;

    // Start Date: July 18, 2025, 5:40 PM (17:40)
    // Month is 0-indexed, so July is 6
    const startDate = new Date(2025, 6, 18, 17, 40); 
    const today = new Date();
    
    const diffTime = Math.abs(today - startDate);
    
    // Calculate Days, Hours, and Minutes
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

    headerContainer.innerHTML = `
        <div class="distance-header">
            <p class="distance-label" style="color: #051937; opacity: 1; font-size: 1.8rem; font-weight: 600; margin-bottom: 5px;">
                ${diffDays} Օր, ${diffHours} Ժամ, ${diffMinutes} Րոպե
            </p>
            <h2 style="color: var(--terracotta); font-family: 'Poppins', sans-serif; font-size: 1.2rem; font-weight: 550; letter-spacing: 1.5px;">Այն պահից, երբ հանդիպեցի քեզ:</h2>
            <div class="distance-line">
                <span style="color: black;">⧗</span>
            </div>
        </div>
    `;
}

function generateGrid() {
    const gridContainer = document.getElementById('calendar-grid');
    if (!gridContainer) return;
    
    gridContainer.innerHTML = "";
    gridContainer.className = ""; 

    const monthsFullHy = ["Հունվար", "Փետրվար", "Մարտ", "Ապրիլ", "Մայիս", "Հունիս", "Հուլիս", "Օգոստոս", "Սեպտեմբեր", "Հոկտեմբեր", "Նոյեմբեր", "Դեկտեմբեր"];
    
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();
    const monthName = `${monthsFullHy[month]}  ${year}`;

    // --- ARMENIAN TIME CALCULATION ---
    const nowArmenia = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Yerevan"}));
    const armToday = nowArmenia.getDate();
    const armMonth = nowArmenia.getMonth();
    const armYear = nowArmenia.getFullYear();
    // ---------------------------------

    // (Navigation Wrapper and Grid Header logic remains the same...)
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

    const dayHeaders = ['Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ', 'Կիր'];
    dayHeaders.forEach(day => {
        calGrid.innerHTML += `<div class="calendar-day-header">${day}</div>`;
    });

    let firstDay = new Date(year, month, 1).getDay();
    let offset = (firstDay === 0) ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
        calGrid.innerHTML += `<div class="calendar-cell empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isGift = GIFT_DAYS.includes(dateISO);
        
        // Check if this cell is "Today" in Armenia
        const isToday = (d === armToday && month === armMonth && year === armYear);
        
        // --- ADD THE LINE BELOW ---
        const isMeetingDay = (d === 18 && month === 6 && year === 2025); 
        
        const cell = document.createElement('div');
        
        // --- UPDATE THIS CLASSNAME LINE ---
        cell.className = `calendar-cell ${isGift ? 'available gift-day' : 'regular-day'} ${isToday ? 'today-highlight' : ''} ${isMeetingDay ? 'meeting-day-highlight' : ''}`;
        
        cell.innerHTML = `<span>${d}</span>${isGift ? '<div class="gift-icon">🎁</div>' : ''}`;
        
        if (isGift) {
            cell.onclick = () => openModal(`Gift for ${monthName} ${d}`);
        }
        
        calGrid.appendChild(cell);
    }
    monthWrapper.appendChild(calGrid);
    gridContainer.appendChild(monthWrapper);
}

function changeMonth(delta) {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + delta);
    generateGrid();
}

function createPlusCard(onClickAction) {
    const card = document.createElement('div');
    card.className = "box available";
    card.style = "cursor: pointer; border: 2px dashed var(--terracotta); font-size: 3rem; color: var(--terracotta); display: flex; justify-content: center; align-items: center; height: 100%;";
    card.innerHTML = "<span>+</span>";
    card.onclick = onClickAction;
    return card;
}

// 6. PAGE 3 LOGIC: THE GREAT DEBATE (FIXED OVERFLOW)
function renderPolls() {
    const pollsView = document.getElementById('polls-view');
    if (!pollsView) return;

    pollsView.innerHTML = `
        <div class="debate-section">
            <h2 class="section-title ani-header-gradient separable-header" style="margin: 60px 0 30px; font-size: 1.8rem;"><span>Գոռ</span></h2>
            <div class="calendar-grid" id="gor-grid"></div>
        </div>
        <div class="debate-section">
            <h2 class="section-title ani-header-gradient separable-header" style="margin: 60px 0 30px; font-size: 1.8rem;"><span>Անի</span></h2>
            <div class="calendar-grid" id="ani-grid"></div>
        </div>
    `;

    const gorGrid = document.getElementById('gor-grid');
    const aniGrid = document.getElementById('ani-grid');

    // Use GOR_POLLS_DISPLAY which includes dynamic polls
    GOR_POLLS_DISPLAY.forEach((p, i) => {
        const id = p.id ? `gor_dyn_${p.id}` : `gor_static_${i}`;
        gorGrid.appendChild(createPollCard(p, id, i * 0.1));
    });

    // Plus Card for Gor
    const plusCardGor = createPlusCard(() => openPollCreator('gor'));
    gorGrid.appendChild(plusCardGor);

    // Ani's Polls
    ANI_POLLS.forEach((p, i) => aniGrid.appendChild(createPollCard(p, `ani_${p.id}`, (i + GOR_POLLS_DISPLAY.length) * 0.1)));

    // Plus Card for Ani
    const plusCardAni = createPlusCard(() => openPollCreator('ani'));
    aniGrid.appendChild(plusCardAni);
}

function createPollCard(p, id, delay) {
    const card = document.createElement('div');
    card.className = "box poll-card available";
    card.style.animationDelay = `${delay}s`;
    
    const existingVote = USER_VOTES[id];
    let pollHTML = ``;

    // Show delete button for any dynamic poll (Ani or Gor)
    if (id.startsWith('ani_')) {
        pollHTML += `<span class="delete-btn" onclick="confirmDelete('custom_polls/${p.id}')">&times;</span>`;
    } else if (id.startsWith('gor_dyn_')) {
        pollHTML += `<span class="delete-btn" onclick="confirmDelete('gor_custom_polls/${p.id}')">&times;</span>`;
    }

    pollHTML += `<div class="poll-question">${p.q}</div>`;
    
    // 3. Add the logic for answers
    if (existingVote) {
        pollHTML += `
            <div style="width: 100%;">
                <div class="user-answer-display">
                    <span style="font-size: 0.7rem; opacity: 0.6; display: block; text-transform: uppercase; letter-spacing: 1px;">Դուք պատասխանել եք</span>
                    <strong class="user-answer-text">${existingVote}</strong>
                </div>
                <button class="nav-btn" onclick="resetVote('${id}')" style="width: 100%; margin-top: 15px; font-size: 0.75rem; border: 1px solid var(--border-soft); padding: 10px;">Փոխել պատասխանը</button>
            </div>
        `;
    } else if (p.isOpenEnded) {
        pollHTML += `
            <div style="width: 100%; display: flex; flex-direction: column; gap: 12px;">
                <input type="text" id="open-input-${id}" placeholder="Գրիր այստեղ..." style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #ddd; text-align: center;">
                <button class="nav-btn active" onclick="submitOpenAnswer('${id}')" style="width: 100%; padding: 14px; font-weight: 700;">Ուղարկել</button>
            </div>
        `;
    } else {
        const count = p.options.length;
        const padding = count >= 4 ? "12px" : "16px";
        pollHTML += `
            <div style="width: 100%; display: flex; flex-direction: column; gap: 10px;">
                ${p.options.map(opt => `<button class="poll-btn" onclick="vote('${id}', '${opt}')" style="padding: ${padding}; width: 100%; font-weight: 600;">${opt}</button>`).join('')}
            </div>
        `;
    }
    
    card.innerHTML = pollHTML;
    return card;
}

let currentPollTarget = 'ani'; 

function openPollCreator(target) {
    currentPollTarget = target; 
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('content-modal');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div style="padding: 10px; text-align: left;">
                <h2 class="header-gradient" style="margin-bottom: 20px; text-align: center;">
                    Նոր հարց
                </h2>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; opacity: 0.7; margin-bottom: 8px;">ՀԱՐՑԸ</label>
                    <input type="text" id="new-poll-q" placeholder="Գրեք հարցը այստեղ..." style="width: 100%; text-align: left; padding: 12px;">
                </div>

                <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="is-open-ended" onchange="document.getElementById('options-setup').style.display = this.checked ? 'none' : 'block'" style="width: auto;">
                    <label for="is-open-ended" style="font-size: 0.9rem; font-weight: 600;">Բաց հարց (առանց տարբերակների)</label>
                </div>

                <div id="options-setup" style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 0.8rem; font-weight: 700; opacity: 0.7; margin-bottom: 8px;">ՏԱՐԲԵՐԱԿՆԵՐ</label>
                    <div id="options-list">
                        <input type="text" class="new-poll-opt" placeholder="Տարբերակ 1" style="width: 100%; text-align: left; margin-bottom: 8px; padding: 10px;">
                        <input type="text" class="new-poll-opt" placeholder="Տարբերակ 2" style="width: 100%; text-align: left; margin-bottom: 8px; padding: 10px;">
                    </div>
                    <button class="nav-btn" onclick="addOptionInput()" style="font-size: 0.7rem; padding: 5px 15px; margin-top: 5px;">+ Ավելացնել տարբերակ</button>
                </div>

                <button class="nav-btn active" onclick="saveNewPoll()" style="width: 100%; padding: 15px; margin-top: 10px;">Ստեղծել</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }
}

// Helper function to add more multiple-choice rows
function addOptionInput() {
    const list = document.getElementById('options-list');
    const input = document.createElement('input');
    input.type = "text";
    input.className = "new-poll-opt";
    input.placeholder = `Տարբերակ ${list.children.length + 1}`;
    input.style = "width: 100%; text-align: left; margin-bottom: 8px; padding: 10px;";
    list.appendChild(input);
}

function saveNewPoll() {
    const q = document.getElementById('new-poll-q').value.trim();
    const isOpenEnded = document.getElementById('is-open-ended').checked;
    if (q.length < 3) return;

    let newPoll = { q };
    if (isOpenEnded) {
        newPoll.isOpenEnded = true;
    } else {
        const options = Array.from(document.querySelectorAll('.new-poll-opt')).map(i => i.value.trim()).filter(v => v !== "");
        if (options.length < 2) return;
        newPoll.options = options;
    }

    // Determine path based on target
    const path = currentPollTarget === 'gor' ? 'gor_custom_polls' : 'custom_polls';
    database.ref(`debate_cards/${ROOM_ID}/${path}`).push(newPoll);
    closeModal();
}

function submitOpenAnswer(id) {
    const val = document.getElementById(`open-input-${id}`).value.trim();
    if (val) vote(id, val);
}

function vote(id, choice) { 
    trackEvent('poll_vote', 'Interaction', `Poll: ${id} | Choice: ${choice}`);
    database.ref(`debate_cards/${ROOM_ID}/votes/${id}`).set(choice);
}

function resetVote(id) { database.ref(`debate_cards/${ROOM_ID}/votes/${id}`).remove(); }

// 7. MUSIC PLAYER & MODALS
let trackIdx = 0;
const audio = document.getElementById('audio-element');
function setupMusic() {
    audio.volume = 0.5;
    updateTrackInfo();
    audio.onended = () => changeTrack(1);
    document.getElementById('volume-control').addEventListener('input', (e) => { audio.volume = e.target.value; });
}
function updateTrackInfo() {
    document.getElementById('current-track-name').innerText = PLAYLIST[trackIdx].title;
    audio.src = PLAYLIST[trackIdx].src;
}
function togglePlay() {
    const state = audio.paused ? 'Play' : 'Pause';
    trackEvent('music_control', 'Audio', state);
    const btn = document.getElementById('play-btn');
    if (audio.paused) { audio.play().catch(e => {}); btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; }
    else { audio.pause(); btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`; }
}
function changeTrack(d) {
    trackIdx = (trackIdx + d + PLAYLIST.length) % PLAYLIST.length;
    updateTrackInfo(); audio.play().catch(() => {});
}
function toggleMusicFold() { document.getElementById('music-container').classList.toggle('folded'); }
function openModal(d) {
    const mb = document.getElementById('modal-body');
    mb.innerHTML = `<h2 class="header-gradient" style="margin-bottom: 15px;">${d}</h2><p>Shared memory archived. 🔓</p><button class="nav-btn active" onclick="closeModal()" style="width: 100%; padding: 15px;">Close Archive</button>`;
    document.getElementById('content-modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('content-modal').classList.add('hidden'); }
function closeOnOutsideClick(e) { if (e.target.classList.contains('modal-overlay')) closeModal(); }

// --- PAGE 4 LOGIC: THOUGHTS (ՄՏՔԵՐ) ---
function renderThoughts() {
    const grid = document.getElementById('thoughts-grid');
    if (!grid) return;
    grid.innerHTML = "";

    // 1. Plus Card
    const plusCard = document.createElement('div');
    plusCard.className = "box available";
    plusCard.style = "cursor: pointer; border: 2px dashed var(--terracotta); font-size: 3rem; color: var(--terracotta); display: flex; justify-content: center; align-items: center; height: 320px;";
    plusCard.innerHTML = "<span>+</span>";
    plusCard.onclick = openThoughtCreator;
    grid.appendChild(plusCard);

    // 2. Render thoughts
    THOUGHTS.forEach((t, i) => {
        const card = document.createElement('div');
        card.className = "box thought-card available";
        
        const replies = t.replies ? Object.values(t.replies) : [];
        const replyCount = replies.length;

        // Condition: Only show "Կարդալ" if text is longer than 155 characters
        const needsReadMore = t.text.length > 155;

        card.innerHTML = `
            <span class="delete-btn" onclick="confirmDelete('thoughts/${t.id}')">&times;</span>
            <div class="thought-header">
                <div class="thought-author">${t.author}</div>
                <div class="thought-date">${t.date}</div>
            </div>
            <div class="thought-body" id="thought-scroll-${t.id}">
                <p class="thought-text">"${t.text}"</p>
            </div>
            
            <div class="thought-footer">
                ${needsReadMore ? `<button class="read-more-btn" onclick="toggleThoughtScroll('${t.id}', this)">Կարդալ</button>` : '<div></div>'}
                
                <button class="reply-count-btn" onclick="toggleReplyTray('${t.id}', true)">
                    💬 ${replyCount > 0 ? replyCount : 'Պատասխանել'}
                </button>
            </div>

            <div class="reply-tray" id="tray-${t.id}">
                <div class="tray-header">
                    <span class="tray-title">Պատասխաններ</span>
                    <span style="cursor:pointer; font-size:1.2rem;" onclick="toggleReplyTray('${t.id}', false)">&times;</span>
                </div>
                <div class="reply-list">
                    ${replies.length > 0 ? replies.map(r => `
                        <div class="chat-bubble">
                            <span class="chat-name">${r.author}</span>
                            <span class="chat-msg">${r.text}</span>
                        </div>
                    `).join('') : '<p style="font-size:0.75rem; opacity:0.5; text-align:center; margin-top:20px;">Դեռ պատասխաններ չկան...</p>'}
                </div>
                <div class="reply-input-bar">
                    <input type="text" id="input-${t.id}" placeholder="Անուն: Պատասխան..." onkeydown="if(event.key==='Enter') submitThoughtReply('${t.id}')">
                    <button class="send-icon-btn" onclick="submitThoughtReply('${t.id}')">></button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}


function toggleThought(index, btn) {
    const body = document.getElementById(`thought-body-${index}`);
    const isExpanded = body.classList.toggle('expanded');
    btn.innerText = isExpanded ? "Փակել" : "Կարդալ ավելին";
}

// Keep saveNewThought and openThoughtCreator the same as before...

function openThoughtCreator() {
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('content-modal');
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div style="padding: 10px; text-align: left;">
                <h2 class="header-gradient" style="margin-bottom: 20px; text-align: center;">Ավելացնել Միտք</h2>
                <label style="font-size: 0.8rem; font-weight: 700; opacity: 0.7;">ԱՆՈՒՆ</label>
                <input type="text" id="thought-author" placeholder="Ձեր անունը..." style="width: 100%; margin: 8px 0 20px;">
                <label style="font-size: 0.8rem; font-weight: 700; opacity: 0.7;">ՄԻՏՔ</label>
                <textarea id="thought-text" style="width: 100%; height: 120px; margin: 8px 0 20px; padding: 12px; border-radius: 12px; border: 1.5px solid #eee; font-family: inherit; resize: none;"></textarea>
                <button class="nav-btn active" onclick="saveNewThought()" style="width: 100%; padding: 15px;">Հաստատել</button>
            </div>
        `;
        modal.classList.remove('hidden');
    }
}

function saveNewThought() {
    const author = document.getElementById('thought-author').value.trim();
    const text = document.getElementById('thought-text').value.trim();
    
    if (author === "" || text === "") return;

    // Get Armenian Time for the timestamp
    const now = new Date();
    const options = { timeZone: 'Asia/Yerevan', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const amTime = new Intl.DateTimeFormat('hy-AM', options).format(now);

    const newThought = {
        author: author,
        text: text,
        date: amTime,
        timestamp: Date.now()
    };

    database.ref(`debate_cards/${ROOM_ID}/thoughts`).push(newThought);
    closeModal();
}

let pendingDeletePath = null; // Track what we want to delete

function confirmDelete(path) {
    pendingDeletePath = path;
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('content-modal');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div class="confirm-modal-content">
                <div style="font-size: 3rem; margin-bottom: 10px;">🗑️</div>
                <h2 class="confirm-modal-title">Ջնջե՞լ այս բաժինը</h2>
                <p class="confirm-modal-text">Արդյո՞ք վստահ եք, որ ցանկանում եք ջնջել այս տարրը: Այս գործողությունը հնարավոր չէ չեղարկել:</p>
                <div class="confirm-actions">
                    <button class="confirm-btn confirm-btn-no" onclick="closeModal()">Չեղարկել</button>
                    <button class="confirm-btn confirm-btn-yes" onclick="executeDelete()">Ջնջել</button>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    }
}

function executeDelete() {
    if (pendingDeletePath) {
        database.ref(`debate_cards/${ROOM_ID}/${pendingDeletePath}`).remove()
            .then(() => {
                console.log("Deleted successfully");
                pendingDeletePath = null;
                closeModal();
            })
            .catch(error => {
                console.error("Delete failed:", error);
                alert("Տեղի է ունեցել սխալ:");
            });
    }
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
                <button class="nav-btn aReports > Realtimective" onclick="submitMusicSuggestion()" style="width: 100%; padding: 15px;">Ուղարկել ընտրությունը</button>
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

function runWelcomeQuote() {
    const quoteContainer = document.getElementById('welcome-quote');
    if (!quoteContainer) return;

    const text = "This is a space where your words are always welcome. Speak, whisper, or simply leave a thought - I am here, listening, always.";
    
    // Split into words
    const words = text.split(" ");
    let charIndex = 0;

    words.forEach((word) => {
        // Create a span for each word to keep it together
        const wordSpan = document.createElement('span');
        wordSpan.style.whiteSpace = "nowrap"; 
        wordSpan.style.display = "inline-block";

        // Split word into characters
        const chars = word.split("");
        chars.forEach((char) => {
            const span = document.createElement('span');
            span.innerText = char;
            span.className = 'char';
            span.style.animationDelay = `${charIndex * 0.025}s`; 
            wordSpan.appendChild(span);
            charIndex++;
        });

        quoteContainer.appendChild(wordSpan);

        // Add a space after the word
        const space = document.createElement('span');
        space.innerText = "\u00A0"; // Non-breaking space
        quoteContainer.appendChild(space);
        charIndex++;
    });
}

function toggleReplyTray(id, show) {
    const tray = document.getElementById(`tray-${id}`);
    if (show) tray.classList.add('active');
    else tray.classList.remove('active');
}

function toggleThoughtScroll(id, btn) {
    const body = document.getElementById(`thought-scroll-${id}`);
    const isExpanded = body.classList.toggle('expanded');
    btn.innerText = isExpanded ? "Փակել" : "Կարդալ";
}

function submitThoughtReply(thoughtId) {
    const input = document.getElementById(`input-${thoughtId}`);
    const val = input.value.trim();
    
    if (!val.includes(':')) {
        alert("Խնդրում ենք գրել 'Անուն: Պատասխան' ձևաչափով");
        return;
    }

    const [author, ...msgArr] = val.split(':');
    const msg = msgArr.join(':').trim();

    if (author && msg) {
        database.ref(`debate_cards/${ROOM_ID}/thoughts/${thoughtId}/replies`).push({
            author: author.trim(),
            text: msg,
            timestamp: Date.now()
        });
        input.value = "";
    }
}


// 8. PARTICLE ENGINE
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
function initParticles() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    particles = [];
    for (let i = 0; i < 60; i++) particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, size: Math.random()*3+1, dx: (Math.random()-0.5)*0.4, dy: (Math.random()-0.5)*0.4, opacity: Math.random()*0.2+0.03 });
}
function animateParticles() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
        ctx.globalAlpha = p.opacity; ctx.fillStyle = '#e8b8a2'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x<0) p.x=canvas.width; if (p.x>canvas.width) p.x=0; if (p.y<0) p.y=canvas.height; if (p.y>canvas.height) p.y=0;
    });
    requestAnimationFrame(animateParticles);
}
/* --- INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Start the typewriter effect
    runWelcomeQuote();

    // 2. Setup the Enter key for login
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') {
                e.preventDefault(); 
                checkPassword(); 
            }
        });
    }
});

// Ensure particles and logic are properly closed
initParticles(); 
animateParticles();
window.onresize = initParticles;