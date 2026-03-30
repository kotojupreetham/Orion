// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB67c13kcF0O1YoW7WvOzqfYmHetVJhdHs",
  authDomain: "todo-5496c.firebaseapp.com",
  databaseURL: "https://todo-5496c-default-rtdb.firebaseio.com",
  projectId: "todo-5496c",
  storageBucket: "todo-5496c.firebasestorage.app",
  messagingSenderId: "725814199088",
  appId: "1:725814199088:web:d189d46b5f5054b2f33ef5",
  measurementId: "G-5DKXVMX9S3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Firestore
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
