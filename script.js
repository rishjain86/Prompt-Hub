// --- Capacitor AdMob Plugin ---
let AdMob = null;
if (window.Capacitor) {
    AdMob = window.Capacitor.Plugins.AdMob;
}

// --- 1. Global State & DOM Elements ---
let prompts = [];
let activeCategory = "All";
let searchQuery = "";
let copyClickCounter = 0;

const container = document.getElementById("promptContainer");
const searchInput = document.getElementById("searchInput");
const filterBtns = document.querySelectorAll(".filter-btn");
const toast = document.getElementById("toast");

// --- 2. Data Initialization (Fetch JSON) ---
async function loadPrompts() {
    try {
        // Fetching local JSON. Baad mein isko live URL se replace kar sakte ho.
        const response = await fetch('./prompts.json'); 
        if (!response.ok) throw new Error("Network response was not ok");
        
        prompts = await response.json();
        renderPrompts();
    } catch (error) {
        console.error("Failed to load prompts:", error);
        container.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Error loading prompts. Please check your connection.</p>`;
    }
}

// --- 3. UI Rendering & Filtering ---
function renderPrompts() {
    container.innerHTML = "";
    
    const filteredPrompts = prompts.filter(p => {
        const matchesCategory = activeCategory === "All" || p.category === activeCategory;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (filteredPrompts.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:var(--text-muted);">No prompts found.</p>`;
        return;
    }

    filteredPrompts.forEach(p => {
        const card = document.createElement("div");
        card.className = "prompt-card";
        card.innerHTML = `
            <div class="card-header">
                <span class="badge">${p.category}</span>
            </div>
            <div class="title">${p.title}</div>
            <div class="description">${p.description}</div>
            <button class="copy-btn" onclick="executeCopyAction('${p.id}')">Copy Prompt</button>
        `;
        container.appendChild(card);
    });
}

// --- 4. Event Listeners ---
if(searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderPrompts();
    });
}

filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
        filterBtns.forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        activeCategory = e.target.dataset.category;
        renderPrompts();
    });
});

// --- 5. Clipboard Action & Toast ---
async function executeCopyAction(id) {
    const promptObj = prompts.find(p => p.id === id);
    if (!promptObj) return;

    try {
        await navigator.clipboard.writeText(promptObj.prompt_text);
        showToast();
        incrementClickCounter();
    } catch (err) {
        console.error("Failed to copy text: ", err);
    }
}

function showToast() {
    if(toast) {
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 2000);
    }
}

// --- 6. Monetization Waterfall (AdMob -> InMobi Fallback) ---
async function initializeAds() {
    if (!AdMob) return;
    try {
        await AdMob.initialize({
            requestTrackingAuthorization: true,
            initializeForTesting: true
        });
        
        await AdMob.showBanner({
            adId: 'ca-app-pub-3940256099942544/6300978111', 
            position: 'BOTTOM_CENTER',
            margin: 0,
            isTesting: true
        });
    } catch (error) {
        console.error("AdMob Init Failed:", error);
    }
}

function incrementClickCounter() {
    copyClickCounter++;
    if (copyClickCounter % 3 === 0) {
        showHybridInterstitial();
    }
}

async function showHybridInterstitial() {
    console.log("Triggering Hybrid Interstitial Waterfall...");
    let adMobSuccess = false;

    if (AdMob) {
        try {
            await AdMob.prepareInterstitial({ adId: 'ca-app-pub-3940256099942544/1033173712', isTesting: true });
            await AdMob.showInterstitial();
            adMobSuccess = true;
            console.log("AdMob Interstitial Displayed Successfully.");
        } catch (error) {
            console.error("AdMob Interstitial Failed to load. Triggering Waterfall Fallback.", error);
            adMobSuccess = false;
        }
    }

    if (!adMobSuccess) {
        triggerInMobiSimulation();
    }
}

function triggerInMobiSimulation() {
    console.log("[INMOBI SDK SIMULATION]: Requesting Interstitial...");
    setTimeout(() => {
        console.log("[INMOBI SDK SIMULATION]: Ad Loaded and Displayed.");
    }, 500);
}

// Initialize App Data & Ads
document.addEventListener("DOMContentLoaded", () => {
    loadPrompts();
    initializeAds();
});
