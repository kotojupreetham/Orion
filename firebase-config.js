// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDxPx7dhn3gEbFl54DMrd9eRlkjZ9lbqIk",
  authDomain: "orion-52356.firebaseapp.com",
  databaseURL: "https://orion-52356-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "orion-52356",
  storageBucket: "orion-52356.firebasestorage.app",
  messagingSenderId: "66921521599",
  appId: "1:66921521599:web:dc6bb1d31515848f0c410a",
  measurementId: "G-TFJH37VZYC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Firestore
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
