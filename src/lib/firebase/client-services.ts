'use client';
import { collection, Firestore, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Client } from '@/lib/types';

export async function saveClient(firestore: Firestore, userId: string, clientData: Omit<Client, 'id'>, clientId?: string) {
    if (!userId) {
        throw new Error("User ID is required to save a client.");
    }
    
    if (clientId) {
        // Update existing client
        const clientDoc = doc(firestore, 'users', userId, 'clients', clientId);
        return setDocumentNonBlocking(clientDoc, clientData, { merge: true });
    } else {
        // Create new client
        const clientCollection = collection(firestore, 'users', userId, 'clients');
        return addDocumentNonBlocking(clientCollection, clientData);
    }
}

export async function deleteClient(firestore: Firestore, userId: string, clientId: string) {
    if (!userId || !clientId) {
        throw new Error("User ID and Client ID are required to delete a client.");
    }
    const clientDoc = doc(firestore, 'users', userId, 'clients', clientId);
    return deleteDocumentNonBlocking(clientDoc);
}
