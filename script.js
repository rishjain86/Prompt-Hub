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

    const themeAlertModal = document.getElementById('themeAlertModal');
    const themeAlertText = document.getElementById('themeAlertText');
    const themeAlertOkBtn = document.getElementById('themeAlertOkBtn');

    const viewPromptModal = document.getElementById('viewPromptModal');
    const closeViewModal = document.getElementById('closeViewModal');
    const viewModalTitle = document.getElementById('viewModalTitle');
    const viewModalText = document.getElementById('viewModalText');
    const copyFromViewBtn = document.getElementById('copyFromViewBtn');

    // GLOBALS
    let isLoginMode = true;
    let currentUser = null;
    let allOfficialPrompts = [];
    let allCommunityPrompts = [];
    let currentTab = 'official'; 
    let currentCategory = 'All';
    let currentSearch = '';
    let textToCopy = '';

    // UTILS
    function showCustomAlert(message) {
        themeAlertText.innerHTML = message;
        themeAlertModal.style.display = 'block';
    }
    themeAlertOkBtn.addEventListener('click', () => themeAlertModal.style.display = 'none');
    welcomeOkBtn.addEventListener('click', () => welcomeModal.style.display = 'none');

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
            
            // Remove active from quick filters, and set 'All' as visual default if not present
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
            authBtn.textContent = "Logout";
            authBtn.style.color = "#ef4444";
            authBtn.style.borderColor = "#ef4444";
            if (currentTab === 'community') openAddPromptBtn.style.display = 'block';

            // Welcome Logic
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
                if (diffHours >= 48) { // > 2 days
                    welcomeTitle.textContent = "Welcome Back! ✨";
                    welcomeMessage.textContent = `Great to see you again, ${userName}. Check out what's trending today!`;
                    welcomeModal.style.display = 'block';
                }
            }
            localStorage.setItem(`lastLogin_${uid}`, now);

        } else {
            currentUser = null;
            authBtn.textContent = "Login";
            authBtn.style.color = "#38bdf8";
            authBtn.style.borderColor = "#38bdf8";
            openAddPromptBtn.style.display = 'none';
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
        if (!email) {
            return showCustomAlert("Please enter your email address in the input field above first.");
        }
        try {
            await auth.sendPasswordResetEmail(email);
            showCustomAlert("Password reset link has been sent to your email!");
            authModal.style.display = 'none';
        } catch (error) {
            showCustomAlert(error.message);
        }
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

    // FILTER & SEARCH
    function filterAndRender() {
        let dataset = currentTab === 'official' ? allOfficialPrompts : allCommunityPrompts;
        
        if (currentCategory === 'Trending') {
            // Pick exactly 5 prompts for trending
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

    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        filterAndRender();
    });

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

            card.innerHTML = `
                <span class="category-badge">${prompt.category || 'General'}</span>
                <h3>${prompt.title || 'Untitled'}</h3>
                <p class="preview-text">"${preview}"</p>
                <div class="action-row">
                    <button class="view-btn" onclick="openViewModal('${encTitle}', '${encText}')">View</button>
                    <button class="copy-card-btn" onclick="copyPrompt('${encText}')">Copy</button>
                    ${isCommunity ? `<button class="upvote-btn" onclick="upvotePrompt('${prompt.id}')">❤️ ${prompt.upvotes || 0}</button>` : ''}
                </div>
            `;
            promptContainer.appendChild(card);
        });
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

    openAddPromptBtn.addEventListener('click', () => addPromptModal.style.display = 'block');
    closeAddModal.addEventListener('click', () => addPromptModal.style.display = 'none');

    submitPromptBtn.addEventListener('click', async () => {
        const title = document.getElementById('promptTitle').value.trim();
        const category = document.getElementById('promptCategory').value;
        const desc = document.getElementById('promptDesc').value.trim();
        const text = document.getElementById('promptText').value.trim();
        if(!title || !category || !desc || !text) return showCustomAlert('Please fill all fields!');
        submitPromptBtn.disabled = true;
        try {
            await db.collection('community_prompts').add({
                title, category, description: desc, prompt_text: text,
                authorEmail: currentUser.email, upvotes: 0,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            showCustomAlert('Published Successfully! 🚀');
            addPromptModal.style.display = 'none';
            document.getElementById('promptTitle').value = '';
            document.getElementById('promptDesc').value = '';
            document.getElementById('promptText').value = '';
            fetchCommunityPrompts();
        } catch(err) { showCustomAlert(err.message); }
        submitPromptBtn.disabled = false;
    });

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
