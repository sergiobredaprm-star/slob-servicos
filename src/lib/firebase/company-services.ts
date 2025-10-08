'use client';
import { collection, Firestore, doc, getDocs, query, limit } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { CompanyProfile } from '@/lib/types';

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
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...(doc.data() as CompanyProfile) };
  }

  return null;
}
