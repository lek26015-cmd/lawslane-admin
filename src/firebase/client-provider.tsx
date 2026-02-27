
'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';


interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    const auth = firebaseServices.auth;
    if (!auth) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => { // Auth state determined
        if (firebaseUser) {
          // Check if server-side session is missing (SSO sync Client -> Server)
          const hasSessionHint = typeof document !== 'undefined' && document.cookie.includes('session_hint=');
          if (!hasSessionHint) {
            try {
              const idToken = await firebaseUser.getIdToken();
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
              });
            } catch (e) {
              console.error("Session auto-sync failed:", e);
            }
          }
          setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
        } else {
          // Check for session hint cookie (SSO across subdomains)
          const hasSessionHint = typeof document !== 'undefined' && document.cookie.includes('session_hint=');

          if (hasSessionHint) {
            try {
              // Try to verify session with backend
              const res = await fetch('/api/auth/session');
              const data = await res.json();
              if (data.authenticated) {
                // We have a server session, but Firebase Client SDK doesn't have the user yet.
                // Keep isUserLoading: true but store the basic info if needed.
                // This prevents the dashboard from rendering and making Firestore calls 
                // until the REAL Firebase Auth SDK has initialized and authenticated.
                setUserAuthState(prev => ({ ...prev, user: { uid: data.uid, email: data.email } as any }));
                return;
              }
            } catch (e) {
              console.error("Session sync failed:", e);
            }
          }
          setUserAuthState({ user: null, isUserLoading: false, userError: null });
        }
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [firebaseServices.auth]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
      user={userAuthState.user}
      isUserLoading={userAuthState.isUserLoading}
      userError={userAuthState.userError}
    >
      {children}
    </FirebaseProvider>
  );
}
