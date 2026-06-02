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
    // 4. AUTHENTICATION, WALLET & PROFILE SYSTEM
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

            if (!doc.exists) {
                userProfileData = { 
                    email: user.email, 
                    coins: 20, 
                    name: defaultName, 
                    avatar: '👨‍💻' 
                };
                
                await userRef.set({ 
                    ...userProfileData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() 
                });
                
                document.getElementById('coinCount').innerText = "20";
            } else {
                userProfileData = doc.data();
                
                if (!userProfileData.name) {
                    userProfileData.name = defaultName;
                }
                
                if (!userProfileData.avatar) {
                    userProfileData.avatar = '👨‍💻';
                }
                
                document.getElementById('coinCount').innerText = userProfileData.coins || 0;
            }

            const uid = user.uid;
            const now = Date.now();
            const lastLogin = localStorage.getItem(`lastLogin_${uid}`);

            if (!lastLogin) {
                document.getElementById('welcomeTitle').textContent = "Welcome Aboard! 🚀";
                document.getElementById('welcomeMessage').textContent = `Hi ${userProfileData.name}, you've received 20 Free Coins to start generating!`;
                document.getElementById('welcomeModal').style.display = 'block';
            } else {
                const diffHours = (now - parseInt(lastLogin)) / (1000 * 60 * 60);
                if (diffHours >= 48) {
                    document.getElementById('welcomeTitle').textContent = "Welcome Back! ✨";
                    document.getElementById('welcomeMessage').textContent = `Great to see you again, ${userProfileData.name}. Keep creating!`;
                    document.getElementById('welcomeModal').style.display = 'block';
                }
            }
            
            localStorage.setItem(`lastLogin_${uid}`, now);
            
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
        if (!currentUser) {
            return false;
        }
        
        const userRef = db.collection('users').doc(currentUser.uid);
        
        try {
            const doc = await userRef.get();
            let currentCoins = doc.exists ? (doc.data().coins || 0) : 0;
            
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

    // AUTH BUTTON LISTENERS
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

    document.getElementById('googleAuthBtn').addEventListener('click', async () => {
        try {
            await auth.signInWithPopup(googleProvider);
            document.getElementById('authModal').style.display = 'none';
        } catch (error) { 
            showCustomAlert(error.message); 
        }
    });

    document.getElementById('forgotPasswordBtn').addEventListener('click', async () => {
        const email = document.getElementById('emailInput').value.trim();
        
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

    // ==========================================
    // 5. DATA FETCHING & FILTERING
    // ==========================================
    async function fetchOfficialPrompts() {
        try {
            const res = await fetch('prompts.json?t=' + Date.now());
            allOfficialPrompts = await res.json();
            filterAndRender();
        } catch (e) { 
            console.log(e); 
        }
    }

    async function fetchCommunityPrompts() {
        try {
            const snap = await db.collection('community_prompts').orderBy('timestamp', 'desc').get();
            
            allCommunityPrompts = snap.docs.map(doc => {
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
        return JSON.parse(localStorage.getItem(getBookmarksKey())) || []; 
    }

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
        if (!currentUser) {
            return showCustomAlert("Please Login to view your Profile! 👤");
        }
        
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
        });
        
        currentTab = 'profile';
        updateTabsUI();
        fetchCommunityPrompts();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            e.target.classList.add('active');
            
            if (e.target.id === 'tabOfficial') {
                currentTab = 'official';
            }
            if (e.target.id === 'tabCommunity') {
                currentTab = 'community';
            }
            if (e.target.id === 'tabSaved') {
                currentTab = 'saved';
            }
            if (e.target.id === 'tabLeaderboard') {
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
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            e.target.classList.add('active');
            currentCategory = e.target.getAttribute('data-category');
            filterAndRender();
        });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => { 
        currentSearch = e.target.value; 
        filterAndRender(); 
    });

// ================= YAHAN PART 1 KHATAM HOTA HAI =================
    // ==========================================
    // RENDER CREATOR DASHBOARD
    // ==========================================
    function renderProfileDashboard() {
        const profileContainer = document.getElementById('profileContainer');
        
        if (!currentUser) {
            return;
        }

        let myPrompts = allCommunityPrompts.filter(p => p.authorEmail === currentUser.email);
        
        let totalUpvotes = myPrompts.reduce((sum, p) => {
            return sum + (p.upvotes || 0);
        }, 0);
        
        let approvedCount = myPrompts.filter(p => p.status === 'approved').length;
        let pendingCount = myPrompts.filter(p => p.status === 'pending').length;
        let currentCoins = document.getElementById('coinCount').innerText;
        
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
                            <h2 style="color: var(--text-main); margin:0;">
                                ${displayName}
                            </h2>
                            <p style="color: var(--text-muted); font-size: 14px; margin:0;">
                                ${currentUser.email}
                            </p>
                        </div>
                    </div>
                    <button id="openEditProfileBtn" class="secondary-action-btn" style="width:auto; padding:8px 15px; font-size:13px; border-color:var(--accent-blue); color:var(--accent-blue);">
                        ✏️ Edit
                    </button>
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
            myPrompts.forEach(prompt => {
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
                            <span style="color:var(--text-muted); font-size:12px; font-weight:bold;">
                                ❤️ ${prompt.upvotes || 0}
                            </span>
                        </div>
                    </div>
                    
                    <h3 onclick="trackAndView('${pId}', '${encTitle}', '${encText}')" style="cursor:pointer;">
                        ${prompt.title || 'Untitled'}
                    </h3>
                    
                    <p class="preview-text" onclick="trackAndView('${pId}', '${encTitle}', '${encText}')">
                        "${(prompt.prompt_text||'').substring(0, 60)}..."
                    </p>
                    
                    <div class="action-row">
                        <button class="action-btn run-ai-btn" onclick="initiateAiRun('${encTitle}', '${encText}')">
                            ✨ Run AI
                        </button>
                        <button class="action-btn copy-card-btn" onclick="window.copyPrompt('${encText}')">
                            📋 Copy
                        </button>
                    </div>
                </div>`;
            });
        }
        
        html += `</div>`;
        profileContainer.innerHTML = html;
    }

    // ==========================================
    // FILTER AND RENDER LOGIC
    // ==========================================
    function filterAndRender() {
        
        if (currentTab === 'profile') {
            document.getElementById('promptContainer').style.display = 'none';
            document.getElementById('profileContainer').style.display = 'block';
            renderProfileDashboard();
            return;
        } else {
            document.getElementById('promptContainer').style.display = 'grid';
            document.getElementById('profileContainer').style.display = 'none';
        }

        if (currentTab === 'leaderboard') {
            const userScores = {};
            
            allCommunityPrompts.forEach(p => {
                if(p.status === 'approved' && p.authorEmail) {
                    userScores[p.authorEmail] = (userScores[p.authorEmail] || 0) + (p.upvotes || 0);
                }
            });
            
            const sortedUsers = Object.keys(userScores).map(email => {
                return {
                    email: email.split('@')[0], 
                    score: userScores[email]
                };
            }).sort((a,b) => {
                return b.score - a.score;
            }).slice(0,10);
            
            if(sortedUsers.length === 0) {
                promptContainer.innerHTML = `
                    <p style="text-align:center; color:var(--text-muted); margin-top:20px;">
                        No data available yet.
                    </p>
                `;
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
                if (idx === 0) rank = '🥇';
                else if (idx === 1) rank = '🥈';
                else if (idx === 2) rank = '🥉';
                else rank = `#${idx+1}`;
                
                html += `
                    <div class="lb-item">
                        <span class="lb-rank">${rank}</span>
                        <span class="lb-name">@${u.email}</span>
                        <span class="lb-score">❤️ ${u.score}</span>
                    </div>
                `;
            });
            
            promptContainer.innerHTML = html + `</div>`;
            document.getElementById('promptContainer').style.display = 'block'; 
            return;
        }

        let dataset = [];
        if (currentTab === 'official') {
            dataset = [...allOfficialPrompts];
        } else {
            dataset = [...allCommunityPrompts];
        }
        
        if (currentTab === 'community') {
            dataset = dataset.filter(p => {
                return p.status === 'approved' || isAdmin || (currentUser && p.authorEmail === currentUser.email);
            });
        } else if (currentTab === 'saved') {
            dataset = [...allOfficialPrompts, ...allCommunityPrompts].filter(p => {
                return getBookmarks().includes(p.id);
            });
        }

        if (currentCategory === 'Trending' && currentTab !== 'saved') {
            dataset.sort((a, b) => { 
                return (parseInt(localStorage.getItem(`views_${b.id}`)) || 0) - (parseInt(localStorage.getItem(`views_${a.id}`)) || 0); 
            });
            dataset = dataset.slice(0, 5); 
        } else if (currentCategory !== 'All' && currentCategory !== 'Trending') {
            dataset = dataset.filter(p => {
                return p.category === currentCategory;
            });
        }
        
        if (currentSearch) {
            const query = currentSearch.toLowerCase();
            dataset = dataset.filter(p => {
                return (p.title && p.title.toLowerCase().includes(query)) || 
                       (p.category && p.category.toLowerCase().includes(query)) || 
                       (p.prompt_text && p.prompt_text.toLowerCase().includes(query));
            });
        }

        promptContainer.innerHTML = '';
        
        if(dataset.length === 0) {
            promptContainer.innerHTML = `
                <p style="text-align:center; color:var(--text-muted); margin-top:20px;">
                    No prompts found.
                </p>
            `;
            return;
        }

        dataset.forEach(prompt => {
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
                
                <h3 onclick="trackAndView('${pId}', '${encTitle}', '${encText}')" style="cursor:pointer;">
                    ${prompt.title || 'Untitled'}
                </h3>
                
                <p class="preview-text" onclick="trackAndView('${pId}', '${encTitle}', '${encText}')">
                    "${(prompt.prompt_text||'').substring(0, 60)}..."
                </p>
                
                <div class="action-row">
                    <button class="action-btn run-ai-btn" onclick="initiateAiRun('${encTitle}', '${encText}')">
                        ✨ Run AI
                    </button>
                    <button class="action-btn copy-card-btn" onclick="window.copyPrompt('${encText}')">
                        📋 Copy
                    </button>
                    <button class="action-btn share-btn" onclick="window.sharePrompt('${encTitle}', '${encText}')">
                        📲 Share
                    </button>
                    ${adminControls}
                </div>
            `;
            promptContainer.appendChild(card);
        });
    }

    // ==========================================
    // CARD ACTIONS
    // ==========================================
    window.trackAndView = function(pId, encTitle, encText) {
        let currentViews = parseInt(localStorage.getItem(`views_${pId}`)) || 0;
        localStorage.setItem(`views_${pId}`, currentViews + 1);
        
        document.getElementById('viewModalTitle').textContent = decodeURIComponent(encTitle);
        
        textToCopy = decodeURIComponent(encText);
        document.getElementById('viewModalText').textContent = textToCopy;
        
        document.getElementById('viewPromptModal').style.display = 'block';
    }

    window.copyFromView = function() { 
        navigator.clipboard.writeText(textToCopy).then(() => { 
            showCustomAlert("Prompt Copied to Clipboard! 🚀"); 
            document.getElementById('viewPromptModal').style.display = 'none'; 
        }); 
    }
    
    window.copyPrompt = function(encText) { 
        navigator.clipboard.writeText(decodeURIComponent(encText)).then(() => {
            showCustomAlert("Copied to Clipboard! 🚀");
        }); 
    }
    
    window.sharePrompt = function(encTitle, encText) {
        const shareData = { 
            title: 'Prompt Hub', 
            text: `*${decodeURIComponent(encTitle)}*\n"${decodeURIComponent(encText)}"\n`, 
            url: window.location.href.split('?')[0] 
        };
        
        if (navigator.share) {
            navigator.share(shareData).catch(() => {});
        } else {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + shareData.url)}`, '_blank');
        }
    }

    // ==========================================
    // 6. AI RUN FLOW
    // ==========================================
    window.initiateAiRun = function(encTitle, encText) {
        pendingAiRunData = { 
            title: encTitle, 
            text: encText 
        };
        document.getElementById('adPromptModal').style.display = 'block';
    }

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
    // 7. SMART TEST MODE (API BYPASS FOR TESTING)
    // ==========================================
    document.getElementById('generateAiBtn').addEventListener('click', async (e) => {
        if (!currentUser) {
            return showCustomAlert("Please Login to generate AI Content!");
        }
        
        let hasCoins = await updateCoins(-5);
        
        if (!hasCoins) {
            document.getElementById('aiRunModal').style.display = 'none';
            return showCoinModal();
        }

        const btn = e.target;
        btn.innerHTML = "✨ Generating...";
        btn.disabled = true;

        // FAKE DELAY FOR TESTING
        setTimeout(() => {
            currentGeneratedOutputHtml = `
                <h3>🚀 Test Mode Active!</h3>
                <p>Bhai, aapke <b>5 Coins deduct ho gaye hain!</b> API bypass kar di gayi hai taaki aap aage ka flow test kar sako.</p>
                <p>Abhi niche <b>🖼️ Export</b> button dabao aur Custom Brand watermark test karo.</p>
            `;
            
            document.getElementById('aiOutputText').innerHTML = currentGeneratedOutputHtml;
            document.getElementById('aiOutputContainer').style.display = 'block';

            document.getElementById('copyAiOutputBtn').onclick = () => {
                navigator.clipboard.writeText("Test Output Copied!").then(() => {
                    showCustomAlert("Output Copied! 🚀");
                });
            };

            btn.innerHTML = "Generate Output (Cost: 5 🪙)";
            btn.disabled = false;
        }, 2000);
    });

    // ==========================================
    // 8. EXPORT MODULE (WITH STORY FORMAT)
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
        
        if (userProfileData && userProfileData.name) {
            document.getElementById('customBrandText').value = '@' + userProfileData.name.replace(/\s+/g, '');
        }
        
        document.getElementById('customWatermarkModal').style.display = 'block';
    });

    document.getElementById('downloadCustomBrandBtn').addEventListener('click', async () => {
        if (!currentUser) {
            return showCustomAlert("Please Login first!");
        }

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
                const canvas = await html2canvas(document.getElementById('posterTarget'), {
                    scale: 2, 
                    backgroundColor: '#0f172a'
                });
                
                const link = document.createElement('a');
                link.download = `Output_${currentGeneratedOutputTitle.replace(/\s+/g, '_')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                container.innerHTML = ''; 
                
            }, 500);
        } catch(e) { 
            showCustomAlert("Error generating image."); 
        }
    }

    // ==========================================
    // 9. ADD PROMPT SUBMISSION
    // ==========================================
    document.getElementById('openAddPromptBtn').addEventListener('click', () => {
        document.getElementById('promptTitle').value = ''; 
        document.getElementById('promptDesc').value = ''; 
        document.getElementById('promptText').value = '';
        document.getElementById('addPromptModal').style.display = 'block';
    });

    document.getElementById('submitPromptBtn').addEventListener('click', async () => {
        const title = document.getElementById('promptTitle').value.trim();
        const category = document.getElementById('promptCategory').value;
        const text = document.getElementById('promptText').value.trim();
        
        if (!title || !text) {
            return showCustomAlert('Please fill Title and Prompt Text!');
        }
        
        document.getElementById('submitPromptBtn').disabled = true;
        
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
            document.getElementById('addPromptModal').style.display = 'none'; 
            fetchCommunityPrompts();
            
        } catch(err) { 
            showCustomAlert(err.message); 
        }
        
        document.getElementById('submitPromptBtn').disabled = false;
    });

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
    }

    // ==========================================
    // 10. EDIT PROFILE & AVATAR LOGIC
    // ==========================================
    
    // Using Event Delegation to catch the dynamically created "Edit" button click
    document.getElementById('profileContainer').addEventListener('click', (e) => {
        if (e.target.id === 'openEditProfileBtn') {
            document.getElementById('editProfileName').value = userProfileData.name || '';
            selectedAvatar = userProfileData.avatar || '👨‍💻';
            
            // Highlight saved avatar
            document.querySelectorAll('.avatar-option').forEach(opt => {
                if (opt.getAttribute('data-avatar') === selectedAvatar) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
            
            document.getElementById('editProfileModal').style.display = 'block';
        }
    });

    // AVATAR SELECTION CLICK LISTENER
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('.avatar-option').forEach(o => {
                o.classList.remove('selected');
            });
            
            e.target.classList.add('selected');
            selectedAvatar = e.target.getAttribute('data-avatar');
        });
    });

    // SAVE PROFILE TO FIREBASE
    document.getElementById('saveProfileBtn').addEventListener('click', async () => {
        const newName = document.getElementById('editProfileName').value.trim();
        
        if (!newName) {
            return showCustomAlert("Please enter a valid name!");
        }
        
        if (!currentUser) {
            return;
        }

        const btn = document.getElementById('saveProfileBtn');
        btn.innerHTML = "Saving... ⏳";
        btn.disabled = true;

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
            document.getElementById('editProfileModal').style.display = 'none';
            
            renderProfileDashboard(); 
            
        } catch (e) {
            showCustomAlert("Error updating profile: " + e.message);
        } finally {
            btn.innerHTML = "Save Changes";
            btn.disabled = false;
        }
    });

    // Initialize fetching data on load
    fetchOfficialPrompts();
});
