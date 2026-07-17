import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyDiG8UFMkyLvEYIN5dJSry3aQbKd5R4ovE",
  authDomain: "icesense-cdf63.firebaseapp.com",
  databaseURL: "https://icesense-cdf63-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "icesense-cdf63",
  storageBucket: "icesense-cdf63.firebasestorage.app",
  messagingSenderId: "261744517670",
  appId: "1:261744517670:web:f75c91b81a853d356c7ce7",
  measurementId: "G-1RY9R7FG58"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and export it
export const auth = getAuth(app);

// Initialize Realtime Database and Firestore exports
export const database = getDatabase(app);
export const db = getFirestore(app);
