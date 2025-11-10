'use client';
import {
  collection,
  Firestore,
  doc,
} from 'firebase/firestore';
import {
  addDocumentNonBlocking,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { HydraulicServiceItem } from '@/lib/types';

export async function saveHydraulicItem(
  firestore: Firestore,
  userId: string,
  itemData: Omit<HydraulicServiceItem, 'id' | 'userId'>,
  itemId?: string
) {
  if (!userId) {
    throw new Error('User ID is required to save a hydraulic item.');
  }

  const dataToSave = { ...itemData, userId };

  if (itemId) {
    const itemDoc = doc(
      firestore,
      'users',
      userId,
      'hydraulicServiceItems',
      itemId
    );
    return setDocumentNonBlocking(itemDoc, dataToSave, { merge: true });
  } else {
    const itemCollection = collection(
      firestore,
      'users',
      userId,
      'hydraulicServiceItems'
    );
    return addDocumentNonBlocking(itemCollection, dataToSave);
  }
}

export async function deleteHydraulicItem(
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
    'hydraulicServiceItems',
    itemId
  );
  return deleteDocumentNonBlocking(itemDoc);
}
