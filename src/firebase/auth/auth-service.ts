import { 
    Auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onIdTokenChanged
} from 'firebase/auth';

async function setSessionCookie(idToken: string) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to set session cookie. Server responded with:", errorBody);
    throw new Error('Failed to set session cookie');
  }
}

async function clearSessionCookie() {
    await fetch('/api/auth', { method: 'DELETE' });
}


export const listenForTokenChanges = (auth: Auth) => {
  return onIdTokenChanged(auth, async (user) => {
    if (user) {
      try {
        const idToken = await user.getIdToken(true); // Force refresh
        await setSessionCookie(idToken);
      } catch (error) {
        console.error("Error setting session cookie:", error);
        // Don't clear session here, as it might log out a valid user if there's a temporary network issue.
      }
    } else {
      // User is signed out on the client. Clear the server session.
      try {
        await clearSessionCookie();
      } catch (error) {
        console.error("Error clearing session cookie:", error);
      }
    }
  });
};


export const signInUser = async (auth: Auth, email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

export const signUpUser = async (auth: Auth, email: string, password: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

export const signOutUser = async (auth: Auth) => {
    try {
        await signOut(auth);
        // The onIdTokenChanged listener will handle clearing the session cookie
        return { error: null };
    } catch (error) {
        return { error };
    }
}
