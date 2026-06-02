document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. FIREBASE CONFIGURATION
    // ==========================================
    const firebaseConfig = {
        apiKey: "AIzaSyDiZ_S-OPWyUaBdcYxCJLTIrROn16C_U2E",
        authDomain: "prompt-hub-app-2fe0f.firebaseapp.com",
        projectId: "prompt-hub-app-2fe0f",
        storageBucket: "prompt-hub-app-2fe0f.firebasestorage.app",
        messagingSenderId: "242493810474",
        appId: "1:242493810474:web:d51af341a15f37897b2053"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const auth = firebase.auth();
    const db = firebase.firestore();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    const ADMIN_EMAILS = [
        'lootocashnow@gmail.com', 
        'shjain86@gmail.com'
    ]; 

    // ==========================================
    // 2. CROSS-PROMOTION SLIDER
    // ==========================================
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
    
    promoSlider.addEventListener('click', () => {
        window.open(promoApps[currentPromoIdx].link, '_blank');
    });

    // ==========================================
    // 3. GLOBALS & DOM ELEMENTS
    // ==========================================
    let currentUser = null;
    let isAdmin = false;
    let isLoginMode = true;
    
    let allOfficialPrompts = [];
    let allCommunityPrompts = [];
    
    let currentTab = 'official'; 
    let currentCategory = 'All';
    let currentSearch = '';
    
    let pendingAiRunData = null; 
    let currentGeneratedOutputHtml = ''; 
    let currentGeneratedOutputTitle = '';
    let textToCopy = '';
    
    let userProfileData = {}; 
    let selectedAvatar = '👨‍💻'; 

    const promptContainer = document.getElementById('promptContainer');
    const authBtn = document.getElementById('authBtn');

    window.showCustomAlert = function(message) {
        document.getElementById('themeAlertText').innerHTML = message;
        document.getElementById('themeAlertModal').style.display = 'block';
    };

    document.getElementById('hamburgerBtn').addEventListener('click', () => {
        document.getElementById('sideMenu').classList.add('open');
        document.getElementById('sideMenuOverlay').style.display = 'block';
    });

    document.getElementById('sideMenuOverlay').addEventListener('click', () => {
        document.getElementById('sideMenu').classList.remove('open');
        document.getElementById('sideMenuOverlay').style.display = 'none';
    });

    // ==========================================
    // 4. AUTHENTICATION, WALLET, STREAK & PROFILE 
    // ==========================================
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            isAdmin = ADMIN_EMAILS.includes(user.email);
            
            authBtn.textContent = "Logout";
            authBtn.classList.add('logout-state');
            
            document.getElementById('coinWallet').style.display = 'flex';
            document.getElementById('headerProfileBtn').style.display = 'block';

            const userRef = db.collection('users').doc(user.uid);
            const doc = await userRef.get();
            
            let defaultName = user.displayName || user.email.split('@')[0];
            let todayStr = new Date().toDateString();

            if (!doc.exists) {
                // FIRST TIME LOGIN
                userProfileData = { 
                    email: user.email, 
                    coins: 20, 
                    name: defaultName, 
                    avatar: '👨‍💻',
                    streak: 1,
                    lastLoginDate: todayStr
                };
                
                await userRef.set({ 
                    ...userProfileData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() 
                });
                
                document.getElementById('coinCount').innerText = "20";
                
                document.getElementById('welcomeTitle').textContent = "Welcome Aboard! 🚀";
                document.getElementById('welcomeMessage').textContent = `Hi ${userProfileData.name}, you've received 20 Free Coins to start generating!`;
                document.getElementById('welcomeModal').style.display = 'block';
                
            } else {
                // EXISTING USER (Check Streak)
                userProfileData = doc.data();
                
                if (!userProfileData.name) userProfileData.name = defaultName;
                if (!userProfileData.avatar) userProfileData.avatar = '👨‍💻';
                
                let streak = userProfileData.streak || 0;
                let lastLogin = userProfileData.lastLoginDate || "";
                
                if (lastLogin !== todayStr) {
                    let yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    if (lastLogin === yesterday.toDateString()) {
                        streak += 1; // Consecutive day!
                    } else {
                        streak = 1; // Missed a day
                    }
                    
                    let reward = (streak % 7 === 0) ? 50 : 5; // 50 coins every 7th day
                    let newCoins = (userProfileData.coins || 0) + reward;
                    
                    userProfileData.streak = streak;
                    userProfileData.lastLoginDate = todayStr;
                    userProfileData.coins = newCoins;
                    
                    await userRef.set({ 
                        streak: streak, 
                        lastLoginDate: todayStr, 
                        coins: newCoins 
                    }, { merge: true });
                    
                    document.getElementById('coinCount').innerText = newCoins;
                    
                    document.getElementById('welcomeTitle').textContent = `Day ${streak} Streak! 🔥`;
                    document.getElementById('welcomeMessage').textContent = `Welcome back, ${userProfileData.name}! You earned ${reward} Coins for your daily login.`;
                    document.getElementById('welcomeModal').style.display = 'block';
                } else {
                    document.getElementById('coinCount').innerText = userProfileData.coins || 0;
                }
            }
            
        } else {
            currentUser = null;
            isAdmin = false;
            userProfileData = {};
            
            authBtn.textContent = "Login";
            authBtn.classList.remove('logout-state');
            
            document.getElementById('coinWallet').style.display = 'none';
            document.getElementById('headerProfileBtn').style.display = 'none';
            
            if (currentTab === 'profile') {
                document.getElementById('tabOfficial').click();
            }
        }
        
        updateTabsUI();
        filterAndRender();
    });

    window.updateCoins = async function(amount) {
        if (!currentUser) return false;
        
        const userRef = db.collection('users').doc(currentUser.uid);
        
        try {
            const doc = await userRef.get();
            let currentCoins = doc.exists ? (doc.data().coins || 0) : 0;
            
            if (currentCoins + amount < 0) return false; 
            
            await userRef.set({ 
                coins: currentCoins + amount 
            }, { 
                merge: true 
            });
            
            document.getElementById('coinCount').innerText = currentCoins + amount;
            userProfileData.coins = currentCoins + amount;
            
            if (currentTab === 'profile') {
                renderProfileDashboard();
            }
            return true;
        } catch (e) { 
            return false; 
        }
    };

    window.showCoinModal = function() {
        document.getElementById('coinModal').style.display = 'block';
    };

    document.getElementById('watchAdForCoinsBtn').addEventListener('click', () => {
        document.getElementById('coinModal').style.display = 'none';
        
        const adModal = document.getElementById('simulatedAdModal');
        adModal.style.display = 'block';
        
        let time = 3; 
        document.getElementById('adTimer').innerText = time;
        
        const interval = setInterval(async () => {
            time--; 
            document.getElementById('adTimer').innerText = time;
            
            if (time <= 0) {
                clearInterval(interval);
                adModal.style.display = 'none';
                
                await updateCoins(15); 
                showCustomAlert("💰 15 Coins added successfully!");
            }
        }, 1000);
    });

    authBtn.addEventListener('click', async () => {
        if (currentUser) {
            await auth.signOut();
            showCustomAlert("Logged out successfully! 👋");
        } else {
            document.getElementById('authModal').style.display = 'block';
        }
    });

    const toggleAuthMode = document.getElementById('toggleAuthMode');
    
    toggleAuthMode.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            document.getElementById('modalTitle').textContent = "Login";
            document.getElementById('submitAuthBtn').textContent = "Login";
            toggleAuthMode.innerHTML = "Don't have an account? <span>Sign Up</span>";
        } else {
            document.getElementById('modalTitle').textContent = "Create Account";
            document.getElementById('submitAuthBtn').textContent = "Sign Up";
            toggleAuthMode.innerHTML = "Already have an account? <span>Login</span>";
        }
    });

    document.getElementById('submitAuthBtn').addEventListener('click', async () => {
        const email = document.getElementById('emailInput').value.trim();
        const pwd = document.getElementById('passwordInput').value.trim();
        if (!email || !pwd) return showCustomAlert("Please fill all fields.");
        try {
            if (isLoginMode) {
                await auth.signInWithEmailAndPassword(email, pwd);
            } else {
                await auth.createUserWithEmailAndPassword(email, pwd);
            }
            document.getElementById('authModal').style.display = 'none';
        } catch (error) { showCustomAlert(error.message); }
    });

    document.getElementById('googleAuthBtn').addEventListener('click', async () => {
        try {
            await auth.signInWithPopup(googleProvider);
            document.getElementById('authModal').style.display = 'none';
        } catch (error) { showCustomAlert(error.message); }
    });

    document.getElementById('forgotPasswordBtn').addEventListener('click', async () => {
        const email = document.getElementById('emailInput').value.trim();
        if (!email) return showCustomAlert("Please enter your email address first.");
        try {
            await auth.sendPasswordResetEmail(email);
            showCustomAlert("Password reset link sent to your email!");
            document.getElementById('authModal').style.display = 'none';
        } catch (error) { showCustomAlert(error.message); }
    });

    // ==========================================
    // 5. DATA FETCHING & FILTERING
    // ==========================================
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
            allCommunityPrompts = snap.docs.map(doc => { return { id: doc.id, ...doc.data() }; });
            if (currentTab === 'community' || currentTab === 'leaderboard' || currentTab === 'profile') {
                filterAndRender();
            }
        } catch(e) { console.log(e); }
    }

    function getBookmarksKey() { return currentUser ? `bookmarks_${currentUser.uid}` : `bookmarks_guest`; }
    function getBookmarks() { return JSON.parse(localStorage.getItem(getBookmarksKey())) || []; }

    window.toggleBookmark = function(pId) {
        let bookmarks = getBookmarks();
        if (bookmarks.includes(pId)) {
            bookmarks = bookmarks.filter(id => id !== pId);
            showCustomAlert("Removed from Saved ⭐");
        } else {
            bookmarks.push(pId);
            showCustomAlert("Saved to My Prompts ⭐");
        }
        localStorage.setItem(getBookmarksKey(), JSON.stringify(bookmarks));
        filterAndRender();
    }

    document.getElementById('headerProfileBtn').addEventListener('click', () => {
        if (!currentUser) return showCustomAlert("Please Login to view your Profile! 👤");
        document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); });
        currentTab = 'profile';
        updateTabsUI();
        fetchCommunityPrompts();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); });
            e.target.classList.add('active');
            
            if (e.target.id === 'tabOfficial') currentTab = 'official';
            if (e.target.id === 'tabCommunity') currentTab = 'community';
            if (e.target.id === 'tabSaved') currentTab = 'saved';
            if (e.target.id === 'tabLeaderboard') currentTab = 'leaderboard';
            
            updateTabsUI();
            
            if (currentTab === 'community' || currentTab === 'leaderboard') {
                fetchCommunityPrompts(); 
            } else {
                filterAndRender();
            }
        });
    });

    function updateTabsUI() {
        if (currentTab === 'leaderboard' || currentTab === 'saved' || currentTab === 'profile') {
            document.getElementById('categoryFilter').style.display = 'none';
        } else {
            document.getElementById('categoryFilter').style.display = 'flex';
        }
        
        if ((currentTab === 'community' || currentTab === 'profile') && currentUser) {
            document.getElementById('openAddPromptBtn').style.display = 'block';
        } else {
            document.getElementById('openAddPromptBtn').style.display = 'none';
        }
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); });
            e.target.classList.add('active');
            currentCategory = e.target.getAttribute('data-category');
            filterAndRender();
        });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => { 
        currentSearch = e.target.value; filterAndRender(); 
    });

// ================= YAHAN PART 1 KHATAM HOTA HAI =================
// ==========================================
// 6. AI RUN FLOW
// ==========================================
window.initiateAiRun = function(encTitle, encText) {
    pendingAiRunData = { 
        title: encTitle, 
        text: encText 
    };
    document.getElementById('adPromptModal').style.display = 'block';
};

document.getElementById('watchAdBtn').addEventListener('click', () => {
    document.getElementById('adPromptModal').style.display = 'none';
    document.getElementById('simulatedAdModal').style.display = 'block';
    
    let time = 3;
    document.getElementById('adTimer').innerText = time;
    
    const interval = setInterval(() => {
        time--; 
        document.getElementById('adTimer').innerText = time;
        
        if (time <= 0) {
            clearInterval(interval);
            document.getElementById('simulatedAdModal').style.display = 'none';
            
            if (pendingAiRunData) {
                currentGeneratedOutputTitle = decodeURIComponent(pendingAiRunData.title);
                document.getElementById('aiPromptTitle').textContent = currentGeneratedOutputTitle;
                
                const container = document.getElementById('dynamicInputsContainer');
                container.innerHTML = ''; 
                document.getElementById('aiOutputContainer').style.display = 'none';
                
                const matches = [...decodeURIComponent(pendingAiRunData.text).matchAll(/\[(.*?)\]/g)];
                const uniqueVars = [...new Set(matches.map(m => m[1]))]; 
                
                if (uniqueVars.length === 0) {
                    container.innerHTML = `
                        <p style="color:var(--accent-green); margin-bottom:15px;">
                            No variables detected. Run directly!
                        </p>
                    `;
                } else {
                    uniqueVars.forEach(vName => { 
                        container.insertAdjacentHTML('beforeend', `
                            <div>
                                <label style="font-size:13px; color:var(--text-muted); display:block; text-transform:capitalize; margin-bottom:5px;">
                                    ${vName}:
                                </label>
                                <input type="text" class="ai-var-input" data-var="${vName}" placeholder="Enter ${vName}...">
                            </div>
                        `); 
                    });
                }
                document.getElementById('aiRunModal').style.display = 'block';
            }
        }
    }, 1000);
});

// ==========================================
// 7. AI PROMPT ENHANCER (🪄 NEW)
// ==========================================
document.getElementById('enhancePromptBtn').addEventListener('click', async () => {
    const promptArea = document.getElementById('promptText');
    if (!promptArea.value.trim()) return showCustomAlert("Please enter a basic idea first!");
    
    let hasCoins = await updateCoins(-2);
    if (!hasCoins) return showCoinModal();
    
    const btn = document.getElementById('enhancePromptBtn');
    btn.innerHTML = "🪄 Enhancing...";
    btn.disabled = true;
    
    // Simulate AI enhancement delay
    setTimeout(() => {
        promptArea.value = "Enhanced Prompt: " + promptArea.value.trim() + " [Make this highly professional and structured for better AI results]";
        btn.innerHTML = "🪄 Enhance with AI (-2 🪙)";
        btn.disabled = false;
        showCustomAlert("Prompt Enhanced successfully! 🪄");
    }, 1500);
});

// ==========================================
// 8. SMART TEST MODE (API BYPASS)
// ==========================================
document.getElementById('generateAiBtn').addEventListener('click', async (e) => {
    if (!currentUser) return showCustomAlert("Please Login to generate AI Content!");
    
    let hasCoins = await updateCoins(-5);
    if (!hasCoins) {
        document.getElementById('aiRunModal').style.display = 'none';
        return showCoinModal();
    }

    const btn = e.target;
    btn.innerHTML = "✨ Generating...";
    btn.disabled = true;

    setTimeout(() => {
        currentGeneratedOutputHtml = `
            <h3>🚀 Test Mode Active!</h3>
            <p>Bhai, 5 Coins deduct ho gaye. API bypass chal raha hai!</p>
            <p>Abhi niche <b>🖼️ Export</b> button dabao.</p>
        `;
        
        document.getElementById('aiOutputText').innerHTML = currentGeneratedOutputHtml;
        document.getElementById('aiOutputContainer').style.display = 'block';

        btn.innerHTML = "Generate Output (Cost: 5 🪙)";
        btn.disabled = false;
    }, 2000);
});

// ==========================================
// 9. EXPORT & WATERMARK MODULE
// ==========================================
document.getElementById('exportAiOutputBtn').addEventListener('click', () => {
    document.getElementById('aiRunModal').style.display = 'none';
    document.getElementById('watermarkModal').style.display = 'block';
});

document.getElementById('downloadFreeBtn').addEventListener('click', () => { 
    document.getElementById('watermarkModal').style.display = 'none'; 
    executeExport('free'); 
});

document.getElementById('downloadAdBtn').addEventListener('click', () => { 
    document.getElementById('watermarkModal').style.display = 'none'; 
    runSimulatedAdAndExport('ad'); 
});

document.getElementById('openCustomWatermarkBtn').addEventListener('click', () => {
    document.getElementById('watermarkModal').style.display = 'none';
    if(userProfileData && userProfileData.name) {
        document.getElementById('customBrandText').value = '@' + userProfileData.name.replace(/\s+/g, '');
    }
    document.getElementById('customWatermarkModal').style.display = 'block';
});

document.getElementById('downloadCustomBrandBtn').addEventListener('click', async () => {
    if (!currentUser) return showCustomAlert("Please Login first!");

    let hasCoins = await updateCoins(-10);
    if (!hasCoins) {
        document.getElementById('customWatermarkModal').style.display = 'none';
        return showCoinModal();
    }

    const customConfig = { 
        text: document.getElementById('customBrandText').value.trim() || 'Your Brand',
        position: document.getElementById('customBrandPosition').value,
        size: document.getElementById('customBrandSize').value + 'px',
        opacity: document.getElementById('customBrandOpacity').value / 100,
        color: document.getElementById('customBrandColor').value 
    };
    
    document.getElementById('customWatermarkModal').style.display = 'none';
    runSimulatedAdAndExport('custom', customConfig);
});

function runSimulatedAdAndExport(mode, config = null) {
    document.getElementById('simulatedAdModal').style.display = 'block';
    let time = 3; 
    document.getElementById('adTimer').innerText = time;
    
    const interval = setInterval(() => {
        time--; 
        document.getElementById('adTimer').innerText = time;
        if (time <= 0) { 
            clearInterval(interval); 
            document.getElementById('simulatedAdModal').style.display = 'none'; 
            executeExport(mode, config); 
        }
    }, 1000);
}

async function executeExport(mode, customConfig = null) {
    showCustomAlert("Generating Image... 📸");
    const container = document.getElementById('exportCanvasContainer');
    
    const exportFormat = document.getElementById('exportCanvasFormat').value;
    let formatClass = (exportFormat === 'story') ? 'export-poster story-mode' : 'export-poster';

    let watermarkHtml = '';
    if (mode === 'free') {
        watermarkHtml = `<div class="watermark-overlay">PROMPT HUB</div>`;
    } else if (mode === 'custom' && customConfig) {
        let posCSS = '';
        if (customConfig.position === 'center') posCSS = 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
        else if (customConfig.position === 'bottom-right') posCSS = 'bottom: 40px; right: 40px;';
        else if (customConfig.position === 'bottom-left') posCSS = 'bottom: 40px; left: 40px;';
        else if (customConfig.position === 'top-right') posCSS = 'top: 40px; right: 40px;';
        else if (customConfig.position === 'top-left') posCSS = 'top: 40px; left: 40px;';
        else if (customConfig.position === 'bottom-center') posCSS = 'bottom: 40px; left: 50%; transform: translateX(-50%);';

        watermarkHtml = `<div class="custom-brand-overlay" style="${posCSS} font-size: ${customConfig.size}; color: ${customConfig.color}; opacity: ${customConfig.opacity};">${customConfig.text}</div>`;
    }

    container.innerHTML = `
        <div id="posterTarget" class="${formatClass}">
            ${watermarkHtml}
            <div class="export-brand">Prompt Hub 🚀</div>
            <div class="export-title">${currentGeneratedOutputTitle}</div>
            <div class="export-text">${currentGeneratedOutputHtml}</div>
            <div class="export-footer">Generated via raashanmart.in/prompthub</div>
        </div>
    `;
    
    try {
        setTimeout(async () => {
            const canvas = await html2canvas(document.getElementById('posterTarget'), {scale: 2, backgroundColor: '#0f172a'});
            const link = document.createElement('a');
            link.download = `Output_${currentGeneratedOutputTitle.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            container.innerHTML = ''; 
        }, 500);
    } catch(e) { showCustomAlert("Error generating image."); }
}

// ==========================================
// 10. EDIT PROFILE & AVATAR LOGIC
// ==========================================
document.getElementById('profileContainer').addEventListener('click', (e) => {
    if (e.target.id === 'openEditProfileBtn') {
        document.getElementById('editProfileName').value = userProfileData.name || '';
        selectedAvatar = userProfileData.avatar || '👨‍💻';
        document.querySelectorAll('.avatar-option').forEach(opt => {
            if (opt.getAttribute('data-avatar') === selectedAvatar) opt.classList.add('selected');
            else opt.classList.remove('selected');
        });
        document.getElementById('editProfileModal').style.display = 'block';
    }
});

document.querySelectorAll('.avatar-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
        document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedAvatar = e.target.getAttribute('data-avatar');
    });
});

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const newName = document.getElementById('editProfileName').value.trim();
    if (!newName) return showCustomAlert("Please enter a valid name!");
    if (!currentUser) return;

    const btn = document.getElementById('saveProfileBtn');
    btn.innerHTML = "Saving... ⏳";
    btn.disabled = true;

    try {
        await db.collection('users').doc(currentUser.uid).set({
            name: newName,
            avatar: selectedAvatar
        }, { merge: true });
        userProfileData.name = newName;
        userProfileData.avatar = selectedAvatar;
        showCustomAlert("Profile Updated Successfully! ✅");
        document.getElementById('editProfileModal').style.display = 'none';
        renderProfileDashboard(); 
    } catch (e) { showCustomAlert("Error: " + e.message); }
    finally { btn.innerHTML = "Save Changes"; btn.disabled = false; }
});

fetchOfficialPrompts();
});
