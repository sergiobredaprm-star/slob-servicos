import { 
    Auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
} from 'firebase/auth';

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
        return { error: null };
    } catch (error) {
        return { error };
    }
}