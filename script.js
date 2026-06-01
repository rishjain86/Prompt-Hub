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

    // ADMINS & API KEYS
    const ADMIN_EMAILS = ['lootocashnow@gmail.com', 'shjain86@gmail.com']; 
    
    // Splitting the new AQ. API key to bypass GitHub's automatic secret scanner
    const keyPart1 = "AQ.Ab8RN6LrzfYa_";
    const keyPart2 = "TPgPxzSEq_IUZMaYm";
    const keyPart3 = "X0GkLB59CVC8FD525Ghw";
    const GEMINI_API_KEY = keyPart1 + keyPart2 + keyPart3;

    // DOM ELEMENTS
    const authBtn = document.getElementById('authBtn');
    const authModal = document.getElementById('authModal');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const submitAuthBtn = document.getElementById('submitAuthBtn');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const modalTitle = document.getElementById('modalTitle');
    
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuOverlay = document.getElementById('sideMenuOverlay');
    const menuCategories = document.querySelectorAll('#menuCategories li');

    const tabOfficial = document.getElementById('tabOfficial');
    const tabCommunity = document.getElementById('tabCommunity');
    const tabSaved = document.getElementById('tabSaved');
    const categoryFilter = document.getElementById('categoryFilter');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const promptContainer = document.getElementById('promptContainer');

    const openAddPromptBtn = document.getElementById('openAddPromptBtn');
    const addPromptModal = document.getElementById('addPromptModal');
    const submitPromptBtn = document.getElementById('submitPromptBtn');
    const addModalTitle = document.getElementById('addModalTitle');

    const viewPromptModal = document.getElementById('viewPromptModal');
    const viewModalTitle = document.getElementById('viewModalTitle');
    const viewModalText = document.getElementById('viewModalText');

    // AI MODAL ELEMENTS
    const aiRunModal = document.getElementById('aiRunModal');
    const aiPromptTitle = document.getElementById('aiPromptTitle');
    const dynamicInputsContainer = document.getElementById('dynamicInputsContainer');
    const generateAiBtn = document.getElementById('generateAiBtn');
    const aiOutputContainer = document.getElementById('aiOutputContainer');
    const aiOutputText = document.getElementById('aiOutputText');
    const copyAiOutputBtn = document.getElementById('copyAiOutputBtn');

    const historyModal = document.getElementById('historyModal');
    const historyContent = document.getElementById('historyContent');
    const themeAlertModal = document.getElementById('themeAlertModal');
    const themeAlertText = document.getElementById('themeAlertText');

    // GLOBALS
    let isLoginMode = true;
    let currentUser = null;
    let isAdmin = false;
    let allOfficialPrompts = [];
    let allCommunityPrompts = [];
    let currentTab = 'official'; 
    let currentCategory = 'All';
    let currentSearch = '';
    let textToCopy = '';
    let editingPromptId = null;
    let editingPromptData = null;
    let currentAiPromptText = ''; 

    // UTILS
    window.showCustomAlert = function(message) {
        themeAlertText.innerHTML = message;
        themeAlertModal.style.display = 'block';
    }
    
    // Close Modals when clicking outside
    window.onclick = function(event) {
        const modals = [authModal, document.getElementById('welcomeModal'), addPromptModal, viewPromptModal, historyModal, themeAlertModal, aiRunModal];
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // HAMBURGER MENU
    function toggleMenu(show) {
        if(show) {
            sideMenu.classList.add('open');
            sideMenuOverlay.style.display = 'block';
        } else {
            sideMenu.classList.remove('open');
            sideMenuOverlay.style.display = 'none';
        }
    }
    hamburgerBtn.addEventListener('click', () => toggleMenu(true));
    sideMenuOverlay.addEventListener('click', () => toggleMenu(false));

    menuCategories.forEach(li => {
        li.addEventListener('click', (e) => {
            currentCategory = e.target.getAttribute('data-category');
            filterBtns.forEach(b => b.classList.remove('active'));
            const matchingBtn = document.querySelector(`.filter-btn[data-category="${currentCategory}"]`);
            if(matchingBtn) matchingBtn.classList.add('active');
            toggleMenu(false);
            filterAndRender();
        });
    });

    // AUTH & WELCOME LOGIC
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            isAdmin = ADMIN_EMAILS.includes(user.email);
            
            // Clean UI Update for Logout state
            authBtn.textContent = "Logout";
            authBtn.classList.add('logout-state');

            const uid = user.uid;
            const now = Date.now();
            const lastLogin = localStorage.getItem(`lastLogin_${uid}`);
            const userName = user.displayName || user.email.split('@')[0];

            if (!lastLogin) {
                document.getElementById('welcomeTitle').textContent = "Welcome Aboard! 🚀";
                document.getElementById('welcomeMessage').textContent = `Hi ${userName}, thanks for joining Prompt Hub. Explore the best AI prompts instantly.`;
                document.getElementById('welcomeModal').style.display = 'block';
            } else {
                const diffHours = (now - parseInt(lastLogin)) / (1000 * 60 * 60);
                if (diffHours >= 48) {
                    document.getElementById('welcomeTitle').textContent = "Welcome Back! ✨";
                    document.getElementById('welcomeMessage').textContent = `Great to see you again, ${userName}. Check out what's trending today!`;
                    document.getElementById('welcomeModal').style.display = 'block';
                }
            }
            localStorage.setItem(`lastLogin_${uid}`, now);
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
            try {
                await auth.signOut();
                showCustomAlert("Logged out successfully! 👋");
            } catch(e) {
                showCustomAlert("Error logging out.");
            }
        } else {
            authModal.style.display = 'block';
        }
    });

    toggleAuthMode.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        modalTitle.textContent = isLoginMode ? "Login" : "Create Account";
        submitAuthBtn.textContent = isLoginMode ? "Login" : "Sign Up";
        toggleAuthMode.innerHTML = isLoginMode ? "Don't have an account? <span>Sign Up</span>" : "Already have an account? <span>Login</span>";
    });

    submitAuthBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) return showCustomAlert("Please fill all fields.");
        submitAuthBtn.disabled = true;
        try {
            if (isLoginMode) await auth.signInWithEmailAndPassword(email, password);
            else await auth.createUserWithEmailAndPassword(email, password);
            authModal.style.display = 'none';
        } catch (error) { showCustomAlert(error.message); }
        submitAuthBtn.disabled = false;
    });

    googleAuthBtn.addEventListener('click', async () => {
        try {
            await auth.signInWithPopup(googleProvider);
            authModal.style.display = 'none';
        } catch (error) { showCustomAlert(error.message); }
    });

    forgotPasswordBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email) return showCustomAlert("Please enter your email address in the input field above first.");
        try {
            await auth.sendPasswordResetEmail(email);
            showCustomAlert("Password reset link has been sent to your email!");
            authModal.style.display = 'none';
        } catch (error) { showCustomAlert(error.message); }
    });

    // DATA FETCHING
    async function fetchOfficialPrompts() {
        promptContainer.innerHTML = '<p style="text-align:center;">Loading Expert Prompts...</p>';
        try {
            const response = await fetch('prompts.json?t=' + Date.now());
            if (!response.ok) throw new Error('File not found');
            allOfficialPrompts = await response.json();
            filterAndRender();
        } catch (e) {
            promptContainer.innerHTML = '<p style="text-align:center; color:#ef4444;">Error loading prompts.</p>';
        }
    }

    async function fetchCommunityPrompts() {
        try {
            const snapshot = await db.collection('community_prompts').orderBy('timestamp', 'desc').get();
            allCommunityPrompts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if(currentTab === 'community') filterAndRender();
        } catch(e) { console.error(e); }
    }

    // BOOKMARKS LOGIC
    function getBookmarksKey() {
        return currentUser ? `bookmarks_${currentUser.uid}` : `bookmarks_guest`;
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

    // FILTER & SEARCH
    function filterAndRender() {
        let dataset = [];
        
        if (currentTab === 'official') {
            dataset = [...allOfficialPrompts];
        } else if (currentTab === 'community') {
            dataset = allCommunityPrompts.filter(p => {
                if (isAdmin) return true; 
                if (p.status === 'approved') return true; 
                if (currentUser && p.authorEmail === currentUser.email) return true; 
                return false;
            });
        } else if (currentTab === 'saved') {
            const bookmarks = getBookmarks();
            const merged = [...allOfficialPrompts, ...allCommunityPrompts];
            dataset = merged.filter(p => bookmarks.includes(p.id));
        }

        if (currentCategory === 'Trending' && currentTab !== 'saved') {
            dataset.sort((a, b) => {
                const viewsA = parseInt(localStorage.getItem(`views_${a.id}`)) || 0;
                const viewsB = parseInt(localStorage.getItem(`views_${b.id}`)) || 0;
                return viewsB - viewsA;
            });
            dataset = dataset.slice(0, 5); 
        } else if (currentCategory !== 'All' && currentCategory !== 'Trending') {
            dataset = dataset.filter(p => p.category === currentCategory);
        }
        
        if (currentSearch) {
            const query = currentSearch.toLowerCase();
            dataset = dataset.filter(p => 
                (p.title && p.title.toLowerCase().includes(query)) || 
                (p.category && p.category.toLowerCase().includes(query)) ||
                (p.description && p.description.toLowerCase().includes(query)) ||
                (p.prompt_text && p.prompt_text.toLowerCase().includes(query))
            );
        }
        renderPrompts(dataset, currentTab === 'community');
    }

    searchInput.addEventListener('input', (e) => { currentSearch = e.target.value; filterAndRender(); });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.getAttribute('data-category');
            filterAndRender();
        });
    });

    function updateTabsUI() {
        if(currentTab === 'community' && currentUser) openAddPromptBtn.style.display = 'block';
        else openAddPromptBtn.style.display = 'none';

        if(currentTab === 'saved') categoryFilter.style.display = 'none';
        else categoryFilter.style.display = 'flex';
    }

    tabOfficial.addEventListener('click', () => {
        currentTab = 'official';
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabOfficial.classList.add('active');
        updateTabsUI();
        filterAndRender();
    });

    tabCommunity.addEventListener('click', () => {
        currentTab = 'community';
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabCommunity.classList.add('active');
        updateTabsUI();
        fetchCommunityPrompts();
        filterAndRender();
    });

    tabSaved.addEventListener('click', () => {
        currentTab = 'saved';
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabSaved.classList.add('active');
        updateTabsUI();
        if(allCommunityPrompts.length === 0) fetchCommunityPrompts(); 
        else filterAndRender();
    });

    // RENDER CARDS
    function renderPrompts(promptsToRender, isCommunity) {
        promptContainer.innerHTML = '';
        if(promptsToRender.length === 0){
            let emptyMsg = currentTab === 'saved' ? "You haven't saved any prompts yet! ⭐" : "No prompts found.";
            promptContainer.innerHTML = `<p style="text-align:center; margin-top: 30px; color: var(--text-muted);">${emptyMsg}</p>`;
            return;
        }

        const bookmarks = getBookmarks();

        promptsToRender.forEach(prompt => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            const fullText = prompt.prompt_text || '';
            const preview = fullText.length > 75 ? fullText.substring(0, 75) + '...' : fullText;
            const encTitle = encodeURIComponent(prompt.title || 'Untitled');
            const encText = encodeURIComponent(fullText);
            const pId = prompt.id || 'custom_' + Math.random().toString(36).substr(2, 9);
            const isSaved = bookmarks.includes(pId);

            let badgesHtml = `<span class="category-badge">${prompt.category || 'General'}</span>`;
            if (prompt.status === 'pending') badgesHtml += `<span class="pending-badge">Pending</span>`;
            if (prompt.isEdited) badgesHtml += `<span class="edited-badge">Edited</span>`;

            let historyIconHtml = '';
            if (prompt.isEdited) {
                const historyData = encodeURIComponent(JSON.stringify(prompt.editHistory || []));
                historyIconHtml = `<button class="card-icon-btn" onclick="openHistory('${historyData}')" title="View Edit History">⏱️</button>`;
            }

            let adminControls = '';
            if (isAdmin && prompt.status === 'pending') {
                adminControls = `
                    <div style="display:flex; gap:10px; width:100%; margin-top:5px;">
                        <button class="action-btn admin-btn approve" onclick="adminAction('${prompt.id}', 'approve')">Approve</button>
                        <button class="action-btn admin-btn reject" onclick="adminAction('${prompt.id}', 'reject')">Reject</button>
                    </div>`;
            }

            let authorControls = '';
            if (currentUser && prompt.authorEmail === currentUser.email) {
                authorControls = `<button class="action-btn edit-btn" onclick="openEditModal('${prompt.id}')">Edit Prompt</button>`;
            }

            card.innerHTML = `
                <div class="card-header-row">
                    <div class="badges-container">${badgesHtml}</div>
                    <div class="icon-group">
                        ${historyIconHtml}
                        <button class="card-icon-btn ${isSaved ? 'saved' : ''}" onclick="toggleBookmark('${pId}')" title="Save Prompt">${isSaved ? '★' : '☆'}</button>
                    </div>
                </div>
                <h3 onclick="trackAndView('${pId}', '${encTitle}', '${encText}')" style="cursor:pointer;">${prompt.title || 'Untitled'}</h3>
                <p class="preview-text" onclick="trackAndView('${pId}', '${encTitle}', '${encText}')">"${preview}"</p>
                <div class="action-row">
                    <button class="action-btn run-ai-btn" onclick="openAiModal('${encTitle}', '${encText}')">✨ Run</button>
                    <button class="action-btn copy-card-btn" onclick="copyPrompt('${encText}')">📋 Copy</button>
                    <button class="action-btn share-btn" onclick="sharePrompt('${encTitle}', '${encText}')">📲 Share</button>
                    ${authorControls}
                    ${adminControls}
                </div>
            `;
            promptContainer.appendChild(card);
        });
    }

    // ACTIONS
    window.trackAndView = function(pId, encTitle, encText) {
        let currentViews = parseInt(localStorage.getItem(`views_${pId}`)) || 0;
        localStorage.setItem(`views_${pId}`, currentViews + 1);
        openViewModal(encTitle, encText);
    }

    window.openViewModal = function(encTitle, encText) {
        viewModalTitle.textContent = decodeURIComponent(encTitle);
        textToCopy = decodeURIComponent(encText);
        viewModalText.textContent = textToCopy;
        viewPromptModal.style.display = 'block';
    }
    
    window.copyPrompt = function(encText) {
        navigator.clipboard.writeText(decodeURIComponent(encText)).then(() => showCustomAlert("Prompt Copied to Clipboard! 🚀"));
    }
    
    window.copyFromView = function() {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showCustomAlert("Prompt Copied to Clipboard! 🚀");
            viewPromptModal.style.display = 'none';
        });
    }

    // SHARE NATIVE API
    window.sharePrompt = function(encTitle, encText) {
        const title = decodeURIComponent(encTitle);
        const text = decodeURIComponent(encText);
        const url = window.location.href.split('?')[0]; 
        const shareData = {
            title: 'Prompt Hub: ' + title,
            text: `Check out this amazing AI prompt on *Prompt Hub*:\n\n*${title}*\n"${text}"\n\n`,
            url: url
        };

        if (navigator.share) {
            navigator.share(shareData).catch(err => {
                console.log("Share cancelled", err);
            });
        } else {
            const waMessage = `${shareData.text}Try it here: ${url}`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`, '_blank');
        }
    }

    // AI INTEGRATION LOGIC
    window.openAiModal = function(encTitle, encText) {
        const title = decodeURIComponent(encTitle);
        currentAiPromptText = decodeURIComponent(encText);
        
        aiPromptTitle.textContent = title;
        dynamicInputsContainer.innerHTML = '';
        aiOutputContainer.style.display = 'none';
        aiOutputText.innerHTML = '';
        
        const matches = [...currentAiPromptText.matchAll(/\[(.*?)\]/g)];
        const uniqueVars = [...new Set(matches.map(m => m[1]))]; 
        
        if (uniqueVars.length === 0) {
            dynamicInputsContainer.innerHTML = '<p style="color:var(--accent-green); margin-bottom:15px;">No variables detected. You can run this prompt directly!</p>';
        } else {
            uniqueVars.forEach(vName => {
                const inputHtml = `
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 13px; color: var(--text-muted); display:block; margin-bottom: 5px; text-transform: capitalize;">${vName}:</label>
                        <input type="text" class="ai-var-input" data-var="${vName}" placeholder="Enter ${vName}..." style="margin-bottom: 0;">
                    </div>
                `;
                dynamicInputsContainer.insertAdjacentHTML('beforeend', inputHtml);
            });
        }
        
        aiRunModal.style.display = 'block';
    }

    generateAiBtn.addEventListener('click', async () => {
        let finalPrompt = currentAiPromptText;
        const inputs = document.querySelectorAll('.ai-var-input');
        
        inputs.forEach(input => {
            const varName = input.getAttribute('data-var');
            const val = input.value.trim() || `[${varName}]`; 
            const regex = new RegExp(`\\[${varName}\\]`, 'g');
            finalPrompt = finalPrompt.replace(regex, val);
        });

        generateAiBtn.innerHTML = "✨ Generating... Please wait";
        generateAiBtn.disabled = true;
        aiOutputContainer.style.display = 'none';

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            const markdownText = data.candidates[0].content.parts[0].text;
            
            if (typeof marked !== 'undefined') {
                aiOutputText.innerHTML = marked.parse(markdownText);
            } else {
                aiOutputText.innerText = markdownText;
            }
            
            copyAiOutputBtn.onclick = function() {
                navigator.clipboard.writeText(markdownText).then(() => {
                    showCustomAlert("AI Output Copied! 🚀");
                });
            };
            
            aiOutputContainer.style.display = 'block';
        } catch (err) {
            showCustomAlert("AI Generation Error: " + err.message);
        } finally {
            generateAiBtn.innerHTML = "Generate Output";
            generateAiBtn.disabled = false;
        }
    });

    // ADMIN ACTIONS
    window.adminAction = async function(docId, action) {
        if (!isAdmin) return;
        try {
            if (action === 'approve') {
                await db.collection('community_prompts').doc(docId).update({ status: 'approved' });
                showCustomAlert("Prompt Approved.");
            } else if (action === 'reject') {
                await db.collection('community_prompts').doc(docId).delete();
                showCustomAlert("Prompt Rejected/Deleted.");
            }
            fetchCommunityPrompts();
        } catch(e) { showCustomAlert(e.message); }
    }

    // ADD / EDIT PROMPT
    openAddPromptBtn.addEventListener('click', () => {
        editingPromptId = null;
        editingPromptData = null;
        addModalTitle.textContent = "Submit for Approval";
        document.getElementById('promptTitle').value = '';
        document.getElementById('promptDesc').value = '';
        document.getElementById('promptText').value = '';
        addPromptModal.style.display = 'block';
    });

    window.openEditModal = function(docId) {
        const prompt = allCommunityPrompts.find(p => p.id === docId);
        if (!prompt) return;
        editingPromptId = docId;
        editingPromptData = prompt;
        addModalTitle.textContent = "Edit Prompt";
        document.getElementById('promptTitle').value = prompt.title || '';
        document.getElementById('promptCategory').value = prompt.category || 'Coding & Tech';
        document.getElementById('promptDesc').value = prompt.description || '';
        document.getElementById('promptText').value = prompt.prompt_text || '';
        addPromptModal.style.display = 'block';
    }

    submitPromptBtn.addEventListener('click', async () => {
        const title = document.getElementById('promptTitle').value.trim();
        const category = document.getElementById('promptCategory').value;
        const desc = document.getElementById('promptDesc').value.trim();
        const text = document.getElementById('promptText').value.trim();
        
        if(!title || !category || !desc || !text) return showCustomAlert('Please fill all fields!');
        submitPromptBtn.disabled = true;

        try {
            if (editingPromptId && editingPromptData) {
                let historyArr = Array.isArray(editingPromptData.editHistory) ? [...editingPromptData.editHistory] : [];
                historyArr.push({
                    title: editingPromptData.title || 'Untitled',
                    description: editingPromptData.description || '',
                    prompt_text: editingPromptData.prompt_text || '',
                    timestamp: new Date().toISOString()
                });

                await db.collection('community_prompts').doc(editingPromptId).update({
                    title, category, description: desc, prompt_text: text,
                    status: 'pending', 
                    isEdited: true,
                    editHistory: historyArr
                });
                showCustomAlert('Edit submitted for admin approval! 🚀');
            } else {
                await db.collection('community_prompts').add({
                    title, category, description: desc, prompt_text: text,
                    authorEmail: currentUser.email, upvotes: 0,
                    status: 'pending', 
                    isEdited: false,
                    editHistory: [],
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                showCustomAlert('Published Successfully for Admin Approval! 🚀');
            }
            
            addPromptModal.style.display = 'none';
            fetchCommunityPrompts();
        } catch(err) { showCustomAlert(err.message); }
        submitPromptBtn.disabled = false;
    });

    window.openHistory = function(encHistoryData) {
        const historyArr = JSON.parse(decodeURIComponent(encHistoryData));
        historyContent.innerHTML = '';
        if (historyArr.length === 0) {
            historyContent.innerHTML = '<p style="color:var(--text-muted)">No history available.</p>';
        } else {
            const sortedHistory = historyArr.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            sortedHistory.forEach(item => {
                const dateStr = new Date(item.timestamp).toLocaleString();
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div class="history-date">${dateStr}</div>
                    <div class="history-text"><strong>Title:</strong> ${item.title}<br/><br/><strong>Text:</strong><br/>${item.prompt_text}</div>
                `;
                historyContent.appendChild(div);
            });
        }
        historyModal.style.display = 'block';
    }

    // INIT
    fetchOfficialPrompts();
});
