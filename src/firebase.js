import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword as fbCreateUser,
  signInWithEmailAndPassword as fbSignIn,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential as fbReauthenticateWithCredential,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  EmailAuthProvider as fbEmailAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  collection as fbCollection,
  onSnapshot as fbOnSnapshot,
  doc as fbDoc,
  addDoc as fbAddDoc,
  setDoc as fbSetDoc,
  getDoc as fbGetDoc,
  getDocs as fbGetDocs,
  updateDoc as fbUpdateDoc,
  deleteDoc as fbDeleteDoc,
  query as fbQuery,
  where as fbWhere,
  orderBy as fbOrderBy,
  limit as fbLimit,
  writeBatch as fbWriteBatch,
  serverTimestamp as fbServerTimestamp,
} from "firebase/firestore";
import {
  getFunctions,
  httpsCallable as fbHttpsCallable,
} from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Missing required Firebase environment variables. Please check your .env.local file.");
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export const createUserWithEmailAndPassword = fbCreateUser;
export const signInWithEmailAndPassword = fbSignIn;
export const signOut = fbSignOut;
export const onAuthStateChanged = fbOnAuthStateChanged;
export const updateProfile = fbUpdateProfile;
export const updatePassword = fbUpdatePassword;
export const reauthenticateWithCredential = fbReauthenticateWithCredential;
export const sendPasswordResetEmail = fbSendPasswordResetEmail;
export const EmailAuthProvider = fbEmailAuthProvider;

export const collection = fbCollection;
export const onSnapshot = fbOnSnapshot;
export const doc = fbDoc;
export const addDoc = fbAddDoc;
export const setDoc = fbSetDoc;
export const getDoc = fbGetDoc;
export const getDocs = fbGetDocs;
export const updateDoc = fbUpdateDoc;
export const deleteDoc = fbDeleteDoc;
export const query = fbQuery;
export const where = fbWhere;
export const orderBy = fbOrderBy;
export const limit = fbLimit;
export const writeBatch = fbWriteBatch;
export const serverTimestamp = fbServerTimestamp;

export const httpsCallable = fbHttpsCallable;
