'use client';
import { collection, Firestore, Timestamp, doc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import { Budget } from '@/lib/types';

export async function saveBudget(firestore: Firestore, userId: string, budgetData: Omit<Budget, 'id' | 'userId'>) {
    if (!userId) {
        throw new Error("User ID is required to save a budget.");
    }
    const budgetCollection = collection(firestore, 'users', userId, 'budgets');

    // Convert Date objects to Timestamps
    const dataToSave: any = { ...budgetData, userId };
    if (dataToSave.period?.from && dataToSave.period.from instanceof Date) {
        dataToSave.period.from = Timestamp.fromDate(dataToSave.period.from);
    }
    if (dataToSave.period?.to && dataToSave.period.to instanceof Date) {
        dataToSave.period.to = Timestamp.fromDate(dataToSave.period.to);
    }
    if (dataToSave.deadline && dataToSave.deadline instanceof Date) {
        dataToSave.deadline = Timestamp.fromDate(dataToSave.deadline);
    }
    
    return addDocumentNonBlocking(budgetCollection, dataToSave);
}
