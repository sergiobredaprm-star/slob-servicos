'use client';
import { collection, Firestore, Timestamp, doc, updateDoc, arrayUnion, getDoc, arrayRemove } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Budget, Payment, ServiceType } from '@/lib/types';

function prepareBudgetDataForSave(data: any): any {
    const dataToSave = { ...data };

    // Safely convert dates, only if they exist and are Date objects
    if (dataToSave.period?.from instanceof Date) {
        dataToSave.period.from = Timestamp.fromDate(dataToSave.period.from);
    }
    if (dataToSave.period?.to instanceof Date) {
        dataToSave.period.to = Timestamp.fromDate(dataToSave.period.to);
    }
    if (dataToSave.deadline instanceof Date) {
        dataToSave.deadline = Timestamp.fromDate(dataToSave.deadline);
    }
    
    // Always convert registrationDate as it's required
    if (dataToSave.registrationDate instanceof Date) {
        dataToSave.registrationDate = Timestamp.fromDate(dataToSave.registrationDate);
    } else if (!dataToSave.registrationDate) {
        dataToSave.registrationDate = Timestamp.now();
    }

    // Conditionally include fields based on serviceType
    if (dataToSave.serviceType !== 'Pintura') {
        delete dataToSave.wallWidth;
        delete dataToSave.wallHeight;
        delete dataToSave.sqMetersPrice;
        delete dataToSave.paintCoats;
    }

    if (dataToSave.serviceType !== 'Elétrica') {
        dataToSave.electricalItems = [];
    } else {
        dataToSave.electricalItems = dataToSave.electricalItems || [];
    }

    if (dataToSave.serviceType !== 'Hidráulica') {
        dataToSave.hydraulicItems = [];
    } else {
        dataToSave.hydraulicItems = dataToSave.hydraulicItems || [];
    }
    
    if (!dataToSave.issueInvoice) {
        delete dataToSave.invoiceTaxRate;
    }

    // Remove undefined fields that might cause issues
    Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
            delete dataToSave[key];
        }
    });

    return dataToSave;
}


export async function saveBudget(firestore: Firestore, userId: string, budgetData: Omit<Budget, 'id'>, budgetId?: string) {
    if (!userId) {
        throw new Error("User ID is required to save a budget.");
    }
    
    const dataToSave = prepareBudgetDataForSave(budgetData);

    if (budgetId) {
        const budgetDoc = doc(firestore, 'users', userId, 'budgets', budgetId);
        return setDocumentNonBlocking(budgetDoc, dataToSave, { merge: true });
    } else {
        const budgetCollection = collection(firestore, 'users', userId, 'budgets');
        return addDocumentNonBlocking(budgetCollection, {...dataToSave, paymentHistory: [] });
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
        id: new Date().toISOString() + Math.random(), // Simple unique ID
        date: Timestamp.fromDate(payment.date as Date) 
    };

    // We don't use the non-blocking updater here because we want to await the result
    // to give feedback to the user. This is a user-interactive action.
    await updateDoc(budgetDocRef, {
        paymentHistory: arrayUnion(paymentWithId)
    });
}

export async function updatePaymentInBudget(firestore: Firestore, userId: string, budgetId: string, updatedPayment: Payment) {
    if (!userId || !budgetId || !updatedPayment.id) {
        throw new Error("User ID, Budget ID, and Payment ID are required.");
    }
    const budgetDocRef = doc(firestore, 'users', userId, 'budgets', budgetId);
    
    // Convert date to timestamp for storing in Firestore
    const paymentToStore = {
        ...updatedPayment,
        date: Timestamp.fromDate(updatedPayment.date as Date),
    };

    const budgetDoc = await getDoc(budgetDocRef);
    if (!budgetDoc.exists()) {
        throw new Error("Budget not found.");
    }

    const budget = budgetDoc.data() as Budget;
    const paymentHistory = budget.paymentHistory || [];
    
    const paymentIndex = paymentHistory.findIndex(p => p.id === updatedPayment.id);
    if (paymentIndex === -1) {
        throw new Error("Payment not found in history.");
    }

    // Create a new array with the updated payment
    const newPaymentHistory = [...paymentHistory];
    newPaymentHistory[paymentIndex] = paymentToStore;
    
    // Update the document with the new payment history array
    await updateDoc(budgetDocRef, {
        paymentHistory: newPaymentHistory
    });
}

export async function deletePaymentFromBudget(firestore: Firestore, userId: string, budgetId: string, paymentToDelete: Payment) {
    if (!userId || !budgetId || !paymentToDelete.id) {
        throw new Error("User ID, Budget ID, and Payment ID are required.");
    }
    const budgetDocRef = doc(firestore, 'users', userId, 'budgets', budgetId);
    
    // The payment object from the client might have a JS Date, but in Firestore it's a Timestamp.
    // We need to fetch the document to get the exact object to remove.
    const budgetDoc = await getDoc(budgetDocRef);
    if (!budgetDoc.exists()) {
        throw new Error("Budget not found.");
    }
    const budget = budgetDoc.data() as Budget;
    const paymentHistory = budget.paymentHistory || [];
    
    const paymentToRemove = paymentHistory.find(p => p.id === paymentToDelete.id);

    if (!paymentToRemove) {
      console.warn("Payment to delete not found in the budget's history. It might have been already deleted.");
      return; // Exit if not found
    }

    await updateDoc(budgetDocRef, {
        paymentHistory: arrayRemove(paymentToRemove)
    });
}
