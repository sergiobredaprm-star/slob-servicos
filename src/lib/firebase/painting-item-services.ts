
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
import { PaintingServiceItem } from '@/lib/types';

export async function savePaintingItem(
  firestore: Firestore,
  userId: string,
  itemData: Omit<PaintingServiceItem, 'id' | 'userId'>,
  itemId?: string
) {
  if (!userId) {
    throw new Error('User ID is required to save a painting item.');
  }

  const dataToSave = { ...itemData, userId };

  if (itemId) {
    const itemDoc = doc(
      firestore,
      'users',
      userId,
      'paintingServiceItems',
      itemId
    );
    return setDocumentNonBlocking(itemDoc, dataToSave, { merge: true });
  } else {
    const itemCollection = collection(
      firestore,
      'users',
      userId,
      'paintingServiceItems'
    );
    return addDocumentNonBlocking(itemCollection, dataToSave);
  }
}

export async function deletePaintingItem(
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
    'paintingServiceItems',
    itemId
  );
  return deleteDocumentNonBlocking(itemDoc);
}
