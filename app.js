// app.js
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
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameEl = document.getElementById('user-name');
const userPhotoEl = document.getElementById('user-photo');

const newWorkspaceBtn = document.getElementById('new-workspace-btn');
const workspaceList = document.getElementById('workspace-list');
const noWorkspaceMsg = document.getElementById('no-workspace-msg');

const emptyState = document.getElementById('empty-state');
const workspaceView = document.getElementById('workspace-view');
const workspaceTitle = document.getElementById('workspace-title');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');

// Global State
let currentUser = null;
let currentWorkspaceId = null;
let unsubscribeWorkspaces = null;
let unsubscribeMessages = null;

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        setupUserEnvironment(user);
    } else {
        currentUser = null;
        showLoginScreen();
    }
});

loginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
        // Page load fade-in animation using GSAP
        gsap.fromTo(appScreen, { opacity: 0 }, { opacity: 1, duration: 1 });
    } catch (error) {
        console.error("Login failed:", error);
        alert("Failed to login. Please try again.");
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
    if (unsubscribeWorkspaces) unsubscribeWorkspaces();
    if (unsubscribeMessages) unsubscribeMessages();
});

function setupUserEnvironment(user) {
    userNameEl.textContent = user.displayName;
    userPhotoEl.src = user.photoURL;
    
    loadingScreen.classList.remove('active');
    loadingScreen.classList.add('hidden');
    loginScreen.classList.remove('active');
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    appScreen.classList.add('flex');

    loadWorkspaces();
}

function showLoginScreen() {
    loadingScreen.classList.remove('active');
    loadingScreen.classList.add('hidden');
    appScreen.classList.remove('flex');
    appScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginScreen.classList.add('active');
}

// ==========================================
// WORKSPACE LOGIC
// ==========================================

newWorkspaceBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    
    // Button hover/click animation
    gsap.fromTo(newWorkspaceBtn, { scale: 0.95 }, { scale: 1, duration: 0.2, ease: "back.out(1.7)" });

    try {
        const docRef = await addDoc(collection(db, "workspaces"), {
            userId: currentUser.uid,
            title: "New Workspace",
            createdAt: serverTimestamp()
        });
        selectWorkspace(docRef.id, "New Workspace");
    } catch (error) {
        console.error("Error creating workspace:", error);
    }
});

function loadWorkspaces() {
    if (!currentUser) return;
    const q = query(
        collection(db, "workspaces"), 
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
    );

    unsubscribeWorkspaces = onSnapshot(q, (snapshot) => {
        workspaceList.innerHTML = '';
        if (snapshot.empty) {
            noWorkspaceMsg.classList.remove('hidden');
        } else {
            noWorkspaceMsg.classList.add('hidden');
            snapshot.forEach((doc) => {
                const workspace = doc.data();
                const div = document.createElement('div');
                div.className = `workspace-item ${doc.id === currentWorkspaceId ? 'active' : ''}`;
                div.textContent = workspace.title;
                div.onclick = () => selectWorkspace(doc.id, workspace.title);
                workspaceList.appendChild(div);
            });
        }
    });
}

function selectWorkspace(id, title) {
    currentWorkspaceId = id;
    workspaceTitle.textContent = title;
    
    // Update UI
    document.querySelectorAll('.workspace-item').forEach(el => el.classList.remove('active'));
    // We rely on the snapshot to re-render and add 'active' class accurately, 
    // but doing it manually here prevents UI lag.
    
    emptyState.classList.remove('active');
    emptyState.classList.add('hidden');
    workspaceView.classList.remove('hidden');
    workspaceView.classList.add('flex');

    // Workspace switching transition
    gsap.fromTo(workspaceView, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });

    // Close sidebar on mobile after selection
    sidebar.classList.remove('open');

    loadMessages(id);
}

// Update workspace title on blur
workspaceTitle.addEventListener('blur', async () => {
    if (!currentWorkspaceId) return;
    const newTitle = workspaceTitle.textContent.trim();
    if (newTitle) {
        const workspaceRef = doc(db, "workspaces", currentWorkspaceId);
        await updateDoc(workspaceRef, { title: newTitle });
    }
});

// ==========================================
// MESSAGES/NOTES LOGIC
// ==========================================

function loadMessages(workspaceId) {
    if (unsubscribeMessages) unsubscribeMessages();

    const q = query(
        collection(db, "messages"),
        where("workspaceId", "==", workspaceId),
        orderBy("timestamp", "asc")
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            const msg = doc.data();
            const div = document.createElement('div');
            div.className = 'message';
            div.textContent = msg.text;
            messagesContainer.appendChild(div);
        });
        // Auto scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentWorkspaceId) return;

    messageInput.value = ''; // clear input immediately for better UX
    
    // Button animation
    gsap.fromTo(sendBtn, { scale: 0.9 }, { scale: 1, duration: 0.2 });

    try {
        await addDoc(collection(db, "messages"), {
            workspaceId: currentWorkspaceId,
            text: text,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

// ==========================================
// MOBILE UI LOGIC
// ==========================================

mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});
