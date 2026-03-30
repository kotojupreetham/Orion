// app.js — NyxTutor Dashboard
import { auth, provider, db } from "./firebase-config.js";
import {
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc,
    deleteDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================================
// DOM References
// ============================================================
const loadingScreen     = document.getElementById('loading-screen');
const loginScreen       = document.getElementById('login-screen');
const appScreen         = document.getElementById('app-screen');
const loginBtn          = document.getElementById('login-btn');
const logoutBtn         = document.getElementById('logout-btn');

const toolbarUserPhoto  = document.getElementById('toolbar-user-photo');
const toolbarLevelBadge = document.getElementById('toolbar-level-badge');
const statusUserName    = document.getElementById('status-user-name');
const statusLevel       = document.getElementById('status-level');

const newWorkspaceBtn   = document.getElementById('new-workspace-btn');
const emptyNewBtn       = document.getElementById('empty-new-btn');
const workspaceList     = document.getElementById('workspace-list');
const noWorkspaceMsg    = document.getElementById('no-workspace-msg');
const workspaceSearch   = document.getElementById('workspace-search');

const emptyState        = document.getElementById('empty-state');
const workspaceView     = document.getElementById('workspace-view');
const workspaceTitle    = document.getElementById('workspace-title');
const workspaceTabTitle = document.getElementById('workspace-tab-title');
const workspaceLevelPill= document.getElementById('workspace-level-pill');
const breadcrumb        = document.getElementById('active-workspace-breadcrumb');

const messagesContainer = document.getElementById('messages-container');
const messageInput      = document.getElementById('message-input');
const sendBtn           = document.getElementById('send-btn');
const statusWorkspace   = document.getElementById('status-workspace');
const statusMsgCount    = document.getElementById('status-msg-count');

// Right panel
const rightPanelEmpty   = document.getElementById('right-panel-empty');
const rightPanelContent = document.getElementById('right-panel-content');
const rpLevelIcon       = document.getElementById('rp-level-icon');
const rpLevelName       = document.getElementById('rp-level-name');
const rpLevelSub        = document.getElementById('rp-level-sub');
const rpScoreFill       = document.getElementById('rp-score-fill');
const rpScoreText       = document.getElementById('rp-score-text');
const rpCreatedAt       = document.getElementById('rp-created-at');
const rpMsgCount        = document.getElementById('rp-msg-count');
const rpSimDesc         = document.getElementById('rp-sim-desc');

// Onboarding modal
const onboardingOverlay  = document.getElementById('onboarding-overlay');
const onboardingIframe   = document.getElementById('onboarding-iframe');
const closeOnboardingBtn = document.getElementById('close-onboarding-btn');

// Sidebar tabs
const sidebarTabs        = document.querySelectorAll('.sidebar-tab');
const panelExplorer      = document.getElementById('panel-explorer');
const panelSearch        = document.getElementById('panel-search');

// ============================================================
// State
// ============================================================
let currentUser          = null;
let currentWorkspaceId   = null;
let currentWorkspaceData = null;
let unsubscribeWorkspaces= null;
let unsubscribeMessages  = null;
let allWorkspaces        = [];
let currentMsgCount      = 0;

// ============================================================
// Level metadata
// ============================================================
const levelMeta = {
    'Explorer':  { icon: '🌱', sub: 'Foundational projects',   badge: 'explorer',  color: '#10a37f', simDesc: 'Your simulations focus on foundational community projects — building intuition and basic planning skills.' },
    'Learner':   { icon: '📖', sub: 'Theory meets practice',   badge: 'learner',   color: '#d4b44a', simDesc: 'Your simulations challenge you to translate theoretical knowledge into structured social initiatives.' },
    'Builder':   { icon: '🔨', sub: 'Scaling operations',      badge: 'builder',   color: '#e8784d', simDesc: 'Your simulations present multi-stakeholder challenges, resource constraints, and scaling operations.' },
    'Catalyst':  { icon: '🚀', sub: 'Large-scale systemic work',badge: 'catalyst',  color: '#3574f0', simDesc: 'Maximum difficulty — you face systemic change, national-scale operations, and complex crisis decisions.' }
};

// ============================================================
// AUTH
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                // First time user — show onboarding modal
                showApp(user);
                setTimeout(() => openOnboardingModal(), 400);
            } else {
                const data = userDoc.data();
                showApp(user, data.level);
            }
        } catch (e) {
            console.error("Error reading user doc:", e);
            showApp(user); // Fallback
        }
    } else {
        currentUser = null;
        showLogin();
    }
});

loginBtn.addEventListener('click', async () => {
    try {
        loginBtn.textContent = 'Signing in...';
        loginBtn.disabled = true;
        await signInWithPopup(auth, provider);
    } catch (err) {
        console.error("Login error:", err);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign in with Google';
    }
});

logoutBtn.addEventListener('click', async () => {
    if (unsubscribeWorkspaces) unsubscribeWorkspaces();
    if (unsubscribeMessages)  unsubscribeMessages();
    await signOut(auth);
});

function showLogin() {
    loadingScreen.classList.remove('active');
    loadingScreen.classList.add('hidden');
    appScreen.classList.remove('active');
    appScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginScreen.classList.add('active');
    gsap.fromTo('.login-container', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
}

function showApp(user, level) {
    loadingScreen.classList.remove('active');
    loadingScreen.classList.add('hidden');
    loginScreen.classList.remove('active');
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    appScreen.classList.add('active');

    // Set toolbar/status user info
    toolbarUserPhoto.src = user.photoURL || '';
    statusUserName.textContent = user.displayName || user.email;

    if (level && levelMeta[level]) {
        const meta = levelMeta[level];
        toolbarLevelBadge.textContent = `${meta.icon} ${level}`;
        toolbarLevelBadge.classList.remove('hidden');
        statusLevel.textContent = `${meta.icon} ${level}`;
    } else {
        statusLevel.textContent = 'Onboarding not complete';
    }

    gsap.fromTo(appScreen, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    loadWorkspaces();
}

// ============================================================
// ONBOARDING MODAL
// ============================================================
function openOnboardingModal() {
    onboardingIframe.src = 'onboarding.html';
    onboardingOverlay.classList.remove('hidden');
    onboardingOverlay.classList.add('active');
    gsap.fromTo('.onboarding-modal-inner', { opacity: 0, scale: 0.95, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" });
}

function closeOnboardingModal() {
    gsap.to('.onboarding-modal-inner', {
        opacity: 0, scale: 0.95, y: 10, duration: 0.25,
        onComplete: () => {
            onboardingOverlay.classList.remove('active');
            onboardingOverlay.classList.add('hidden');
            onboardingIframe.src = '';
        }
    });
}

closeOnboardingBtn.addEventListener('click', closeOnboardingModal);

// Listen for message from onboarding iframe when complete
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'ONBOARDING_COMPLETE') {
        const { level, score, workspaceTitle: title } = event.data;
        closeOnboardingModal();
        // Refresh level badge in toolbar
        if (level && levelMeta[level]) {
            const meta = levelMeta[level];
            toolbarLevelBadge.textContent = `${meta.icon} ${level}`;
            toolbarLevelBadge.classList.remove('hidden');
            statusLevel.textContent = `${meta.icon} ${level}`;
        }
        // Create workspace with classification
        await createWorkspaceWithLevel(title || 'New Workspace', level, score);
    }
});

async function createWorkspaceWithLevel(title, level, score) {
    if (!currentUser) return;
    try {
        const docRef = await addDoc(collection(db, "workspaces"), {
            userId: currentUser.uid,
            title: title,
            level: level || null,
            score: score || 0,
            createdAt: serverTimestamp()
        });
        selectWorkspace(docRef.id, title, { level, score });
    } catch (err) {
        console.error("Error creating workspace:", err);
    }
}

// ============================================================
// NEW WORKSPACE / CONVERSATION
// ============================================================
newWorkspaceBtn.addEventListener('click', () => openOnboardingModal());
emptyNewBtn.addEventListener('click', () => openOnboardingModal());

// ============================================================
// WORKSPACE LIST
// ============================================================
function loadWorkspaces() {
    if (!currentUser) return;
    const q = query(
        collection(db, "workspaces"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
    );

    unsubscribeWorkspaces = onSnapshot(q, (snapshot) => {
        allWorkspaces = [];
        snapshot.forEach(d => allWorkspaces.push({ id: d.id, ...d.data() }));
        renderWorkspaceList(allWorkspaces);
    });
}

function renderWorkspaceList(workspaces) {
    workspaceList.innerHTML = '';
    if (workspaces.length === 0) {
        noWorkspaceMsg.classList.remove('hidden');
        return;
    }
    noWorkspaceMsg.classList.add('hidden');
    workspaces.forEach(ws => {
        const level  = ws.level || null;
        const meta   = level ? levelMeta[level] : null;
        const badge  = level ? `badge-${level.toLowerCase()}` : 'badge-default';
        const icon   = meta ? meta.icon : '📄';

        const div    = document.createElement('div');
        div.className = `workspace-item${ws.id === currentWorkspaceId ? ' active' : ''}`;

        div.innerHTML = `
          <div class="workspace-item-icon">${icon}</div>
          <div class="workspace-item-content" title="${ws.title}">${ws.title}</div>
          ${level ? `<span class="workspace-item-badge ${badge}">${level}</span>` : ''}
          <button class="delete-workspace-btn" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        `;

        div.querySelector('.workspace-item-content').onclick = () => selectWorkspace(ws.id, ws.title, ws);
        div.querySelector('.workspace-item-icon').onclick    = () => selectWorkspace(ws.id, ws.title, ws);
        div.querySelector('.delete-workspace-btn').onclick   = async (e) => {
            e.stopPropagation();
            if (confirm(`Delete "${ws.title}"?`)) {
                if (currentWorkspaceId === ws.id) resetEditorToEmpty();
                await deleteDoc(doc(db, "workspaces", ws.id));
            }
        };

        workspaceList.appendChild(div);
    });
}

// Sidebar tab logic
sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        sidebarTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panelExplorer.classList.add('hidden');
        panelSearch.classList.add('hidden');
        if (tab.dataset.tab === 'explorer') panelExplorer.classList.remove('hidden');
        if (tab.dataset.tab === 'search')   panelSearch.classList.remove('hidden');
    });
});

// Workspace search
workspaceSearch && workspaceSearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderWorkspaceList(allWorkspaces.filter(ws => ws.title.toLowerCase().includes(q)));
});

// ============================================================
// SELECT WORKSPACE
// ============================================================
function selectWorkspace(id, title, data = {}) {
    currentWorkspaceId   = id;
    currentWorkspaceData = { id, title, ...data };

    // Update sidebar active state
    document.querySelectorAll('.workspace-item').forEach(el => el.classList.remove('active'));
    const match = [...document.querySelectorAll('.workspace-item')].find(el => el.querySelector('.workspace-item-content')?.title === title);
    if (match) match.classList.add('active');

    // Breadcrumb + tab
    breadcrumb.textContent     = title;
    workspaceTabTitle.textContent = title.replace(/\s+/g, '_').toLowerCase() + '.nyx';

    // Workspace title + level pill
    workspaceTitle.textContent = title;
    const level = data.level || null;
    if (level && levelMeta[level]) {
        const meta = levelMeta[level];
        workspaceLevelPill.textContent = `${meta.icon} ${level}`;
        workspaceLevelPill.className   = `level-pill ${level.toLowerCase()}`;
        workspaceLevelPill.classList.remove('hidden');
    } else {
        workspaceLevelPill.classList.add('hidden');
    }

    // Show editor
    emptyState.classList.remove('active');
    emptyState.classList.add('hidden');
    workspaceView.classList.remove('hidden');
    workspaceView.classList.add('flex');

    gsap.fromTo(workspaceView, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });

    // Populate right panel
    populateRightPanel(data);

    // Status bar
    statusWorkspace.textContent = title;

    loadMessages(id);
}

function resetEditorToEmpty() {
    currentWorkspaceId   = null;
    currentWorkspaceData = null;
    breadcrumb.textContent = 'Select a workspace';
    statusWorkspace.textContent = 'No workspace open';
    statusMsgCount.textContent  = '0 notes';
    workspaceView.classList.remove('flex');
    workspaceView.classList.add('hidden');
    emptyState.classList.remove('hidden');
    emptyState.classList.add('active');
    rightPanelEmpty.classList.remove('hidden');
    rightPanelContent.classList.add('hidden');
    if (unsubscribeMessages) unsubscribeMessages();
}

// ============================================================
// RIGHT PANEL
// ============================================================
function populateRightPanel(data) {
    const level = data.level || null;
    const score = data.score || 0;
    const meta  = level ? levelMeta[level] : null;

    if (meta) {
        rpLevelIcon.textContent = meta.icon;
        rpLevelName.textContent = level;
        rpLevelSub.textContent  = meta.sub;
        rpSimDesc.textContent   = meta.simDesc;
        rpScoreFill.style.width = `${Math.min((score / 7) * 100, 100)}%`;
        rpScoreText.textContent = `${score} / 7`;
    } else {
        rpLevelIcon.textContent = '📄';
        rpLevelName.textContent = 'Unclassified';
        rpLevelSub.textContent  = 'No onboarding data';
        rpSimDesc.textContent   = 'This workspace was created without going through onboarding.';
        rpScoreFill.style.width = '0%';
        rpScoreText.textContent = '— / 7';
    }

    if (data.createdAt) {
        const ts = data.createdAt.toDate ? data.createdAt.toDate() : new Date();
        rpCreatedAt.textContent = ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } else {
        rpCreatedAt.textContent = 'Just now';
    }

    rightPanelEmpty.classList.add('hidden');
    rightPanelContent.classList.remove('hidden');
    gsap.fromTo(rightPanelContent, { opacity: 0 }, { opacity: 1, duration: 0.4 });
}

// ============================================================
// WORKSPACE TITLE AUTO-SAVE
// ============================================================
workspaceTitle.addEventListener('blur', async () => {
    if (!currentWorkspaceId) return;
    const newTitle = workspaceTitle.textContent.trim() || 'Untitled';
    workspaceTitle.textContent = newTitle;
    await updateDoc(doc(db, "workspaces", currentWorkspaceId), { title: newTitle });
    breadcrumb.textContent = newTitle;
    statusWorkspace.textContent = newTitle;
});

workspaceTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); workspaceTitle.blur(); }
});

// ============================================================
// MESSAGES
// ============================================================
function loadMessages(workspaceId) {
    if (unsubscribeMessages) unsubscribeMessages();
    messagesContainer.innerHTML = '';

    const q = query(
        collection(db, "messages"),
        where("workspaceId", "==", workspaceId),
        orderBy("timestamp", "asc")
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        currentMsgCount = snapshot.size;
        messagesContainer.innerHTML = '';
        snapshot.forEach((d, i) => {
            const msg = d.data();
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = `
              <span class="message-prefix">${String(i + 1).padStart(2, '0')}</span>
              <span class="message-text">${escapeHTML(msg.text)}</span>
            `;
            messagesContainer.appendChild(div);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        statusMsgCount.textContent = `${currentMsgCount} note${currentMsgCount !== 1 ? 's' : ''}`;
        rpMsgCount.textContent     = `${currentMsgCount} note${currentMsgCount !== 1 ? 's' : ''}`;
    });
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// Auto-resize textarea
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
});

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentWorkspaceId) return;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    gsap.fromTo(sendBtn, { scale: 0.85 }, { scale: 1, duration: 0.25, ease: "back.out(2)" });
    try {
        await addDoc(collection(db, "messages"), {
            workspaceId: currentWorkspaceId,
            text,
            timestamp: serverTimestamp()
        });
    } catch (err) {
        console.error("Send error:", err);
    }
}

// ============================================================
// HELPERS
// ============================================================
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
