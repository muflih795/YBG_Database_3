// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCuHYF5Co4EXbBjYuRsKsdDMBFyTqSmkHw",
  authDomain: "ybg-store.firebaseapp.com",
  projectId: "ybg-store",
  storageBucket: "ybg-store.firebasestorage.app",
  messagingSenderId: "497069026383",
  appId: "1:497069026383:web:a272ae8ca434261bff4e3a",
  measurementId: "G-QVWWT3PKJJ"
};

export function getFirebaseAuth() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getAuth();
}

export function buildRecaptchaVerifier(containerId = "recaptcha-container") {
  const auth = getFirebaseAuth();
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
  return window.recaptchaVerifier;
}

export async function sendOtp(phoneE164) {
  const auth = getFirebaseAuth();
  const verifier = buildRecaptchaVerifier();
  const confirmation = await signInWithPhoneNumber(auth, phoneE164, verifier);
  window.confirmationResult = confirmation;
  return true;
}

export async function verifyOtp(code) {
  const confirmation = window.confirmationResult;
  if (!confirmation) throw new Error("OTP belum dikirim.");
  const cred = await confirmation.confirm(code);
  await signOut(getFirebaseAuth());
  return cred.user;
}