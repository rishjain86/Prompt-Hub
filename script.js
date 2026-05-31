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

// Essential elements
const promptContainer = document.getElementById('promptContainer');
const themeAlertModal = document.getElementById('themeAlertModal');
const themeAlertText = document.getElementById('themeAlertText');
const themeAlertOkBtn = document.getElementById('themeAlertOkBtn');

function showCustomAlert(msg) {
    themeAlertText.textContent = msg;
    themeAlertModal.style.display = 'block';
}
themeAlertOkBtn.onclick = () => themeAlertModal.style.display = 'none';

async function fetchOfficialPrompts() {
    try {
        const response = await fetch('prompts.json?t=' + Date.now());
        if (!response.ok) throw new Error("JSON not found");
        const data = await response.json();
        renderPrompts(data, false);
    } catch (e) {
        promptContainer.innerHTML = "<p style='text-align:center;'>Error loading prompts.</p>";
    }
}

function renderPrompts(data, isCommunity) {
    promptContainer.innerHTML = '';
    data.forEach(p => {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.innerHTML = `<h3>${p.title}</h3><p>${p.description}</p>
        <button class="view-btn" onclick="alert('Working')">View</button>`;
        promptContainer.appendChild(card);
    });
}

// Global Event Listeners
document.getElementById('authBtn').onclick = () => document.getElementById('authModal').style.display = 'block';
document.getElementById('closeModal').onclick = () => document.getElementById('authModal').style.display = 'none';
document.getElementById('tabOfficial').onclick = fetchOfficialPrompts;

// Init
fetchOfficialPrompts();
