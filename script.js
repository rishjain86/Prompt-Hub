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

    // ADMINS EMAILS
    const ADMIN_EMAILS = ['lootocashnow@gmail.com', 'shjain86@gmail.com']; 

    // DOM ELEMENTS
    const authBtn = document.getElementById('authBtn');
    const authModal = document.getElementById('authModal');
    const closeModal = document.getElementById('closeModal');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const submitAuthBtn = document.getElementById('submitAuthBtn');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const modalTitle = document.getElementById('modalTitle');
    
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const welcomeOkBtn = document.getElementById('welcomeOkBtn');

    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuOverlay = document.getElementById('sideMenuOverlay');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const menuCategories = document.querySelectorAll('#menuCategories li');

    const tabOfficial = document.getElementById('tabOfficial');
    const tabCommunity = document.getElementById('tabCommunity');
    const categoryFilter = document.getElementById('categoryFilter');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const promptContainer = document.getElementById('promptContainer');

    const openAddPromptBtn = document.getElementById('openAddPromptBtn');
    const addPromptModal = document.getElementById('addPromptModal');
    const closeAddModal = document.getElementById('closeAddModal');
    const submitPromptBtn = document.getElementById('submitPromptBtn');
    const addModalTitle = document.getElementById('addModalTitle');

    const themeAlertModal = document.getElementById('themeAlertModal');
    const themeAlertText = document.getElementById('themeAlertText');
    const themeAlertOkBtn = document.getElementById('themeAlertOkBtn');

    const viewPromptModal = document.getElementById('viewPromptModal');
    const closeViewModal = document.getElementById('closeViewModal');
    const viewModalTitle = document.getElementById('viewModalTitle');
    const viewModalText = document.getElementById('viewModalText');
    const copyFromViewBtn = document.getElementById('copyFromViewBtn');

    const historyModal = document.getElementById('historyModal');
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    const historyContent = document.getElementById('historyContent');

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

    // UTILS
    function showCustomAlert(message) {
        themeAlertText.innerHTML = message;
        themeAlertModal.style.display = 'block';
    }
    
    // Close Modals when clicking outside
    window.onclick = function(event) {
        const modals = [authModal, welcomeModal, addPromptModal, viewPromptModal, historyModal, themeAlertModal];
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    themeAlertOkBtn.addEventListener('click', () => themeAlertModal.style.display = 'none');
    welcomeOkBtn.addEventListener('click', () => welcomeModal.style.display = 'none');
    closeHistoryModal.addEventListener('click', () => historyModal.style.display = 'none');

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
    closeMenuBtn.addEventListener('click', () => toggleMenu(false));
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
            authBtn.textContent = "Logout";
            authBtn.style.color = "#ef4444";
            authBtn.style.borderColor = "#ef4444";
            if (currentTab === 'community') openAddPromptBtn.style.display = 'block';

            const uid = user.uid;
            const now = Date.now();
            const lastLogin = localStorage.getItem(`lastLogin_${uid}`);
            const userName = user.displayName || user.email.split('@')[0];

            if (!lastLogin) {
                welcomeTitle.textContent = "Welcome Aboard! 🚀";
                welcomeMessage.textContent = `Hi ${userName}, thanks for joining Prompt Hub. Explore the best AI prompts instantly.`;
                welcomeModal.style.display = 'block';
            } else {
                const diffHours = (now - parseInt(lastLogin)) / (1000 * 60 * 60);
                if (diffHours >= 48) {
                    welcomeTitle.textContent = "Welcome Back! ✨";
                    welcomeMessage.textContent = `Great to see you again, ${userName}. Check out what's trending today!`;
                    welcomeModal.style.display = 'block';
                }
            }
            localStorage.setItem(`lastLogin_${uid}`, now);
            
            if(currentTab === 'community') filterAndRender();
        } else {
            currentUser = null;
            isAdmin = false;
            authBtn.textContent = "Login";
            authBtn.style.color = "#38bdf8";
            authBtn.style.borderColor = "#38bdf8";
            openAddPromptBtn.style.display = 'none';
            if(currentTab === 'community') filterAndRender();
        }
    });

    authBtn.addEventListener('click', () => {
        if (currentUser) auth.signOut();
        else authModal.style.display = 'block';
    });
    closeModal.addEventListener('click', () => authModal.style.display = 'none');

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
        promptContainer.innerHTML = '<p style="text-align:center;">Loading Community Prompts...</p>';
        try {
            const snapshot = await db.collection('community_prompts').orderBy('timestamp', 'desc').get();
            allCommunityPrompts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterAndRender();
        } catch(e) { promptContainer.innerHTML = '<p style="text-align:center; color:#ef4444;">Error loading database.</p>'; }
    }

    // FILTER & SEARCH WITH REAL-TIME LOCAL TRENDING VISUALS
    function filterAndRender() {
        let dataset = currentTab === 'official' ? [...allOfficialPrompts] : [...allCommunityPrompts];
        
        if (currentTab === 'community') {
            dataset = dataset.filter(p => {
                if (isAdmin) return true; 
                if (p.status === 'approved') return true; 
                if (currentUser && p.authorEmail === currentUser.email) return true; 
                return false;
            });
        }

        if (currentCategory === 'Trending') {
            // Sort database array dynamically by local tracking clicks
            dataset.sort((a, b) => {
                const viewsA = parseInt(localStorage.getItem(`views_${a.id}`)) || 0;
                const viewsB = parseInt(localStorage.getItem(`views_${b.id}`)) || 0;
                return viewsB - viewsA;
            });
            dataset = dataset.slice(0, 5); 
        } else if (currentCategory !== 'All') {
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

    tabOfficial.addEventListener('click', () => {
        currentTab = 'official';
        tabOfficial.classList.add('active');
        tabCommunity.classList.remove('active');
        categoryFilter.style.display = 'flex';
        openAddPromptBtn.style.display = 'none';
        filterAndRender();
    });

    tabCommunity.addEventListener('click', () => {
        currentTab = 'community';
        tabCommunity.classList.add('active');
        tabOfficial.classList.remove('active');
        categoryFilter.style.display = 'none';
        currentCategory = 'All';
        filterBtns.forEach(b => b.classList.remove('active'));
        filterBtns[0].classList.add('active');
        if(currentUser) openAddPromptBtn.style.display = 'block';
        fetchCommunityPrompts();
    });

    // RENDER CARDS
    function renderPrompts(promptsToRender, isCommunity) {
        promptContainer.innerHTML = '';
        if(promptsToRender.length === 0){
            promptContainer.innerHTML = '<p style="text-align:center;">No prompts found.</p>';
            return;
        }
        promptsToRender.forEach(prompt => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            const fullText = prompt.prompt_text || '';
            const preview = fullText.length > 75 ? fullText.substring(0, 75) + '...' : fullText;
            const encTitle = encodeURIComponent(prompt.title || 'Untitled');
            const encText = encodeURIComponent(fullText);
            const pId = prompt.id || 'custom_' + Math.random().toString(36).substr(2, 9);

            let badgesHtml = `<span class="category-badge">${prompt.category || 'General'}</span>`;
            if (isCommunity && prompt.status === 'pending') {
                badgesHtml += `<span class="pending-badge">Pending Approval</span>`;
            }
            if (isCommunity && prompt.isEdited) {
                badgesHtml += `<span class="edited-badge">Edited</span>`;
            }

            let historyIconHtml = '';
            if (isCommunity && prompt.isEdited) {
                const historyData = encodeURIComponent(JSON.stringify(prompt.editHistory || []));
                historyIconHtml = `<button class="history-icon-btn" onclick="openHistory('${historyData}')" title="View Edit History">⏱️</button>`;
            }

            let adminControls = '';
            if (isAdmin && prompt.status === 'pending') {
                adminControls = `
                    <button class="admin-btn approve" onclick="adminAction('${prompt.id}', 'approve')">Approve</button>
                    <button class="admin-btn reject" onclick="adminAction('${prompt.id}', 'reject')">Reject</button>
                `;
            }

            let authorControls = '';
            if (currentUser && prompt.authorEmail === currentUser.email) {
                authorControls = `<button class="edit-btn" onclick="openEditModal('${prompt.id}')">Edit</button>`;
            }

            card.innerHTML = `
                <div class="card-header-row">
                    <div class="badges-container">${badgesHtml}</div>
                    ${historyIconHtml}
                </div>
                <h3>${prompt.title || 'Untitled'}</h3>
                <p class="preview-text">"${preview}"</p>
                <div class="action-row">
                    <button class="view-btn" onclick="trackAndView('${pId}', '${encTitle}', '${encText}')">View</button>
                    <button class="copy-card-btn" onclick="copyPrompt('${encText}')">Copy</button>
                    ${isCommunity ? `<button class="upvote-btn" onclick="upvotePrompt('${prompt.id}')">❤️ ${prompt.upvotes || 0}</button>` : ''}
                    ${authorControls}
                    ${adminControls}
                </div>
            `;
            promptContainer.appendChild(card);
        });
    }

    // TRACK VIEWS DYNAMICALLY ON CLICK FOR TRENDING ALGORITHM
    window.trackAndView = function(pId, encTitle, encText) {
        let currentViews = parseInt(localStorage.getItem(`views_${pId}`)) || 0;
        localStorage.setItem(`views_${pId}`, currentViews + 1);
        openViewModal(encTitle, encText);
    }

    // ACTIONS
    window.openViewModal = function(encTitle, encText) {
        viewModalTitle.textContent = decodeURIComponent(encTitle);
        textToCopy = decodeURIComponent(encText);
        viewModalText.textContent = textToCopy;
        viewPromptModal.style.display = 'block';
    }
    closeViewModal.addEventListener('click', () => viewPromptModal.style.display = 'none');
    window.copyPrompt = function(encText) {
        navigator.clipboard.writeText(decodeURIComponent(encText)).then(() => showCustomAlert("Prompt Copied to Clipboard! 🚀"));
    }
    copyFromViewBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showCustomAlert("Prompt Copied to Clipboard! 🚀");
            viewPromptModal.style.display = 'none';
        });
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

    closeAddModal.addEventListener('click', () => addPromptModal.style.display = 'none');

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

    window.upvotePrompt = async function(docId) {
        if (!currentUser) return showCustomAlert("Please Login to upvote!");
        try {
            await db.collection('community_prompts').doc(docId).update({ upvotes: firebase.firestore.FieldValue.increment(1) });
            fetchCommunityPrompts();
        } catch (e) { showCustomAlert(e.message); }
    }

    // INIT
    fetchOfficialPrompts();
});
