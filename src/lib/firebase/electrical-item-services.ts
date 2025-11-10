'use client';
import {
  collection,
  Firestore,
  doc,
  deleteDoc,
  getDocs,
  query,
  updateDoc,
} from 'firebase/firestore';
import {
  addDocumentNonBlocking,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { ElectricalServiceItem } from '@/lib/types';

export async function saveElectricalItem(
  firestore: Firestore,
  userId: string,
  itemData: Omit<ElectricalServiceItem, 'id' | 'userId'>,
  itemId?: string
) {
  if (!userId) {
    throw new Error('User ID is required to save an electrical item.');
  }

  const dataToSave = { ...itemData, userId };

  if (itemId) {
    const itemDoc = doc(
      firestore,
      'users',
      userId,
      'electricalServiceItems',
      itemId
    );
    return setDocumentNonBlocking(itemDoc, dataToSave, { merge: true });
  } else {
    const itemCollection = collection(
      firestore,
      'users',
      userId,
      'electricalServiceItems'
    );
    return addDocumentNonBlocking(itemCollection, dataToSave);
  }
}

export async function deleteElectricalItem(
  firestore: Firestore,
  userId: string,
  itemId: string
) {
  if (!userId || !itemId) {
    throw new Error('User ID and Item ID are required to delete an item.');
  }
  const itemDoc = doc(
    firestore,
    'users',
    userId,
    'electricalServiceItems',
    itemId
  );
  return deleteDocumentNonBlocking(itemDoc);
}
