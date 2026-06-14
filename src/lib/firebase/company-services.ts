'use client';
import { collection, Firestore, doc, getDocs, query, limit } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { CompanyProfile } from '@/lib/types';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

export async function saveCompanyProfile(
  firestore: Firestore,
  userId: string,
  profileData: Omit<CompanyProfile, 'id' | 'userId'>,
  profileId?: string
) {
  if (!userId) {
    throw new Error('User ID is required to save company profile.');
  }

  const dataToSave = { ...profileData, userId };

  if (profileId) {
    const profileDoc = doc(firestore, 'users', userId, 'companyProfile', profileId);
    return setDocumentNonBlocking(profileDoc, dataToSave, { merge: true });
  } else {
    const profileCollection = collection(firestore, 'users', userId, 'companyProfile');
    return addDocumentNonBlocking(profileCollection, dataToSave);
  }
}

export async function getCompanyProfile(
  firestore: Firestore,
  userId: string
): Promise<(CompanyProfile & { id: string }) | null> {
  if (!userId) {
    throw new Error('User ID is required to get company profile.');
  }

  const profileCollection = collection(firestore, 'users', userId, 'companyProfile');
  const q = query(profileCollection, limit(1));
  
  try {
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data() as CompanyProfile;
      return { ...data, id: querySnapshot.docs[0].id };
    }
    return null;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const contextualError = new FirestorePermissionError({
        path: profileCollection.path,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', contextualError);
      // Lançar o erro contextual para que possa ser capturado pela UI
      throw contextualError;
    }
    // Lançar outros erros que não são de permissão
    throw error;
  }
}
