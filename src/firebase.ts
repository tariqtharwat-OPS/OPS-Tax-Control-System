import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "ops-tax-crtl-sys-1792692677",
  appId: "1:446431663009:web:2490babc7e262c5a9ef1e0",
  storageBucket: "ops-tax-crtl-sys-1792692677.firebasestorage.app",
  apiKey: "AIzaSyDEZSsfkF1Tvlpqa-BmBsm-qYckh_V4Q1o",
  authDomain: "ops-tax-crtl-sys-1792692677.firebaseapp.com",
  messagingSenderId: "446431663009",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
