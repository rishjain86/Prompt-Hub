// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDiZ_S-OPWyUaBdcYxCJLTIrROn16C_U2E",
    authDomain: "prompt-hub-app-2fe0f.firebaseapp.com",
    projectId: "prompt-hub-app-2fe0f",
    storageBucket: "prompt-hub-app-2fe0f.firebasestorage.app",
    messagingSenderId: "242493810474",
    appId: "1:242493810474:web:d51af341a15f37897b2053"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// DOM Elements
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const closeModal = document.getElementById('closeModal');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const submitAuthBtn = document.getElementById('submitAuthBtn');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const modalTitle = document.getElementById('modalTitle');
const googleAuthBtn = document.getElementById('googleAuthBtn');

const tabOfficial = document.getElementById('tabOfficial');
const tabCommunity = document.getElementById('tabCommunity');
const categoryFilter = document.getElementById('categoryFilter');
const promptContainer = document.getElementById('promptContainer');
const searchInput = document.getElementById('searchInput');

// Add Prompt Elements
const openAddPromptBtn = document.getElementById('openAddPromptBtn');
const addPromptModal = document.getElementById('addPromptModal');
const closeAddModal = document.getElementById('closeAddModal');
const submitPromptBtn = document.getElementById('submitPromptBtn');

// --- DYNAMIC CUSTOM ALERT INJECTION (No index.html edit needed) --- //
document.body.insertAdjacentHTML('beforeend', `
    <div id="themeAlertModal" class="modal" style="z-index: 9999;">
        <div class="modal-content" style="margin: 40% auto; padding: 25px; border-top: 4px solid #38bdf8;">
            <h3 style="color: #38bdf8; margin-bottom: 15px;">Message</h3>
            <p id="themeAlertText" style="color: #f8fafc; margin-bottom: 25px; font-size: 1rem; line-height: 1.5;"></p>
            <button id="themeAlertOkBtn" class="primary-btn" style="background: #1e293b; border: 1px solid #38bdf8; color: #38bdf8;">OK</button>
        </div>
    </div>
`);

const themeAlertModal = document.getElementById('themeAlertModal');
const themeAlertText = document.getElementById('themeAlertText');
const themeAlertOkBtn = document.getElementById('themeAlertOkBtn');

function showCustomAlert(message) {
    themeAlertText.innerHTML = message;
    themeAlertModal.style.display = 'block';
}

themeAlertOkBtn.addEventListener('click', () => {
    themeAlertModal.style.display = 'none';
});
// ---------------------------------------------------------------- //

let isLoginMode = true;
let currentUser = null;
let allPrompts = [];

// ---- 1. AUTHENTICATION LOGIC ---- //
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authBtn.textContent = "Logout";
        authBtn.style.color = "#ef4444";
        authBtn.style.borderColor = "#ef4444";
        
        if(tabCommunity.classList.contains('active')) {
            openAddPromptBtn.style.display = 'block';
        }
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

    try {
        if (isLoginMode) await auth.signInWithEmailAndPassword(email, password);
        else await auth.createUserWithEmailAndPassword(email, password);
        authModal.style.display = 'none';
        emailInput.value = ''; passwordInput.value = '';
    } catch (error) { showCustomAlert(error.message); }
});

googleAuthBtn.addEventListener('click', async () => {
    try {
        await auth.signInWithPopup(googleProvider);
        authModal.style.display = 'none';
    } catch (error) { showCustomAlert("Login failed: " + error.message); }
});

// ---- 2. ADD COMMUNITY PROMPT LOGIC ---- //
openAddPromptBtn.addEventListener('click', () => addPromptModal.style.display = 'block');
closeAddModal.addEventListener('click', () => addPromptModal.style.display = 'none');

submitPromptBtn.addEventListener('click', async () => {
    const title = document.getElementById('promptTitle').value.trim();
    const category = document.getElementById('promptCategory').value;
    const desc = document.getElementById('promptDesc').value.trim();
    const text = document.getElementById('promptText').value.trim();

    if(!title || !category || !desc || !text) return showCustomAlert('Please fill all fields!');

    submitPromptBtn.textContent = 'Publishing...';
    submitPromptBtn.disabled = true;

    try {
        await db.collection('community_prompts').add({
            title: title,
            category: category,
            description: desc,
            prompt_text: text,
            authorEmail: currentUser.email,
            authorId: currentUser.uid,
            upvotes: 0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showCustomAlert('Expert Prompt Published Successfully! 🚀');
        addPromptModal.style.display = 'none';
        
        document.getElementById('promptTitle').value = '';
        document.getElementById('promptCategory').value = '';
        document.getElementById('promptDesc').value = '';
        document.getElementById('promptText').value = '';

        fetchCommunityPrompts(); 
    } catch(err) {
        showCustomAlert('Database Error: ' + err.message);
    }
    
    submitPromptBtn.textContent = 'Publish Prompt';
    submitPromptBtn.disabled = false;
});

// ---- 3. FETCH & RENDER LOGIC ---- //
async function fetchOfficialPrompts() {
    try {
        const response = await fetch('prompts.json');
        allPrompts = await response.json();
        renderPrompts(allPrompts, false);
    } catch (error) { console.error('Error fetching JSON:', error); }
}

async function fetchCommunityPrompts() {
    promptContainer.innerHTML = '<p style="color:#94a3b8; text-align:center; margin-top:20px;">Loading expert prompts...</p>';
    try {
        const snapshot = await db.collection('community_prompts').orderBy('timestamp', 'desc').get();
        if(snapshot.empty) {
            promptContainer.innerHTML = '<p style="color:#94a3b8; text-align:center; margin-top:20px;">No expert prompts yet. Login to be the first! 🔥</p>';
            return;
        }
        
        const communityPromptsArray = [];
        snapshot.forEach(doc => communityPromptsArray.push({ id: doc.id, ...doc.data() }));
        renderPrompts(communityPromptsArray, true);
    } catch(error) {
        promptContainer.innerHTML = '<p style="color:#ef4444; text-align:center; margin-top:20px;">Failed to connect to Database.</p>';
    }
}

function renderPrompts(promptsToRender, isCommunity) {
    promptContainer.innerHTML = '';
    if(promptsToRender.length === 0) return;

    promptsToRender.forEach(prompt => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        
        let authorBadge = '';
        if(isCommunity) {
            const authorName = prompt.authorEmail ? prompt.authorEmail.split('@')[0] : 'Expert';
            authorBadge = `<span style="color:#94a3b8; font-size:0.8rem; font-weight:bold;">@${authorName}</span>`;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="category-badge">${prompt.category}</span>
                ${authorBadge}
            </div>
            <h3>${prompt.title}</h3>
            <p>${prompt.description}</p>
            <div style="display:flex; gap:10px;">
                <button class="copy-btn" onclick="copyPrompt('${encodeURIComponent(prompt.prompt_text)}')">Copy</button>
                ${isCommunity ? `<button class="auth-btn" style="width:auto; pointer-events:none;">❤️ ${prompt.upvotes || 0}</button>` : ''}
            </div>
        `;
        promptContainer.appendChild(card);
    });
}

window.copyPrompt = function(encodedText) {
    const decodedText = decodeURIComponent(encodedText);
    navigator.clipboard.writeText(decodedText).then(() => {
        const toast = document.getElementById('toast');
        toast.className = "toast show";
        setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
    });
}

searchInput.addEventListener('input', (e) => {
    if(tabCommunity.classList.contains('active')) return; 
    const query = e.target.value.toLowerCase();
    const filtered = allPrompts.filter(p => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
    renderPrompts(filtered, false);
});

document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const category = button.dataset.category;
        const filtered = category === 'All' ? allPrompts : allPrompts.filter(p => p.category === category);
        renderPrompts(filtered, false);
    });
});

tabOfficial.addEventListener('click', () => {
    tabOfficial.classList.add('active');
    tabCommunity.classList.remove('active');
    categoryFilter.style.display = 'flex';
    openAddPromptBtn.style.display = 'none';
    renderPrompts(allPrompts, false); 
});

tabCommunity.addEventListener('click', () => {
    tabCommunity.classList.add('active');
    tabOfficial.classList.remove('active');
    categoryFilter.style.display = 'none';
    
    if (currentUser) openAddPromptBtn.style.display = 'block';
    else openAddPromptBtn.style.display = 'none';

    fetchCommunityPrompts();
});

fetchOfficialPrompts();
