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

    // CROSS-PROMOTION SLIDER
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

    // GLOBALS
    let currentUser = null;
    let isAdmin = false;
    let allOfficialPrompts = [];
    let allCommunityPrompts = [];
    let currentTab = 'official'; 
    let currentCategory = 'All';
    let currentSearch = '';
    
    let pendingAiRunData = null; 
    let currentGeneratedOutputHtml = ''; // For Export functionality
    let currentGeneratedOutputTitle = '';

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
            isAdmin = ['lootocashnow@gmail.com', 'shjain86@gmail.com'].includes(user.email);
            authBtn.textContent = "Logout";
            authBtn.classList.add('logout-state');
        } else {
            currentUser = null;
            isAdmin = false;
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

    // FETCH DATA
    async function fetchOfficialPrompts() {
        try {
            const res = await fetch('prompts.json?t=' + Date.now());
            allOfficialPrompts = await res.json();
            filterAndRender();
        } catch (e) { console.log(e); }
    }

    async function fetchCommunityPrompts() {
        try {
            const snap = await db.collection('community_prompts').orderBy('timestamp', 'desc').get();
            allCommunityPrompts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        document.getElementById('categoryFilter').style.display = (currentTab === 'leaderboard' || currentTab === 'saved') ? 'none' : 'flex';
    }

    // RENDER CARDS & LEADERBOARD
    function filterAndRender() {
        if (currentTab === 'leaderboard') {
            const userScores = {};
            allCommunityPrompts.forEach(p => {
                if(p.status === 'approved' && p.authorEmail) userScores[p.authorEmail] = (userScores[p.authorEmail] || 0) + (p.upvotes || 0);
            });
            const sortedUsers = Object.keys(userScores).map(email => ({email: email.split('@')[0], score: userScores[email]})).sort((a,b) => b.score - a.score).slice(0,10);
            
            if(sortedUsers.length === 0) return promptContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted);">No data available yet.</p>`;
            
            let html = `<div class="leaderboard-list"><h2 style="text-align:center; margin-bottom:10px; color:var(--accent-blue);">🏆 Top Creators</h2>`;
            sortedUsers.forEach((u, idx) => {
                let rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`;
                html += `<div class="lb-item"><span class="lb-rank">${rank}</span><span class="lb-name">@${u.email}</span><span class="lb-score">❤️ ${u.score}</span></div>`;
            });
            return promptContainer.innerHTML = html + `</div>`;
        }

        let dataset = currentTab === 'official' ? [...allOfficialPrompts] : [...allCommunityPrompts];
        if (currentTab === 'community') dataset = dataset.filter(p => p.status === 'approved');
        else if (currentTab === 'saved') {
            const bookmarks = JSON.parse(localStorage.getItem(currentUser ? `bookmarks_${currentUser.uid}` : `bookmarks_guest`)) || [];
            dataset = [...allOfficialPrompts, ...allCommunityPrompts].filter(p => bookmarks.includes(p.id));
        }

        promptContainer.innerHTML = '';
        dataset.forEach(prompt => {
            const encTitle = encodeURIComponent(prompt.title || 'Untitled');
            const encText = encodeURIComponent(prompt.prompt_text || '');
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.innerHTML = `
                <div class="card-header-row">
                    <div class="badges-container"><span class="category-badge">${prompt.category || 'General'}</span></div>
                </div>
                <h3>${prompt.title || 'Untitled'}</h3>
                <p class="preview-text" onclick="window.copyPrompt('${encText}')">"${(prompt.prompt_text||'').substring(0, 60)}..."</p>
                <div class="action-row">
                    <button class="action-btn run-ai-btn" onclick="initiateAiRun('${encTitle}', '${encText}')">✨ Run AI</button>
                    <button class="action-btn copy-card-btn" onclick="window.copyPrompt('${encText}')">📋 Copy Prompt</button>
                    <button class="action-btn share-btn" onclick="window.sharePrompt('${encTitle}', '${encText}')">📲 Share</button>
                </div>
            `;
            promptContainer.appendChild(card);
        });
    }

    window.copyPrompt = function(encText) {
        navigator.clipboard.writeText(decodeURIComponent(encText)).then(() => showCustomAlert("Copied to Clipboard! 🚀"));
    }

    window.sharePrompt = function(encTitle, encText) {
        const shareData = { title: 'Prompt Hub', text: `*${decodeURIComponent(encTitle)}*\n"${decodeURIComponent(encText)}"\n`, url: window.location.href.split('?')[0] };
        if (navigator.share) navigator.share(shareData).catch(()=>{});
        else window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + shareData.url)}`, '_blank');
    }

    // AI RUN & REWARDED AD LOGIC
    window.initiateAiRun = function(encTitle, encText) {
        pendingAiRunData = { title: encTitle, text: encText };
        document.getElementById('adPromptModal').style.display = 'block';
    }

    document.getElementById('watchAdBtn').addEventListener('click', () => {
        document.getElementById('adPromptModal').style.display = 'none';
        const adModal = document.getElementById('simulatedAdModal');
        adModal.style.display = 'block';
        
        let time = 3;
        document.getElementById('adTimer').innerText = time;
        const interval = setInterval(() => {
            time--;
            document.getElementById('adTimer').innerText = time;
            if (time <= 0) {
                clearInterval(interval);
                adModal.style.display = 'none';
                if(pendingAiRunData) openAiModal(pendingAiRunData.title, pendingAiRunData.text);
            }
        }, 1000);
    });

    function openAiModal(encTitle, encText) {
        currentGeneratedOutputTitle = decodeURIComponent(encTitle);
        let baseText = decodeURIComponent(encText);
        
        document.getElementById('aiPromptTitle').textContent = currentGeneratedOutputTitle;
        const container = document.getElementById('dynamicInputsContainer');
        container.innerHTML = '';
        document.getElementById('aiOutputContainer').style.display = 'none';
        
        const matches = [...baseText.matchAll(/\[(.*?)\]/g)];
        const uniqueVars = [...new Set(matches.map(m => m[1]))]; 
        
        if (uniqueVars.length === 0) {
            container.innerHTML = '<p style="color:var(--accent-green); margin-bottom:15px;">No variables detected. Run directly!</p>';
        } else {
            uniqueVars.forEach(vName => {
                container.insertAdjacentHTML('beforeend', `
                    <div>
                        <label style="font-size:13px; color:var(--text-muted); display:block; text-transform:capitalize; margin-bottom:5px;">${vName}:</label>
                        <input type="text" class="ai-var-input" data-var="${vName}" placeholder="Enter ${vName}...">
                    </div>
                `);
            });
        }
        // Save base text for generation
        document.getElementById('generateAiBtn').setAttribute('data-base', encodeURIComponent(baseText));
        document.getElementById('aiRunModal').style.display = 'block';
    }

    document.getElementById('generateAiBtn').addEventListener('click', async (e) => {
        const btn = e.target;
        let finalPrompt = decodeURIComponent(btn.getAttribute('data-base'));
        
        document.querySelectorAll('.ai-var-input').forEach(input => {
            const varName = input.getAttribute('data-var');
            const val = input.value.trim() || `[${varName}]`; 
            finalPrompt = finalPrompt.replace(new RegExp(`\\[${varName}\\]`, 'g'), val);
        });

        btn.innerHTML = "✨ Generating...";
        btn.disabled = true;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            const markdownText = data.candidates[0].content.parts[0].text;
            currentGeneratedOutputHtml = marked.parse(markdownText); // Save HTML for export
            
            document.getElementById('aiOutputText').innerHTML = currentGeneratedOutputHtml;
            document.getElementById('aiOutputContainer').style.display = 'block';

            document.getElementById('copyAiOutputBtn').onclick = () => {
                navigator.clipboard.writeText(markdownText).then(()=>showCustomAlert("Output Copied! 🚀"));
            };
        } catch (err) {
            showCustomAlert("Error: " + err.message);
        } finally {
            btn.innerHTML = "Generate Output";
            btn.disabled = false;
        }
    });

    // OUTPUT EXPORT WITH WATERMARK AD-WALL
    document.getElementById('exportAiOutputBtn').addEventListener('click', () => {
        document.getElementById('aiRunModal').style.display = 'none';
        document.getElementById('watermarkModal').style.display = 'block';
    });

    document.getElementById('downloadFreeBtn').addEventListener('click', () => {
        document.getElementById('watermarkModal').style.display = 'none';
        executeExport(true); // true = With Watermark
    });

    document.getElementById('downloadAdBtn').addEventListener('click', () => {
        document.getElementById('watermarkModal').style.display = 'none';
        
        // ------------- ADMOB SDK REWARDED AD FOR WATERMARK REMOVAL -------------
        const adModal = document.getElementById('simulatedAdModal');
        adModal.style.display = 'block';
        
        let time = 3;
        document.getElementById('adTimer').innerText = time;
        const interval = setInterval(() => {
            time--;
            document.getElementById('adTimer').innerText = time;
            if (time <= 0) {
                clearInterval(interval);
                adModal.style.display = 'none';
                executeExport(false); // false = No Watermark
            }
        }, 1000);
    });

    async function executeExport(withWatermark) {
        showCustomAlert("Generating Image... 📸");
        const container = document.getElementById('exportCanvasContainer');
        
        let watermarkHtml = withWatermark ? `<div class="watermark-overlay">PROMPT HUB</div>` : '';

        container.innerHTML = `
            <div id="posterTarget" class="export-poster">
                ${watermarkHtml}
                <div class="export-brand">Prompt Hub 🚀</div>
                <div class="export-title">${currentGeneratedOutputTitle}</div>
                <div class="export-text">${currentGeneratedOutputHtml}</div>
                <div class="export-footer">Generated via raashanmart.in/prompthub</div>
            </div>
        `;
        
        try {
            // Need a slight delay for DOM to render the new HTML properly before canvas paints
            setTimeout(async () => {
                const canvas = await html2canvas(document.getElementById('posterTarget'), {scale: 2, backgroundColor: '#0f172a'});
                const imgData = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `Output_${currentGeneratedOutputTitle.replace(/\s+/g, '_')}.png`;
                link.href = imgData;
                link.click();
                container.innerHTML = ''; 
            }, 500);
        } catch(e) { showCustomAlert("Error generating image."); }
    }

    fetchOfficialPrompts();
});
