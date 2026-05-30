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

// Google Auth Provider
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

let isLoginMode = true;
let currentUser = null;
let allPrompts = [];

// ---- AUTHENTICATION LOGIC ---- //
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authBtn.textContent = "Logout";
        authBtn.style.color = "#ef4444";
        authBtn.style.borderColor = "#ef4444";
    } else {
        currentUser = null;
        authBtn.textContent = "Login";
        authBtn.style.color = "#38bdf8";
        authBtn.style.borderColor = "#38bdf8";
    }
});

authBtn.addEventListener('click', () => {
    if (currentUser) {
        auth.signOut();
    } else {
        authModal.style.display = 'block';
    }
});

closeModal.addEventListener('click', () => authModal.style.display = 'none');

toggleAuthMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    modalTitle.textContent = isLoginMode ? "Login" : "Create Account";
    submitAuthBtn.textContent = isLoginMode ? "Login" : "Sign Up";
    toggleAuthMode.innerHTML = isLoginMode ? "Don't have an account? <span>Sign Up</span>" : "Already have an account? <span>Login</span>";
});

// Email & Password Auth
submitAuthBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!email || !password) return alert("Please fill all fields.");

    try {
        if (isLoginMode) {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            await auth.createUserWithEmailAndPassword(email, password);
        }
        authModal.style.display = 'none';
        emailInput.value = ''; passwordInput.value = '';
    } catch (error) {
        alert(error.message);
    }
});

// Google Auth
googleAuthBtn.addEventListener('click', async () => {
    try {
        await auth.signInWithPopup(googleProvider);
        authModal.style.display = 'none';
        console.log("Google Sign-In Successful!");
    } catch (error) {
        console.error("Google Login Error: ", error);
        alert("Login failed: " + error.message);
    }
});


// ---- UI & RENDERING LOGIC ---- //

async function fetchPrompts() {
    try {
        const response = await fetch('prompts.json');
        allPrompts = await response.json();
        renderPrompts(allPrompts);
    } catch (error) {
        console.error('Error fetching prompts:', error);
    }
}

function renderPrompts(promptsToRender) {
    promptContainer.innerHTML = '';
    if(promptsToRender.length === 0) {
        promptContainer.innerHTML = '<p style="color:#94a3b8; text-align:center; margin-top:20px;">No prompts found.</p>';
        return;
    }
    promptsToRender.forEach(prompt => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.innerHTML = `
            <span class="category-badge">${prompt.category}</span>
            <h3>${prompt.title}</h3>
            <p>${prompt.description}</p>
            <button class="copy-btn" onclick="copyPrompt('${prompt.prompt_text.replace(/'/g, "\\'")}')">Copy Prompt</button>
        `;
        promptContainer.appendChild(card);
    });
}

// Copy functionality
window.copyPrompt = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        toast.className = "toast show";
        setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
    });
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allPrompts.filter(p => p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
    renderPrompts(filtered);
});

// Category filtering
document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const category = button.dataset.category;
        const filtered = category === 'All' ? allPrompts : allPrompts.filter(p => p.category === category);
        renderPrompts(filtered);
    });
});

// Tab Switching (Official vs Community)
tabOfficial.addEventListener('click', () => {
    tabOfficial.classList.add('active');
    tabCommunity.classList.remove('active');
    categoryFilter.style.display = 'flex'; // Show categories
    renderPrompts(allPrompts); 
});

tabCommunity.addEventListener('click', () => {
    tabCommunity.classList.add('active');
    tabOfficial.classList.remove('active');
    categoryFilter.style.display = 'none'; // Hide categories
    promptContainer.innerHTML = `
        <div style="text-align:center; padding: 40px 20px;">
            <h2 style="color:#38bdf8; margin-bottom: 10px;">Community Expert Prompts</h2>
            <p style="color:#94a3b8;">Loading prompts from Firebase Database... (Phase 2)</p>
        </div>
    `;
});

// Initialize
fetchPrompts();
