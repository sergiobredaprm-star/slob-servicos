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
        const idToken = await user.getIdToken();
        await setSessionCookie(idToken);
      } catch (error) {
        console.error("Error setting session cookie:", error);
        await clearSessionCookie();
      }
    } else {
      // Quando o usuário faz logout ou o token expira do lado do cliente
      const res = await fetch('/api/auth', { method: 'GET' });
      const { isAuthenticated } = await res.json();
      if (isAuthenticated) {
        await clearSessionCookie();
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
        await clearSessionCookie();
        return { error: null };
    } catch (error) {
        return { error };
    }
}