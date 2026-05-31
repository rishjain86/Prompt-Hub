// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDiZ_S-OPWyUaBdcYxCJLTIrROn16C_U2E",
    authDomain: "prompt-hub-app-2fe0f.firebaseapp.com",
    projectId: "prompt-hub-app-2fe0f",
    storageBucket: "prompt-hub-app-2fe0f.firebasestorage.app",
    messagingSenderId: "242493810474",
    appId: "1:242493810474:web:d51af341a15f37897b2053"
};

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
const openAddPromptBtn = document.getElementById('openAddPromptBtn');
const addPromptModal = document.getElementById('addPromptModal');
const closeAddModal = document.getElementById('closeAddModal');
const submitPromptBtn = document.getElementById('submitPromptBtn');

// Custom Alert Elements
const themeAlertModal = document.getElementById('themeAlertModal');
const themeAlertText = document.getElementById('themeAlertText');
const themeAlertOkBtn = document.getElementById('themeAlertOkBtn');

// View Modal Elements
const viewPromptModal = document.getElementById('viewPromptModal');
const closeViewModal = document.getElementById('closeViewModal');
const viewModalTitle = document.getElementById('viewModalTitle');
const viewModalText = document.getElementById('viewModalText');
const copyFromViewBtn = document.getElementById('copyFromViewBtn');

let isLoginMode = true;
let currentUser = null;
let allPrompts = [];
let currentViewText = "";

function showCustomAlert(message) {
    themeAlertText.innerHTML = message;
    themeAlertModal.style.display = 'block';
}

themeAlertOkBtn.addEventListener('click', () => themeAlertModal.style.display = 'none');

window.openViewModal = function(encTitle, encText) {
    viewModalTitle.textContent = decodeURIComponent(encTitle);
    currentViewText = decodeURIComponent(encText);
    viewModalText.textContent = currentViewText;
    viewPromptModal.style.display = 'block';
}
closeViewModal.addEventListener('click', () => viewPromptModal.style.display = 'none');

copyFromViewBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentViewText).then(() => {
        showCustomAlert("Prompt Copied to Clipboard!");
        viewPromptModal.style.display = 'none'; 
    });
});

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authBtn.textContent = "Logout";
        authBtn.style.color = "#ef4444";
        authBtn.style.borderColor = "#ef4444";
        if(tabCommunity.classList.contains('active')) openAddPromptBtn.style.display = 'block';
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
    } catch (error) { showCustomAlert(error.message); }
});

googleAuthBtn.addEventListener('click', async () => {
    try {
        await auth.signInWithPopup(googleProvider);
        authModal.style.display = 'none';
    } catch (error) { showCustomAlert(error.message); }
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

async function fetchOfficialPrompts() {
    try {
        const response = await fetch('prompts.json?t=' + new Date().getTime());
        allPrompts = await response.json();
        renderPrompts(allPrompts, false);
    } catch (e) { console.error(e); }
}

async function fetchCommunityPrompts() {
    promptContainer.innerHTML = '<p style="text-align:center;">Loading...</p>';
    try {
        const snapshot = await db.collection('community_prompts').orderBy('timestamp', 'desc').get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPrompts(data, true);
    } catch(e) { promptContainer.innerHTML = '<p>Database Error.</p>'; }
}

function renderPrompts(promptsToRender, isCommunity) {
    promptContainer.innerHTML = '';
    promptsToRender.forEach(prompt => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        const fullText = prompt.prompt_text || '';
        const preview = fullText.length > 75 ? fullText.substring(0, 75) + '...' : fullText;
        const encTitle = encodeURIComponent(prompt.title);
        const encText = encodeURIComponent(fullText);

        card.innerHTML = `
            <span class="category-badge">${prompt.category}</span>
            <h3>${prompt.title}</h3>
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

window.copyPrompt = function(encText) {
    navigator.clipboard.writeText(decodeURIComponent(encText)).then(() => showCustomAlert("Prompt Copied!"));
}

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
    if(currentUser) openAddPromptBtn.style.display = 'block';
    fetchCommunityPrompts();
});

fetchOfficialPrompts();
