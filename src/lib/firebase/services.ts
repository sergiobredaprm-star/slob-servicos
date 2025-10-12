'use client';
import { collection, Firestore, Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Budget, Payment } from '@/lib/types';

function convertDatesToTimestamps(data: any): any {
    const dataToSave = { ...data };
    if (dataToSave.period?.from && dataToSave.period.from instanceof Date) {
        dataToSave.period.from = Timestamp.fromDate(dataToSave.period.from);
    }
    if (dataToSave.period?.to && dataToSave.period.to instanceof Date) {
        dataToSave.period.to = Timestamp.fromDate(dataToSave.period.to);
    }
    if (dataToSave.deadline && dataToSave.deadline instanceof Date) {
        dataToSave.deadline = Timestamp.fromDate(dataToSave.deadline);
    }
    if (dataToSave.registrationDate && dataToSave.registrationDate instanceof Date) {
        dataToSave.registrationDate = Timestamp.fromDate(dataToSave.registrationDate);
    }
    return dataToSave;
}


export async function saveBudget(firestore: Firestore, userId: string, budgetData: Omit<Budget, 'id'>, budgetId?: string) {
    if (!userId) {
        throw new Error("User ID is required to save a budget.");
    }
    
    const dataToSave = convertDatesToTimestamps(budgetData);

    if (budgetId) {
        // Update existing budget
        const budgetDoc = doc(firestore, 'users', userId, 'budgets', budgetId);
        return setDocumentNonBlocking(budgetDoc, dataToSave, { merge: true });
    } else {
        // Create new budget
        const budgetCollection = collection(firestore, 'users', userId, 'budgets');
        return addDocumentNonBlocking(budgetCollection, {...dataToSave, paymentHistory: []});
    }
}

export async function deleteBudget(firestore: Firestore, userId: string, budgetId: string) {
    if (!userId || !budgetId) {
        throw new Error("User ID and Budget ID are required to delete a budget.");
    }
    const budgetDoc = doc(firestore, 'users', userId, 'budgets', budgetId);
    return deleteDocumentNonBlocking(budgetDoc);
}

export async function addPaymentToBudget(firestore: Firestore, userId: string, budgetId: string, payment: Omit<Payment, 'id'>) {
    if (!userId || !budgetId) {
        throw new Error("User ID and Budget ID are required to add a payment.");
    }
    const budgetDocRef = doc(firestore, 'users', userId, 'budgets', budgetId);
    const paymentWithId = { 
        ...payment,
        id: new Date().toISOString(), // Simple unique ID
        date: Timestamp.fromDate(payment.date as Date) 
    };

    // We don't use the non-blocking updater here because we want to await the result
    // to give feedback to the user. This is a user-interactive action.
    await updateDoc(budgetDocRef, {
        paymentHistory: arrayUnion(paymentWithId)
    });
}
