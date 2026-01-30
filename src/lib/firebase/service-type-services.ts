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
import { ServiceTypeItem } from '@/lib/types';

export async function saveServiceType(
  firestore: Firestore,
  userId: string,
  itemData: Omit<ServiceTypeItem, 'id' | 'userId'>,
  itemId?: string
) {
  if (!userId) {
    throw new Error('User ID is required to save a service type.');
  }

  const dataToSave = { ...itemData, userId };

  if (itemId) {
    const itemDoc = doc(
      firestore,
      'users',
      userId,
      'serviceTypes',
      itemId
    );
    return setDocumentNonBlocking(itemDoc, dataToSave, { merge: true });
  } else {
    const itemCollection = collection(
      firestore,
      'users',
      userId,
      'serviceTypes'
    );
    return addDocumentNonBlocking(itemCollection, dataToSave);
  }
}

export async function deleteServiceType(
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
    'serviceTypes',
    itemId
  );
  return deleteDocumentNonBlocking(itemDoc);
}
