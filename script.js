document.addEventListener('DOMContentLoaded', () => {
    // 1. FIREBASE CONFIG
    const firebaseConfig = {
        apiKey: "AIzaSyDiZ_S-OPWyUaBdcYxCJLTIrROn16C_U2E",
        authDomain: "prompt-hub-app-2fe0f.firebaseapp.com",
        projectId: "prompt-hub-app-2fe0f",
        storageBucket: "prompt-hub-app-2fe0f.firebasestorage.app",
        messagingSenderId: "242493810474",
        appId: "1:242493810474:web:d51af341a15f37897b2053"
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // API KEY
    const keyPart1 = "AQ.Ab8RN6LrzfYa_";
    const keyPart2 = "TPgPxzSEq_IUZMaYm";
    const keyPart3 = "X0GkLB59CVC8FD525Ghw";
    const GEMINI_API_KEY = keyPart1 + keyPart2 + keyPart3;

    // CROSS-PROMOTION SLIDER APPS
    const promoApps = [
        { name: "Amazing AI Promo", link: "https://raashanmart.in/download" },
        { name: "Radha Jaap Counter", link: "https://raashanmart.in/download" },
        { name: "Mudra Vault", link: "https://raashanmart.in/download" },
        { name: "EarnX", link: "https://raashanmart.in/download" }
    ];
    let currentPromoIdx = 0;
    const promoSlider = document.getElementById('promoSlider');

    setInterval(() => {
        currentPromoIdx = (currentPromoIdx + 1) % promoApps.length;
        promoSlider.innerHTML = `Try our other app: <span>${promoApps[currentPromoIdx].name}</span>`;
    }, 4000);
    promoSlider.innerHTML = `Try our other app: <span>${promoApps[0].name}</span>`;
    promoSlider.addEventListener('click', () => window.open(promoApps[currentPromoIdx].link, '_blank'));

    // GLOBALS & DOM
    let currentUser = null;
    let allOfficialPrompts = [];
    let allCommunityPrompts = [];
    let currentTab = 'official'; 
    let currentCategory = 'All';
    let currentSearch = '';
    let pendingAiRunData = null; // Stores AI prompt data while Ad is playing

    const promptContainer = document.getElementById('promptContainer');
    const authBtn = document.getElementById('authBtn');

    window.showCustomAlert = function(message) {
        document.getElementById('themeAlertText').innerHTML = message;
        document.getElementById('themeAlertModal').style.display = 'block';
    }

    // AUTH LOGIC
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            authBtn.textContent = "Logout";
            authBtn.classList.add('logout-state');
        } else {
            currentUser = null;
            authBtn.textContent = "Login";
            authBtn.classList.remove('logout-state');
        }
        updateTabsUI();
        filterAndRender();
    });

    authBtn.addEventListener('click', async () => {
        if (currentUser) {
            await auth.signOut();
            showCustomAlert("Logged out successfully! 👋");
        } else {
            document.getElementById('authModal').style.display = 'block';
        }
    });

    // DATA FETCHING
    async function fetchOfficialPrompts() {
        try {
            const response = await fetch('prompts.json?t=' + Date.now());
            allOfficialPrompts = await response.json();
            filterAndRender();
        } catch (e) { console.log(e); }
    }

    async function fetchCommunityPrompts() {
        try {
            const snapshot = await db.collection('community_prompts').orderBy('timestamp', 'desc').get();
            allCommunityPrompts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if(currentTab === 'community' || currentTab === 'leaderboard') filterAndRender();
        } catch(e) { console.log(e); }
    }

    // TABS
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            if (e.target.id === 'tabOfficial') currentTab = 'official';
            if (e.target.id === 'tabCommunity') currentTab = 'community';
            if (e.target.id === 'tabSaved') currentTab = 'saved';
            if (e.target.id === 'tabLeaderboard') currentTab = 'leaderboard';
            
            updateTabsUI();
            if(currentTab === 'community' || currentTab === 'leaderboard') fetchCommunityPrompts(); 
            else filterAndRender();
        });
    });

    function updateTabsUI() {
        if(currentTab === 'leaderboard' || currentTab === 'saved') {
            document.getElementById('categoryFilter').style.display = 'none';
        } else {
            document.getElementById('categoryFilter').style.display = 'flex';
        }
    }

    // RENDER LEADERBOARD
    function renderLeaderboard() {
        promptContainer.innerHTML = '';
        const userScores = {};
        
        allCommunityPrompts.forEach(p => {
            if(p.status === 'approved' && p.authorEmail) {
                userScores[p.authorEmail] = (userScores[p.authorEmail] || 0) + (p.upvotes || 0);
            }
        });

        const sortedUsers = Object.keys(userScores).map(email => ({
            email: email.split('@')[0], 
            score: userScores[email]
        })).sort((a, b) => b.score - a.score).slice(0, 10); // Top 10

        if(sortedUsers.length === 0) {
            promptContainer.innerHTML = `<p style="text-align:center; margin-top:30px; color:var(--text-muted);">No data available yet.</p>`;
            return;
        }

        let html = `<div class="leaderboard-list">
            <h2 style="text-align:center; margin-bottom:10px; color:var(--accent-blue);">🏆 Top Creators</h2>`;
        
        sortedUsers.forEach((u, idx) => {
            let rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`;
            html += `
                <div class="lb-item">
                    <span class="lb-rank">${rankBadge}</span>
                    <span class="lb-name">@${u.email}</span>
                    <span class="lb-score">❤️ ${u.score}</span>
                </div>
            `;
        });
        html += `</div>`;
        promptContainer.innerHTML = html;
    }

    // RENDER CARDS
    function filterAndRender() {
        if (currentTab === 'leaderboard') {
            renderLeaderboard();
            return;
        }

        let dataset = currentTab === 'official' ? [...allOfficialPrompts] : [...allCommunityPrompts];
        
        if (currentTab === 'community') {
            dataset = dataset.filter(p => p.status === 'approved');
        } else if (currentTab === 'saved') {
            const bookmarks = JSON.parse(localStorage.getItem(currentUser ? `bookmarks_${currentUser.uid}` : `bookmarks_guest`)) || [];
            dataset = [...allOfficialPrompts, ...allCommunityPrompts].filter(p => bookmarks.includes(p.id));
        }

        promptContainer.innerHTML = '';
        dataset.forEach(prompt => {
            const fullText = prompt.prompt_text || '';
            const encTitle = encodeURIComponent(prompt.title || 'Untitled');
            const encText = encodeURIComponent(fullText);

            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.innerHTML = `
                <div class="card-header-row">
                    <div class="badges-container"><span class="category-badge">${prompt.category || 'General'}</span></div>
                </div>
                <h3>${prompt.title || 'Untitled'}</h3>
                <p class="preview-text" onclick="window.copyPrompt('${encText}')">"${fullText.substring(0, 60)}..."</p>
                <div class="action-row">
                    <button class="action-btn run-ai-btn" onclick="initiateAiRun('${encTitle}', '${encText}')">✨ Run AI</button>
                    <button class="action-btn copy-card-btn" onclick="window.copyPrompt('${encText}')">📋 Copy</button>
                    <button class="action-btn share-btn" onclick="window.sharePrompt('${encTitle}', '${encText}')">📲 Share</button>
                    <button class="action-btn export-btn" onclick="exportToImage('${encTitle}', '${encText}')">🖼️ Export</button>
                </div>
            `;
            promptContainer.appendChild(card);
        });
    }

    window.copyPrompt = function(encText) {
        navigator.clipboard.writeText(decodeURIComponent(encText)).then(() => showCustomAlert("Prompt Copied to Clipboard! 🚀"));
    }

    // SHARE LOGIC
    window.sharePrompt = function(encTitle, encText) {
        const title = decodeURIComponent(encTitle);
        const text = decodeURIComponent(encText);
        const url = window.location.href.split('?')[0]; 
        const shareData = { title: 'Prompt Hub', text: `*${title}*\n"${text}"\n`, url: url };
        if (navigator.share) navigator.share(shareData).catch(e=>{});
        else window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + url)}`, '_blank');
    }

    // EXPORT TO IMAGE LOGIC (HTML2CANVAS)
    window.exportToImage = async function(encTitle, encText) {
        const title = decodeURIComponent(encTitle);
        const text = decodeURIComponent(encText);
        
        const container = document.getElementById('exportCanvasContainer');
        container.innerHTML = `
            <div id="posterTarget" class="export-poster">
                <div class="export-brand">Prompt Hub 🚀</div>
                <div class="export-title">${title}</div>
                <div class="export-text">"${text.length > 300 ? text.substring(0,300) + '...' : text}"</div>
                <div class="export-footer">Find more at raashanmart.in</div>
            </div>
        `;
        
        try {
            showCustomAlert("Generating Image... 📸");
            const canvas = await html2canvas(document.getElementById('posterTarget'), {scale: 2});
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `PromptHub_${title.replace(/\s+/g, '_')}.png`;
            link.href = imgData;
            link.click();
            container.innerHTML = ''; // Clean up
        } catch(e) { showCustomAlert("Error generating image."); }
    }

    // ADMOB REWARDED AD LOGIC FOR AI RUN
    window.initiateAiRun = function(encTitle, encText) {
        pendingAiRunData = { title: encTitle, text: encText };
        
        // Show Prompt to watch Ad
        document.getElementById('adPromptModal').style.display = 'block';
    }

    document.getElementById('watchAdBtn').addEventListener('click', () => {
        document.getElementById('adPromptModal').style.display = 'none';
        
        // ------------- ADMOB SDK BRIDGE INJECTION POINT -------------
        // If wrapped in Android Web2App, you would call:
        // Android.showRewardedAd();
        // Here, we simulate the Ad Experience for Web PWA:
        
        const adModal = document.getElementById('simulatedAdModal');
        const timerTxt = document.getElementById('adTimer');
        adModal.style.display = 'block';
        
        let time = 3;
        timerTxt.innerText = time;
        const interval = setInterval(() => {
            time--;
            timerTxt.innerText = time;
            if (time <= 0) {
                clearInterval(interval);
                adModal.style.display = 'none';
                
                // Trigger Actual AI Modal after Ad finishes
                if(pendingAiRunData) {
                    openAiModal(pendingAiRunData.title, pendingAiRunData.text);
                }
            }
        }, 1000);
    });

    // AI GENERATION MODAL
    function openAiModal(encTitle, encText) {
        const title = decodeURIComponent(encTitle);
        currentAiPromptText = decodeURIComponent(encText);
        
        document.getElementById('aiPromptTitle').textContent = title;
        const dynamicContainer = document.getElementById('dynamicInputsContainer');
        dynamicContainer.innerHTML = '';
        document.getElementById('aiOutputContainer').style.display = 'none';
        
        const matches = [...currentAiPromptText.matchAll(/\[(.*?)\]/g)];
        const uniqueVars = [...new Set(matches.map(m => m[1]))]; 
        
        if (uniqueVars.length === 0) {
            dynamicContainer.innerHTML = '<p style="color:var(--accent-green); margin-bottom:15px;">No variables detected. Run directly!</p>';
        } else {
            uniqueVars.forEach(vName => {
                dynamicContainer.insertAdjacentHTML('beforeend', `
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 13px; color: var(--text-muted); display:block; text-transform: capitalize;">${vName}:</label>
                        <input type="text" class="ai-var-input" data-var="${vName}" placeholder="Enter ${vName}..." style="margin-bottom: 0;">
                    </div>
                `);
            });
        }
        document.getElementById('aiRunModal').style.display = 'block';
    }

    // CALL GEMINI AI API
    document.getElementById('generateAiBtn').addEventListener('click', async () => {
        const btn = document.getElementById('generateAiBtn');
        let finalPrompt = currentAiPromptText;
        
        document.querySelectorAll('.ai-var-input').forEach(input => {
            const varName = input.getAttribute('data-var');
            const val = input.value.trim() || `[${varName}]`; 
            finalPrompt = finalPrompt.replace(new RegExp(`\\[${varName}\\]`, 'g'), val);
        });

        btn.innerHTML = "✨ Generating...";
        btn.disabled = true;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            const markdownText = data.candidates[0].content.parts[0].text;
            document.getElementById('aiOutputText').innerHTML = marked.parse(markdownText);
            document.getElementById('aiOutputContainer').style.display = 'block';

            document.getElementById('copyAiOutputBtn').onclick = () => {
                navigator.clipboard.writeText(markdownText).then(()=>showCustomAlert("AI Output Copied! 🚀"));
            };
        } catch (err) {
            showCustomAlert("Error: " + err.message);
        } finally {
            btn.innerHTML = "Generate Output";
            btn.disabled = false;
        }
    });

    fetchOfficialPrompts();
});
