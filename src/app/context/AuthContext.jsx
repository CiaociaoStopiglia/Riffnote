// src/app/context/AuthContext.jsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingUser(false);
    });
    return unsubscribe;
  }, []);

  // Cria/atualiza o documento do usuário em Firestore: users/{uid}
  async function upsertUserDoc(firebaseUser, extra = {}) {
    await setDoc(
      doc(db, 'users', firebaseUser.uid),
      {
        displayName: firebaseUser.displayName ?? extra.displayName ?? '',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL ?? null,
        updatedAt: serverTimestamp(),
        ...extra,
      },
      { merge: true }
    );
  }

  async function signUp(email, password, displayName) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    await upsertUserDoc(credential.user, { displayName, createdAt: serverTimestamp() });
    return credential.user;
  }

  async function signIn(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    await upsertUserDoc(credential.user, { createdAt: serverTimestamp() });
    return credential.user;
  }

  async function logOut() {
    await signOut(auth);
  }

  const value = { user, loadingUser, signUp, signIn, signInWithGoogle, logOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}