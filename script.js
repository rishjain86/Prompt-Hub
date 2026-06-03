document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. NATIVE INITIALIZATION (Splash & Ads)
    // ==========================================
    
    // Web/CSS Splash Screen Fade Out Logic
    setTimeout(() => { 
        const splash = document.getElementById('splash');
        if (splash) { 
            splash.style.opacity = '0'; 
            setTimeout(() => {
                splash.style.display = 'none';
            }, 800); 
        }
    }, 3000);

    // Native Pre-loads for Capacitor (Google Auth & AdMob)
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        try {
            // Google Auth Engine Initialization
            window.Capacitor.Plugins.GoogleAuth.initialize({
                clientId: '242493810474-us5ib99pnjj9of6p3iov9hd6n8ltm975.apps.googleusercontent.com',
                serverClientId: '242493810474-us5ib99pnjj9of6p3iov9hd6n8ltm975.apps.googleusercontent.com',
                scopes: ['profile', 'email'],
                grantOfflineAccess: true,
            });

            // AdMob Native Init & Load
            const initAds = async () => {
                const { AdMob } = window.Capacitor.Plugins;
                
                await AdMob.initialize({
                    requestTrackingAuthorization: true,
                    initializeForTesting: false
                });

                // 1. Show Banner at Bottom
                await AdMob.showBanner({
                    adId: 'ca-app-pub-3940256099942544/6300978111', 
                    adSize: "BANNER",
                    position: "BOTTOM_CENTER",
                    margin: 0
                });

                // 2. Prepare Interstitial (For Prompts AI)
                await AdMob.prepareInterstitial({ 
                    adId: 'ca-app-pub-3940256099942544/1033173712' 
                }); 
                
                AdMob.addListener('interstitialAdDismissed', () => { 
                    AdMob.prepareInterstitial({ 
                        adId: 'ca-app-pub-3940256099942544/1033173712' 
                    }); 
                });

                // 3. Prepare Rewarded Video (For Coins)
                await AdMob.prepareRewardVideoAd({ 
                    adId: 'ca-app-pub-3940256099942544/5224354917' 
                }); 
                
                AdMob.addListener('rewardedVideoAdDismissed', () => { 
                    AdMob.prepareRewardVideoAd({ 
                        adId: 'ca-app-pub-3940256099942544/5224354917' 
                    }); 
                });
            };
            
            initAds().catch((e) => {
                console.log("AdMob Init Error:", e);
            });

        } catch (e) { 
            console.error("Native Init error:", e); 
        }
    }

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
        'maincryptowala@gmail.com', 
    ]; 

    // ==========================================
    // 2. CROSS-PROMOTION SLIDER
    // ==========================================
    const promoApps = [
        { 
            name: "Amazing AI Promo", 
            link: "https://raashanmart.in/download" 
        },
        { 
            name: "Radha Jaap Counter", 
            link: "https://raashanmart.in/download" 
        },
        { 
            name: "Mudra Vault", 
            link: "https://raashanmart.in/download" 
        },
        { 
            name: "EarnX", 
            link: "https://raashanmart.in/download" 
        }
    ];
    
    let currentPromoIdx = 0;
    const promoSlider = document.getElementById('promoSlider');

    setInterval(() => {
        currentPromoIdx = (currentPromoIdx + 1) % promoApps.length;
        if (promoSlider) {
            promoSlider.innerHTML = `Try our other app: <span>${promoApps[currentPromoIdx].name}</span>`;
        }
    }, 4000);
    
    if (promoSlider) {
        promoSlider.innerHTML = `Try our other app: <span>${promoApps[0].name}</span>`;
        
        promoSlider.addEventListener('click', () => {
            window.open(promoApps[currentPromoIdx].link, '_blank');
        });
    }

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

    // ==========================================
    // 4. NAVIGATION LOGIC (Home & Menu)
    // ==========================================
    
    window.goToHome = function() {
        currentTab = 'official';
        currentCategory = 'All';
        currentSearch = '';
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        document.querySelectorAll('.tab-btn').forEach((b) => {
            b.classList.remove('active');
        });
        
        const tabOfficial = document.getElementById('tabOfficial');
        if (tabOfficial) {
            tabOfficial.classList.add('active');
        }
        
        document.querySelectorAll('.filter-btn').forEach((b) => {
            b.classList.remove('active');
        });
        
        const allFilterBtn = document.querySelector('.filter-btn[data-category="All"]');
        if (allFilterBtn) {
            allFilterBtn.classList.add('active');
        }
        
        updateTabsUI();
        filterAndRender();
        window.scrollTo(0, 0);
    };

    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            document.getElementById('sideMenu').classList.add('open');
            document.getElementById('sideMenuOverlay').style.display = 'block';
        });
    }

    const sideMenuOverlay = document.getElementById('sideMenuOverlay');
    if (sideMenuOverlay) {
        sideMenuOverlay.addEventListener('click', () => {
            document.getElementById('sideMenu').classList.remove('open');
            document.getElementById('sideMenuOverlay').style.display = 'none';
        });
    }

    document.querySelectorAll('#menuCategories li[data-category]').forEach((li) => {
        li.addEventListener('click', (e) => {
            currentCategory = e.currentTarget.getAttribute('data-category'); 
            currentTab = 'official'; 
            
            document.getElementById('sideMenu').classList.remove('open');
            document.getElementById('sideMenuOverlay').style.display = 'none';
            
            document.querySelectorAll('.tab-btn').forEach((b) => {
                b.classList.remove('active');
            });
            
            const tabOfficial = document.getElementById('tabOfficial');
            if (tabOfficial) {
                tabOfficial.classList.add('active');
            }
            
            document.querySelectorAll('.filter-btn').forEach((b) => {
                b.classList.remove('active');
            });
            
            let matchingBtn = document.querySelector(`.filter-btn[data-category="${currentCategory}"]`);
            if (matchingBtn) {
                matchingBtn.classList.add('active');
            }
            
            updateTabsUI();
            filterAndRender();
            window.scrollTo(0, 0);
        });
    });


    // ==========================================
    // 5. AUTHENTICATION, WALLET, STREAK & PROFILE
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
                userProfileData = doc.data();
                
                if (!userProfileData.name) {
                    userProfileData.name = defaultName;
                }
                if (!userProfileData.avatar) {
                    userProfileData.avatar = '👨‍💻';
                }
                
                let streak = userProfileData.streak || 0;
                let lastLogin = userProfileData.lastLoginDate || "";
                
                if (lastLogin !== todayStr) {
                    let yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    if (lastLogin === yesterday.toDateString()) {
                        streak += 1;
                    } else {
                        streak = 1;
                    }
                    
                    let reward = (streak % 7 === 0) ? 50 : 5;
                    let newCoins = (userProfileData.coins || 0) + reward;
                    
                    userProfileData.streak = streak;
                    userProfileData.lastLoginDate = todayStr;
                    userProfileData.coins = newCoins;
                    
                    await userRef.set({ 
                        streak: streak, 
                        lastLoginDate: todayStr, 
                        coins: newCoins 
                    }, { 
                        merge: true 
                    });
                    
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
                const tabOfficial = document.getElementById('tabOfficial');
                if (tabOfficial) {
                    tabOfficial.click();
                }
            }
        }
        
        updateTabsUI();
        filterAndRender();
    });

    window.updateCoins = async function(amount) {
        if (!currentUser) {
            return false;
        }
        
        const userRef = db.collection('users').doc(currentUser.uid);
        
        try {
            const doc = await userRef.get();
            let currentCoins = 0;
            
            if (doc.exists) {
                currentCoins = doc.data().coins || 0;
            }
            
            if (currentCoins + amount < 0) {
                return false; 
            }
            
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
            console.error(e);
            return false; 
        }
    };

    window.showCoinModal = function() {
        document.getElementById('coinModal').style.display = 'block';
    };


    // ==========================================
    // 6. AUTH MODALS, LISTENERS & ADS CLICKS
    // ==========================================
    
    const watchAdForCoinsBtn = document.getElementById('watchAdForCoinsBtn');
    if (watchAdForCoinsBtn) {
        watchAdForCoinsBtn.addEventListener('click', async () => {
            document.getElementById('coinModal').style.display = 'none';
            
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                try {
                    const { AdMob } = window.Capacitor.Plugins;
                    await AdMob.showRewardVideoAd();
                    
                    await updateCoins(15); 
                    showCustomAlert("💰 15 Coins added successfully!");
                } catch (error) {
                    console.error(error);
                    showCustomAlert("Ad failed to load. Please try again later.");
                }
            } else {
                const adModal = document.getElementById('simulatedAdModal');
                if (adModal) {
                    adModal.style.display = 'block';
                }
                
                let time = 3; 
                const adTimer = document.getElementById('adTimer');
                if (adTimer) {
                    adTimer.innerText = time;
                }
                
                const interval = setInterval(async () => {
                    time--; 
                    if (adTimer) {
                        adTimer.innerText = time;
                    }
                    
                    if (time <= 0) {
                        clearInterval(interval);
                        if (adModal) {
                            adModal.style.display = 'none';
                        }
                        
                        await updateCoins(15); 
                        showCustomAlert("💰 15 Coins added successfully!");
                    }
                }, 1000);
            }
        });
    }

    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            if (currentUser) {
                try {
                    await auth.signOut();
                    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                        await window.Capacitor.Plugins.GoogleAuth.signOut();
                    }
                } catch (error) {
                    showCustomAlert("Logout Error: " + error.message);
                }
            } else {
                document.getElementById('authModal').style.display = 'block';
            }
        });
    }

    const toggleAuthMode = document.getElementById('toggleAuthMode');
    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            
            const modalTitle = document.getElementById('modalTitle');
            const submitAuthBtn = document.getElementById('submitAuthBtn');
            
            if (isLoginMode) {
                if (modalTitle) modalTitle.textContent = "Login";
                if (submitAuthBtn) submitAuthBtn.textContent = "Login";
                toggleAuthMode.innerHTML = "Don't have an account? <span>Sign Up</span>";
            } else {
                if (modalTitle) modalTitle.textContent = "Create Account";
                if (submitAuthBtn) submitAuthBtn.textContent = "Sign Up";
                toggleAuthMode.innerHTML = "Already have an account? <span>Login</span>";
            }
        });
    }

    const submitAuthBtn = document.getElementById('submitAuthBtn');
    if (submitAuthBtn) {
        submitAuthBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('emailInput');
            const passwordInput = document.getElementById('passwordInput');
            
            const email = emailInput ? emailInput.value.trim() : '';
            const pwd = passwordInput ? passwordInput.value.trim() : '';
            
            if (!email || !pwd) {
                return showCustomAlert("Please fill all fields.");
            }
            
            try {
                if (isLoginMode) {
                    await auth.signInWithEmailAndPassword(email, pwd);
                } else {
                    await auth.createUserWithEmailAndPassword(email, pwd);
                }
                
                document.getElementById('authModal').style.display = 'none';
                
            } catch (error) { 
                showCustomAlert(error.message); 
            }
        });
    }

    const googleAuthBtn = document.getElementById('googleAuthBtn');
    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', async () => {
            try {
                if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                    const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
                    const credential = firebase.auth.GoogleAuthProvider.credential(googleUser.authentication.idToken);
                    await auth.signInWithCredential(credential);
                } else {
                    await auth.signInWithPopup(googleProvider);
                }
                
                document.getElementById('authModal').style.display = 'none';
                
            } catch (error) { 
                console.error("Google Login Error:", error);
                showCustomAlert("Google Login Error: " + error.message); 
            }
        });
    }

    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('emailInput');
            const email = emailInput ? emailInput.value.trim() : '';
            
            if (!email) {
                return showCustomAlert("Please enter your email address first.");
            }
            
            try {
                await auth.sendPasswordResetEmail(email);
                showCustomAlert("Password reset link sent to your email!");
                document.getElementById('authModal').style.display = 'none';
                
            } catch (error) { 
                showCustomAlert(error.message); 
            }
        });
    }


    // ==========================================
    // 7. DATA FETCHING & FALLBACK
    // ==========================================
    async function fetchOfficialPrompts() {
        try {
            const res = await fetch('prompts.json?t=' + Date.now());
            if (res.ok) {
                allOfficialPrompts = await res.json();
            }
        } catch (e) { 
            console.log("Error fetching prompts.json", e); 
        }

        if (!allOfficialPrompts || allOfficialPrompts.length === 0) {
            allOfficialPrompts = [
                { 
                    title: "HTML Bug Fixer", 
                    category: "Coding & Tech", 
                    prompt_text: "Analyze this HTML code and fix any syntax errors: [Paste Code]" 
                },
                { 
                    title: "Viral Social Media Plan", 
                    category: "Marketing & Social Media", 
                    prompt_text: "Create a 30-day viral social media marketing plan for [Product/Service]" 
                },
                { 
                    title: "SEO Blog Writer", 
                    category: "SEO & Website Ranking", 
                    prompt_text: "Write an SEO-optimized blog post about [Topic] targeting the keyword [Keyword]" 
                },
                { 
                    title: "Game Lore Generator", 
                    category: "Gaming & World Building", 
                    prompt_text: "Generate a deep lore background for an RPG game set in [Fantasy/Sci-Fi Setting]" 
                },
                { 
                    title: "Cold Outreach Email", 
                    category: "Sales & Cold Outreach", 
                    prompt_text: "Write a high-converting cold email for [Target Audience] offering [Service]" 
                }
            ];
        }
        
        filterAndRender();
    }

    async function fetchCommunityPrompts() {
        try {
            const snap = await db.collection('community_prompts').orderBy('timestamp', 'desc').get();
            
            allCommunityPrompts = snap.docs.map((doc) => {
                return { 
                    id: doc.id, 
                    ...doc.data() 
                };
            });
            
            if (currentTab === 'community' || currentTab === 'leaderboard' || currentTab === 'profile') {
                filterAndRender();
            }
            
        } catch(e) { 
            console.log(e); 
        }
    }

    function getBookmarksKey() { 
        if (currentUser) {
            return `bookmarks_${currentUser.uid}`;
        } else {
            return `bookmarks_guest`;
        }
    }
    
    function getBookmarks() { 
        const key = getBookmarksKey();
        const item = localStorage.getItem(key);
        if (item) {
            return JSON.parse(item);
        } else {
            return [];
        }
    }

    window.toggleBookmark = function(pId) {
        let bookmarks = getBookmarks();
        
        if (bookmarks.includes(pId)) {
            bookmarks = bookmarks.filter((id) => {
                return id !== pId;
            });
            showCustomAlert("Removed from Saved ⭐");
        } else {
            bookmarks.push(pId);
            showCustomAlert("Saved to My Prompts ⭐");
        }
        
        const key = getBookmarksKey();
        localStorage.setItem(key, JSON.stringify(bookmarks));
        filterAndRender();
    };


    // ==========================================
    // 8. TABS, SEARCH & FILTER LISTENERS
    // ==========================================
    const headerProfileBtn = document.getElementById('headerProfileBtn');
    if (headerProfileBtn) {
        headerProfileBtn.addEventListener('click', () => {
            if (!currentUser) {
                return showCustomAlert("Please Login to view your Profile! 👤");
            }
            
            document.querySelectorAll('.tab-btn').forEach((b) => {
                b.classList.remove('active');
            });
            
            currentTab = 'profile';
            updateTabsUI();
            fetchCommunityPrompts();
        });
    }

    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            
            if (targetBtn.title === "Home") {
                return;
            }
            
            document.querySelectorAll('.tab-btn').forEach((b) => {
                b.classList.remove('active');
            });
            
            targetBtn.classList.add('active');
            
            if (targetBtn.id === 'tabOfficial') {
                currentTab = 'official';
            }
            if (targetBtn.id === 'tabCommunity') {
                currentTab = 'community';
            }
            if (targetBtn.id === 'tabSaved') {
                currentTab = 'saved';
            }
            if (targetBtn.id === 'tabLeaderboard') {
                currentTab = 'leaderboard';
            }
            
            updateTabsUI();
            
            if (currentTab === 'community' || currentTab === 'leaderboard') {
                fetchCommunityPrompts(); 
            } else {
                filterAndRender();
            }
        });
    });

    function updateTabsUI() {
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (currentTab === 'leaderboard' || currentTab === 'saved' || currentTab === 'profile') {
            if (categoryFilter) categoryFilter.style.display = 'none';
        } else {
            if (categoryFilter) categoryFilter.style.display = 'flex';
        }
        
        const openAddPromptBtn = document.getElementById('openAddPromptBtn');
        if ((currentTab === 'community' || currentTab === 'profile') && currentUser) {
            if (openAddPromptBtn) openAddPromptBtn.style.display = 'block';
        } else {
            if (openAddPromptBtn) openAddPromptBtn.style.display = 'none';
        }
    }

    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            
            document.querySelectorAll('.filter-btn').forEach((b) => {
                b.classList.remove('active');
            });
            
            targetBtn.classList.add('active');
            currentCategory = targetBtn.getAttribute('data-category');
            filterAndRender();
        });
    });

    const searchInputElem = document.getElementById('searchInput');
    if (searchInputElem) {
        searchInputElem.addEventListener('input', (e) => { 
            currentSearch = e.target.value; 
            filterAndRender(); 
        });
    }


    // ==========================================
    // 9. PROFILE DASHBOARD RENDERING
    // ==========================================
    function renderProfileDashboard() {
        const profileContainer = document.getElementById('profileContainer');
        if (!profileContainer) return;
        if (!currentUser) return;

        let myPrompts = allCommunityPrompts.filter((p) => {
            return p.authorEmail === currentUser.email;
        });
        
        let totalUpvotes = myPrompts.reduce((sum, p) => {
            return sum + (p.upvotes || 0);
        }, 0);
        
        let approvedCount = myPrompts.filter((p) => {
            return p.status === 'approved';
        }).length;
        
        let pendingCount = myPrompts.filter((p) => {
            return p.status === 'pending';
        }).length;
        
        const coinCountElem = document.getElementById('coinCount');
        let currentCoins = 0;
        if (coinCountElem) {
            currentCoins = coinCountElem.innerText;
        }
        
        let displayName = userProfileData.name || currentUser.displayName || currentUser.email.split('@')[0];
        let avatarEmoji = userProfileData.avatar || '👨‍💻';

        let html = `
            <div class="profile-header-card">
                <div class="profile-user-info" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div class="profile-avatar" style="font-size:35px; background:transparent; border: 2px solid var(--accent-blue);">
                            ${avatarEmoji}
                        </div>
                        <div>
                            <h2 style="color: var(--text-main); margin:0;">${displayName}</h2>
                            <p style="color: var(--text-muted); font-size: 14px; margin:0;">${currentUser.email}</p>
                        </div>
                    </div>
                    <button id="openEditProfileBtn" class="secondary-action-btn" style="width:auto; padding:8px 15px; font-size:13px; border-color:var(--accent-blue); color:var(--accent-blue);">✏️ Edit</button>
                </div>
                
                <div class="profile-stats-grid">
                    <div class="stat-box">
                        <div class="stat-value" style="color:#fbbf24;">${currentCoins}</div>
                        <div class="stat-label">Coins 🪙</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value" style="color:#10b981;">${totalUpvotes}</div>
                        <div class="stat-label">Total Likes ❤️</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${approvedCount}</div>
                        <div class="stat-label">Approved ✅</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value" style="color:#f59e0b;">${pendingCount}</div>
                        <div class="stat-label">Pending ⏳</div>
                    </div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 15px; color: var(--accent-blue);">My Submitted Prompts</h3>
            <div class="prompt-container" style="padding:0;">
        `;

        if (myPrompts.length === 0) {
            html += `
                <p style="color:var(--text-muted);">
                    You haven't submitted any prompts yet. Click "+ Add Expert Prompt" to start!
                </p>
            `;
        } else {
            myPrompts.forEach((prompt) => {
                const encTitle = encodeURIComponent(prompt.title || 'Untitled');
                const encText = encodeURIComponent(prompt.prompt_text || '');
                const pId = prompt.id;

                let badgesHtml = `<span class="category-badge">${prompt.category || 'General'}</span>`;
                
                if (prompt.status === 'pending') {
                    badgesHtml += `<span class="pending-badge">Pending Approval</span>`;
                } else if (prompt.status === 'approved') {
                    badgesHtml += `<span class="category-badge" style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.3);">Approved ✅</span>`;
                }

                html += `
                <div class="prompt-card">
                    <div class="card-header-row">
                        <div class="badges-container">
                            ${badgesHtml}
                        </div>
                        <div class="icon-group">
                            <span style="color:var(--text-muted); font-size:12px; font-weight:bold;">❤️ ${prompt.upvotes || 0}</span>
                        </div>
                    </div>
                    <h3 onclick="trackAndView('${pId}', '${encTitle}', '${encText}')" style="cursor:pointer;">${prompt.title || 'Untitled'}</h3>
                    <p class="preview-text" onclick="trackAndView('${pId}', '${encTitle}', '${encText}')">"${(prompt.prompt_text||'').substring(0, 60)}..."</p>
                    <div class="action-row">
                        <button class="action-btn run-ai-btn" onclick="initiateAiRun('${encTitle}', '${encText}')">✨ Run AI</button>
                        <button class="action-btn copy-card-btn" onclick="window.copyPrompt('${encText}')">📋 Copy</button>
                    </div>
                </div>`;
            });
        }
        
        html += `
            </div>
            <div class="coming-soon-card">
                <div class="coming-soon-badge">SOON</div>
                <h3>Referral System 🔗</h3>
                <p>Invite friends and earn 50 coins each!</p>
            </div>
            <div class="coming-soon-card">
                <div class="coming-soon-badge">SOON</div>
                <h3>VIP Subscription 👑</h3>
                <p>Unlock unlimited access & pro features.</p>
            </div>
        `;
        
        profileContainer.innerHTML = html;
    }


    // ==========================================
    // 10. FILTER & RENDER PROMPTS + LEADERBOARD
    // ==========================================
    function filterAndRender() {
        const promptContainerElem = document.getElementById('promptContainer');
        const profileContainerElem = document.getElementById('profileContainer');
        
        if (currentTab === 'profile') {
            if (promptContainerElem) promptContainerElem.style.display = 'none';
            if (profileContainerElem) profileContainerElem.style.display = 'block';
            renderProfileDashboard();
            return;
        } else {
            if (promptContainerElem) promptContainerElem.style.display = 'grid';
            if (profileContainerElem) profileContainerElem.style.display = 'none';
        }

        if (currentTab === 'leaderboard') {
            const userScores = {};
            
            allCommunityPrompts.forEach((p) => {
                if (p.status === 'approved' && p.authorEmail) {
                    let currentScore = userScores[p.authorEmail] || 0;
                    userScores[p.authorEmail] = currentScore + (p.upvotes || 0);
                }
            });
            
            const sortedUsers = Object.keys(userScores).map((email) => {
                return { 
                    email: email.split('@')[0], 
                    score: userScores[email] 
                };
            }).sort((a, b) => {
                return b.score - a.score;
            }).slice(0, 10);
            
            if (sortedUsers.length === 0) {
                if (promptContainerElem) {
                    promptContainerElem.innerHTML = `
                        <p style="text-align:center; color:var(--text-muted); margin-top:20px; font-size:16px;">
                            No data available yet.
                        </p>
                    `;
                }
                return;
            }
            
            let html = `
                <div class="leaderboard-list">
                    <h2 style="text-align:center; margin-bottom:10px; color:var(--accent-blue);">
                        🏆 Top Creators
                    </h2>
            `;
            
            sortedUsers.forEach((u, idx) => {
                let rank = '';
                if (idx === 0) {
                    rank = '🥇'; 
                } else if (idx === 1) {
                    rank = '🥈'; 
                } else if (idx === 2) {
                    rank = '🥉'; 
                } else {
                    rank = `#${idx + 1}`;
                }
                
                html += `
                    <div class="lb-item">
                        <span class="lb-rank">${rank}</span>
                        <span class="lb-name">@${u.email}</span>
                        <span class="lb-score">❤️ ${u.score}</span>
                    </div>
                `;
            });
            
            if (promptContainerElem) {
                promptContainerElem.innerHTML = html + `</div>`;
            }
            return;
        }

        let dataset = [];
        
        if (currentTab === 'official') {
            dataset = [...allOfficialPrompts];
        } else {
            dataset = [...allCommunityPrompts];
        }
        
        if (currentTab === 'community') {
            dataset = dataset.filter((p) => {
                return p.status === 'approved' || isAdmin || (currentUser && p.authorEmail === currentUser.email);
            });
        } else if (currentTab === 'saved') {
            dataset = [...allOfficialPrompts, ...allCommunityPrompts].filter((p) => {
                return getBookmarks().includes(p.id);
            });
        }

        if (currentCategory === 'Trending' && currentTab !== 'saved') {
            dataset.sort((a, b) => {
                let viewsB = parseInt(localStorage.getItem(`views_${b.id}`)) || 0;
                let viewsA = parseInt(localStorage.getItem(`views_${a.id}`)) || 0;
                return viewsB - viewsA;
            });
            dataset = dataset.slice(0, 5); 
            
        } else if (currentCategory !== 'All' && currentCategory !== 'Trending') {
            dataset = dataset.filter((p) => {
                return p.category === currentCategory;
            });
        }
        
        if (currentSearch) {
            const query = currentSearch.toLowerCase();
            dataset = dataset.filter((p) => {
                let matchTitle = p.title && p.title.toLowerCase().includes(query);
                let matchCategory = p.category && p.category.toLowerCase().includes(query);
                let matchText = p.prompt_text && p.prompt_text.toLowerCase().includes(query);
                return matchTitle || matchCategory || matchText;
            });
        }

        if (promptContainerElem) {
            promptContainerElem.innerHTML = '';
            
            if (dataset.length === 0) {
                promptContainerElem.innerHTML = `
                    <p style="text-align:center; color:var(--text-main); margin-top:50px; font-size:16px; grid-column: 1 / -1;">
                        No prompts found for this category or search.
                    </p>
                `;
                return;
            }
        }

        dataset.forEach((prompt) => {
            const encTitle = encodeURIComponent(prompt.title || 'Untitled');
            const encText = encodeURIComponent(prompt.prompt_text || '');
            const pId = prompt.id || 'custom_' + Math.random().toString(36).substr(2, 9);
            const isSaved = getBookmarks().includes(pId);
            
            let badgesHtml = `<span class="category-badge">${prompt.category || 'General'}</span>`;
            if (prompt.status === 'pending') {
                badgesHtml += `<span class="pending-badge">Pending</span>`;
            }

            let adminControls = '';
            if (isAdmin && prompt.status === 'pending') {
                adminControls = `
                    <div style="display:flex; gap:10px; width:100%; margin-top:5px;">
                        <button class="action-btn edit-btn" style="color:#10b981; border-color:#10b981;" onclick="adminAction('${pId}', 'approve')">Approve</button>
                        <button class="action-btn edit-btn" style="color:#ef4444; border-color:#ef4444;" onclick="adminAction('${pId}', 'reject')">Reject</button>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'prompt-card';
            
            card.innerHTML = `
                <div class="card-header-row">
                    <div class="badges-container">
                        ${badgesHtml}
                    </div>
                    <div class="icon-group">
                        <button class="card-icon-btn ${isSaved ? 'saved' : ''}" onclick="toggleBookmark('${pId}')" title="Save Prompt">
                            ${isSaved ? '★' : '☆'}
                        </button>
                    </div>
                </div>
                
                <h3 style="cursor:pointer;" onclick="window.initiateAiRun('${encTitle}', '${encText}')">
                    ${prompt.title || 'Untitled'}
                </h3>
                
                <p class="preview-text" onclick="window.initiateAiRun('${encTitle}', '${encText}')">
                    "${(prompt.prompt_text||'').substring(0, 60)}..."
                </p>
                
                <div class="action-row">
                    <button class="action-btn run-ai-btn" onclick="window.initiateAiRun('${encTitle}', '${encText}')">
                        ✨ Run AI
                    </button>
                    
                    <button class="action-btn copy-card-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encText}')); showCustomAlert('Copied! 🚀');">
                        📋 Copy
                    </button>
                    
                    <button class="action-btn share-btn" onclick="window.sharePrompt('${encTitle}', '${encText}')">
                        📲 Share
                    </button>
                    
                    ${adminControls}
                </div>
            `;
            
            if (promptContainerElem) {
                promptContainerElem.appendChild(card);
            }
        });
    }


    // ==========================================
    // 11. CARD ACTIONS (VIEW, COPY, SHARE)
    // ==========================================
    window.trackAndView = function(pId, encTitle, encText) {
        let currentViews = parseInt(localStorage.getItem(`views_${pId}`)) || 0;
        localStorage.setItem(`views_${pId}`, currentViews + 1);
        
        const titleElem = document.getElementById('viewModalTitle');
        if (titleElem) {
            titleElem.textContent = decodeURIComponent(encTitle);
        }
        
        textToCopy = decodeURIComponent(encText);
        
        const textElem = document.getElementById('viewModalText');
        if (textElem) {
            textElem.textContent = textToCopy;
        }
        
        const modalElem = document.getElementById('viewPromptModal');
        if (modalElem) {
            modalElem.style.display = 'block';
        }
    };

    window.copyFromView = function() { 
        navigator.clipboard.writeText(textToCopy).then(() => { 
            showCustomAlert("Prompt Copied to Clipboard! 🚀"); 
            const modalElem = document.getElementById('viewPromptModal');
            if (modalElem) {
                modalElem.style.display = 'none'; 
            }
        }); 
    };
    
    window.copyPrompt = function(encText) { 
        navigator.clipboard.writeText(decodeURIComponent(encText)).then(() => {
            showCustomAlert("Copied to Clipboard! 🚀");
        }); 
    };
    
    window.sharePrompt = function(encTitle, encText) {
        const shareData = { 
            title: 'Prompt Hub', 
            text: `*${decodeURIComponent(encTitle)}*\n"${decodeURIComponent(encText)}"\n`, 
            url: window.location.href.split('?')[0] 
        };
        
        if (navigator.share) {
            navigator.share(shareData).catch((err) => {
                console.log(err);
            });
        } else {
            const encodedText = encodeURIComponent(shareData.text + shareData.url);
            window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
        }
    };


    // ==========================================
    // 12. AI RUN FLOW (Interstitial Ad & Modals)
    // ==========================================
    window.initiateAiRun = function(encTitle, encText) {
        pendingAiRunData = { 
            title: encTitle, 
            text: encText 
        };
        
        const modalElem = document.getElementById('adPromptModal');
        if (modalElem) {
            modalElem.style.display = 'block';
        }
    };

    const watchAdBtn = document.getElementById('watchAdBtn');
    if (watchAdBtn) {
        watchAdBtn.addEventListener('click', async () => {
            const adPromptModal = document.getElementById('adPromptModal');
            if (adPromptModal) {
                adPromptModal.style.display = 'none';
            }

            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                try {
                    const { AdMob } = window.Capacitor.Plugins;
                    await AdMob.showInterstitial();
                    openAiRunModal();
                } catch (e) {
                    openAiRunModal();
                }
            } else {
                const simulatedAdModal = document.getElementById('simulatedAdModal');
                if (simulatedAdModal) {
                    simulatedAdModal.style.display = 'block';
                }
                
                let time = 3; 
                const adTimer = document.getElementById('adTimer');
                if (adTimer) {
                    adTimer.innerText = time;
                }
                
                const interval = setInterval(() => {
                    time--; 
                    if (adTimer) {
                        adTimer.innerText = time;
                    }
                    
                    if (time <= 0) {
                        clearInterval(interval); 
                        if (simulatedAdModal) {
                            simulatedAdModal.style.display = 'none';
                        }
                        openAiRunModal();
                    }
                }, 1000);
            }
        });
    }

    function openAiRunModal() {
        if (pendingAiRunData) {
            currentGeneratedOutputTitle = decodeURIComponent(pendingAiRunData.title);
            
            const titleElem = document.getElementById('aiPromptTitle');
            if (titleElem) {
                titleElem.textContent = currentGeneratedOutputTitle;
            }
            
            const container = document.getElementById('dynamicInputsContainer');
            if (container) {
                container.innerHTML = ''; 
            }
            
            const outputContainer = document.getElementById('aiOutputContainer');
            if (outputContainer) {
                outputContainer.style.display = 'none';
            }
            
            const matches = [...decodeURIComponent(pendingAiRunData.text).matchAll(/\[(.*?)\]/g)];
            const uniqueVars = [...new Set(matches.map((m) => m[1]))]; 
            
            if (uniqueVars.length === 0) {
                if (container) {
                    container.innerHTML = `
                        <p style="color:var(--accent-green); margin-bottom:15px;">
                            No variables detected. Run directly!
                        </p>
                    `;
                }
            } else {
                uniqueVars.forEach((vName) => { 
                    if (container) {
                        container.insertAdjacentHTML('beforeend', `
                            <div>
                                <label style="font-size:13px; color:var(--text-muted); display:block; text-transform:capitalize; margin-bottom:5px;">
                                    ${vName}:
                                </label>
                                <input type="text" class="ai-var-input" data-var="${vName}" placeholder="Enter ${vName}...">
                            </div>
                        `); 
                    }
                });
            }
            
            const runModal = document.getElementById('aiRunModal');
            if (runModal) {
                runModal.style.display = 'block';
            }
        }
    }

    // ==========================================
    // 13. AI ENHANCER LOGIC
    // ==========================================
    const enhancePromptBtn = document.getElementById('enhancePromptBtn');
    if (enhancePromptBtn) {
        enhancePromptBtn.addEventListener('click', async () => {
            const promptArea = document.getElementById('promptText');
            
            if (!promptArea || !promptArea.value.trim()) {
                return showCustomAlert("Please enter a basic idea first!");
            }
            
            let hasCoins = await updateCoins(-2);
            if (!hasCoins) {
                return showCoinModal();
            }
            
            const btn = document.getElementById('enhancePromptBtn');
            if (btn) {
                btn.innerHTML = "🪄 Enhancing...";
                btn.disabled = true;
            }
            
            setTimeout(() => {
                if (promptArea) {
                    promptArea.value = "Enhanced Prompt: " + promptArea.value.trim() + " [Make this highly professional and structured for better AI results]";
                }
                if (btn) {
                    btn.innerHTML = "🪄 Enhance with AI (-2 🪙)";
                    btn.disabled = false;
                }
                showCustomAlert("Prompt Enhanced successfully! 🪄");
            }, 1500);
        });
    }

    // ==========================================
    // 14. TEST MODE AI GENERATOR
    // ==========================================
    const generateAiBtn = document.getElementById('generateAiBtn');
    if (generateAiBtn) {
        generateAiBtn.addEventListener('click', async (e) => {
            if (!currentUser) {
                return showCustomAlert("Please Login to generate AI Content!");
            }
            
            let hasCoins = await updateCoins(-5);
            if (!hasCoins) {
                const runModal = document.getElementById('aiRunModal');
                if (runModal) {
                    runModal.style.display = 'none';
                }
                return showCoinModal();
            }

            const btn = e.target;
            if (btn) {
                btn.innerHTML = "✨ Generating...";
                btn.disabled = true;
            }

            setTimeout(() => {
                currentGeneratedOutputHtml = `
                    <h3>🚀 Test Mode Active!</h3>
                    <p>Bhai, aapke <b>5 Coins deduct ho gaye hain!</b> API bypass kar di gayi hai taaki aap aage ka flow test kar sako.</p>
                    <p>Abhi niche <b>🖼️ Export</b> button dabao aur Custom Brand watermark test karo.</p>
                `;
                
                const aiOutputText = document.getElementById('aiOutputText');
                if (aiOutputText) {
                    aiOutputText.innerHTML = currentGeneratedOutputHtml;
                }
                
                const aiOutputContainer = document.getElementById('aiOutputContainer');
                if (aiOutputContainer) {
                    aiOutputContainer.style.display = 'block';
                }

                const copyAiOutputBtn = document.getElementById('copyAiOutputBtn');
                if (copyAiOutputBtn) {
                    copyAiOutputBtn.onclick = () => {
                        navigator.clipboard.writeText("Test Output Copied!").then(() => {
                            showCustomAlert("Output Copied! 🚀");
                        });
                    };
                }

                if (btn) {
                    btn.innerHTML = "Generate Output (Cost: 5 🪙)";
                    btn.disabled = false;
                }
            }, 2000);
        });
    }

    // ==========================================
    // 15. EXPORT & WATERMARK LOGIC
    // ==========================================
    const exportAiOutputBtn = document.getElementById('exportAiOutputBtn');
    if (exportAiOutputBtn) {
        exportAiOutputBtn.addEventListener('click', () => {
            const aiRunModal = document.getElementById('aiRunModal');
            if (aiRunModal) {
                aiRunModal.style.display = 'none';
            }
            
            const watermarkModal = document.getElementById('watermarkModal');
            if (watermarkModal) {
                watermarkModal.style.display = 'block';
            }
        });
    }

    const downloadFreeBtn = document.getElementById('downloadFreeBtn');
    if (downloadFreeBtn) {
        downloadFreeBtn.addEventListener('click', () => { 
            const watermarkModal = document.getElementById('watermarkModal');
            if (watermarkModal) {
                watermarkModal.style.display = 'none';
            }
            executeExport('free'); 
        });
    }
    
    const downloadAdBtn = document.getElementById('downloadAdBtn');
    if (downloadAdBtn) {
        downloadAdBtn.addEventListener('click', () => { 
            const watermarkModal = document.getElementById('watermarkModal');
            if (watermarkModal) {
                watermarkModal.style.display = 'none'; 
            }
            runSimulatedAdAndExport('ad'); 
        });
    }

    const openCustomWatermarkBtn = document.getElementById('openCustomWatermarkBtn');
    if (openCustomWatermarkBtn) {
        openCustomWatermarkBtn.addEventListener('click', () => {
            const watermarkModal = document.getElementById('watermarkModal');
            if (watermarkModal) {
                watermarkModal.style.display = 'none';
            }
            
            if (userProfileData && userProfileData.name) {
                const brandText = document.getElementById('customBrandText');
                if (brandText) {
                    brandText.value = '@' + userProfileData.name.replace(/\s+/g, '');
                }
            }
            
            const customModal = document.getElementById('customWatermarkModal');
            if (customModal) {
                customModal.style.display = 'block';
            }
        });
    }

    const downloadCustomBrandBtn = document.getElementById('downloadCustomBrandBtn');
    if (downloadCustomBrandBtn) {
        downloadCustomBrandBtn.addEventListener('click', async () => {
            if (!currentUser) {
                return showCustomAlert("Please Login first!");
            }

            let hasCoins = await updateCoins(-10);
            if (!hasCoins) {
                const customModal = document.getElementById('customWatermarkModal');
                if (customModal) {
                    customModal.style.display = 'none';
                }
                return showCoinModal();
            }

            const textElem = document.getElementById('customBrandText');
            const posElem = document.getElementById('customBrandPosition');
            const sizeElem = document.getElementById('customBrandSize');
            const opacityElem = document.getElementById('customBrandOpacity');
            const colorElem = document.getElementById('customBrandColor');

            const customConfig = { 
                text: textElem ? textElem.value.trim() || 'Your Brand' : 'Your Brand',
                position: posElem ? posElem.value : 'center',
                size: sizeElem ? sizeElem.value + 'px' : '60px',
                opacity: opacityElem ? opacityElem.value / 100 : 0.4,
                color: colorElem ? colorElem.value : '#ffffff'
            };
            
            const customModal = document.getElementById('customWatermarkModal');
            if (customModal) {
                customModal.style.display = 'none';
            }
            
            runSimulatedAdAndExport('custom', customConfig);
        });
    }

    function runSimulatedAdAndExport(mode, config = null) {
        const adModal = document.getElementById('simulatedAdModal');
        if (adModal) {
            adModal.style.display = 'block';
        }
        
        let time = 3; 
        const timerElem = document.getElementById('adTimer');
        if (timerElem) {
            timerElem.innerText = time;
        }
        
        const interval = setInterval(() => {
            time--; 
            if (timerElem) {
                timerElem.innerText = time;
            }
            
            if (time <= 0) { 
                clearInterval(interval); 
                if (adModal) {
                    adModal.style.display = 'none'; 
                }
                executeExport(mode, config); 
            }
        }, 1000);
    }

    // ==========================================
    // 16. HTML2CANVAS EXECUTION
    // ==========================================
    async function executeExport(mode, customConfig = null) {
        showCustomAlert("Generating Image... 📸");
        
        const container = document.getElementById('exportCanvasContainer');
        const formatElem = document.getElementById('exportCanvasFormat');
        
        let exportFormat = 'standard';
        if (formatElem) {
            exportFormat = formatElem.value;
        }
        
        let formatClass = '';
        if (exportFormat === 'story') {
            formatClass = 'export-poster story-mode';
        } else {
            formatClass = 'export-poster';
        }
        
        let watermarkHtml = '';

        if (mode === 'free') {
            watermarkHtml = `
                <div class="watermark-overlay">
                    PROMPT HUB
                </div>
            `;
        } else if (mode === 'custom' && customConfig) {
            let posCSS = '';
            
            if (customConfig.position === 'center') {
                posCSS = 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
            } else if (customConfig.position === 'bottom-right') {
                posCSS = 'bottom: 40px; right: 40px;';
            } else if (customConfig.position === 'bottom-left') {
                posCSS = 'bottom: 40px; left: 40px;';
            } else if (customConfig.position === 'top-right') {
                posCSS = 'top: 40px; right: 40px;';
            } else if (customConfig.position === 'top-left') {
                posCSS = 'top: 40px; left: 40px;';
            } else if (customConfig.position === 'bottom-center') {
                posCSS = 'bottom: 40px; left: 50%; transform: translateX(-50%);';
            }

            watermarkHtml = `
                <div class="custom-brand-overlay" style="${posCSS} font-size: ${customConfig.size}; color: ${customConfig.color}; opacity: ${customConfig.opacity};">
                    ${customConfig.text}
                </div>
            `;
        }

        if (container) {
            container.innerHTML = `
                <div id="posterTarget" class="${formatClass}">
                    ${watermarkHtml}
                    <div class="export-brand">Prompt Hub 🚀</div>
                    <div class="export-title">${currentGeneratedOutputTitle}</div>
                    <div class="export-text">${currentGeneratedOutputHtml}</div>
                    <div class="export-footer">Generated via raashanmart.in/prompthub</div>
                </div>
            `;
        }
        
        try {
            setTimeout(async () => {
                const target = document.getElementById('posterTarget');
                if (target) {
                    const canvas = await html2canvas(target, { 
                        scale: 2, 
                        backgroundColor: '#0f172a' 
                    });
                    
                    const link = document.createElement('a');
                    link.download = `Output_${currentGeneratedOutputTitle.replace(/\s+/g, '_')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
                
                if (container) {
                    container.innerHTML = ''; 
                }
            }, 500);
            
        } catch(e) { 
            showCustomAlert("Error generating image."); 
        }
    }

    // ==========================================
    // 17. ADD PROMPT SUBMISSION & ADMIN
    // ==========================================
    const openAddPromptBtn = document.getElementById('openAddPromptBtn');
    if (openAddPromptBtn) {
        openAddPromptBtn.addEventListener('click', () => {
            const titleElem = document.getElementById('promptTitle');
            const descElem = document.getElementById('promptDesc');
            const textElem = document.getElementById('promptText');
            
            if (titleElem) titleElem.value = ''; 
            if (descElem) descElem.value = ''; 
            if (textElem) textElem.value = '';
            
            const addModal = document.getElementById('addPromptModal');
            if (addModal) {
                addModal.style.display = 'block';
            }
        });
    }

    const submitPromptBtn = document.getElementById('submitPromptBtn');
    if (submitPromptBtn) {
        submitPromptBtn.addEventListener('click', async () => {
            const titleElem = document.getElementById('promptTitle');
            const catElem = document.getElementById('promptCategory');
            const textElem = document.getElementById('promptText');
            
            const title = titleElem ? titleElem.value.trim() : '';
            const category = catElem ? catElem.value : '';
            const text = textElem ? textElem.value.trim() : '';
            
            if (!title || !text) {
                return showCustomAlert('Please fill Title and Prompt Text!');
            }
            
            const btn = document.getElementById('submitPromptBtn');
            if (btn) {
                btn.disabled = true;
            }
            
            try {
                await db.collection('community_prompts').add({ 
                    title: title, 
                    category: category, 
                    prompt_text: text, 
                    authorEmail: currentUser.email, 
                    upvotes: 0, 
                    status: 'pending', 
                    timestamp: firebase.firestore.FieldValue.serverTimestamp() 
                });
                
                showCustomAlert('Submitted Successfully for Admin Approval! 🚀');
                
                const addModal = document.getElementById('addPromptModal');
                if (addModal) {
                    addModal.style.display = 'none'; 
                }
                
                fetchCommunityPrompts();
                
            } catch(err) { 
                showCustomAlert(err.message); 
            }
            
            if (btn) {
                btn.disabled = false;
            }
        });
    }

    window.adminAction = async function(docId, action) {
        if (!isAdmin) {
            return;
        }
        
        try {
            if (action === 'approve') {
                await db.collection('community_prompts').doc(docId).update({ 
                    status: 'approved' 
                });
            } else if (action === 'reject') {
                await db.collection('community_prompts').doc(docId).delete();
            }
            
            fetchCommunityPrompts();
            
        } catch(e) { 
            showCustomAlert(e.message); 
        }
    };

    // ==========================================
    // 18. EDIT PROFILE & AVATAR SELECTION
    // ==========================================
    const profileContainer = document.getElementById('profileContainer');
    if (profileContainer) {
        profileContainer.addEventListener('click', (e) => {
            if (e.target.id === 'openEditProfileBtn') {
                const nameElem = document.getElementById('editProfileName');
                if (nameElem) {
                    nameElem.value = userProfileData.name || '';
                }
                
                selectedAvatar = userProfileData.avatar || '👨‍💻';
                
                document.querySelectorAll('.avatar-option').forEach((opt) => {
                    if (opt.getAttribute('data-avatar') === selectedAvatar) {
                        opt.classList.add('selected');
                    } else {
                        opt.classList.remove('selected');
                    }
                });
                
                const editModal = document.getElementById('editProfileModal');
                if (editModal) {
                    editModal.style.display = 'block';
                }
            }
        });
    }

    document.querySelectorAll('.avatar-option').forEach((opt) => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('.avatar-option').forEach((o) => {
                o.classList.remove('selected');
            });
            
            e.currentTarget.classList.add('selected');
            selectedAvatar = e.currentTarget.getAttribute('data-avatar');
        });
    });

    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const nameElem = document.getElementById('editProfileName');
            const newName = nameElem ? nameElem.value.trim() : '';
            
            if (!newName) {
                return showCustomAlert("Please enter a valid name!");
            }
            
            if (!currentUser) {
                return;
            }

            const btn = document.getElementById('saveProfileBtn');
            if (btn) {
                btn.innerHTML = "Saving... ⏳"; 
                btn.disabled = true;
            }

            try {
                await db.collection('users').doc(currentUser.uid).set({ 
                    name: newName, 
                    avatar: selectedAvatar 
                }, { 
                    merge: true 
                });
                
                userProfileData.name = newName; 
                userProfileData.avatar = selectedAvatar;
                
                showCustomAlert("Profile Updated Successfully! ✅");
                
                const editModal = document.getElementById('editProfileModal');
                if (editModal) {
                    editModal.style.display = 'none';
                }
                
                renderProfileDashboard(); 
                
            } catch (e) { 
                showCustomAlert("Error updating profile: " + e.message);
            } finally { 
                if (btn) {
                    btn.innerHTML = "Save Changes"; 
                    btn.disabled = false; 
                }
            }
        });
    }

    // ==========================================
    // 19. INITIAL FETCH
    // ==========================================
    fetchOfficialPrompts();

});
