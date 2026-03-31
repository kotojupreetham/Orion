// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: window.ORION_FIREBASE_API_KEY || "AIzaSyDxPx7dhn3gEbFl54DMrd9eRlkjZ9lbqIk",
  authDomain: window.ORION_FIREBASE_AUTH_DOMAIN || "orion-52356.firebaseapp.com",
  databaseURL: window.ORION_FIREBASE_DATABASE_URL || "https://orion-52356-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: window.ORION_FIREBASE_PROJECT_ID || "orion-52356",
  storageBucket: window.ORION_FIREBASE_STORAGE_BUCKET || "orion-52356.firebasestorage.app",
  messagingSenderId: window.ORION_FIREBASE_MESSAGING_SENDER_ID || "66921521599",
  appId: window.ORION_FIREBASE_APP_ID || "1:66921521599:web:dc6bb1d31515848f0c410a",
  measurementId: window.ORION_FIREBASE_MEASUREMENT_ID || "G-TFJH37VZYC"
};

// AI integration key (separate from Firebase config)
export const aiApiKey = window.ORION_AI_KEY || "AIzaSyBot7oHonfxxcMCXXGAppNA_OmEwzIRg-Y";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Firestore
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
