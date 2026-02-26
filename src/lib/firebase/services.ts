'use client';
import { collection, Firestore, Timestamp, doc, updateDoc, arrayUnion, getDoc, arrayRemove } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Budget, Payment, ServiceType } from '@/lib/types';

/**
 * Recursively removes all undefined properties from an object or array.
 * Firestore does not support undefined values.
 */
function deepClean(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepClean);
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof Timestamp)) {
    const result: any = {};
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (value !== undefined) {
        result[key] = deepClean(value);
      }
    });
    return result;
  }
  return obj;
}

function prepareBudgetDataForSave(data: any): any {
    // Start by deep cleaning to remove any undefineds from the form
    let dataToSave = deepClean(data);

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

    // Conditionally include/clean fields based on serviceType
    if (dataToSave.serviceType !== 'Pintura') {
        delete dataToSave.wallWidth;
        delete dataToSave.wallHeight;
        delete dataToSave.sqMetersPrice;
        delete dataToSave.paintCoats;
        delete dataToSave.paintingRooms;
    } else {
        dataToSave.paintingRooms = dataToSave.paintingRooms || [];
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

    return dataToSave;
}


export async function saveBudget(firestore: Firestore, userId: string, budgetData: Omit<Budget, 'id'>, budgetId?: string) {
    if (!userId) {
        throw new Error("User ID is required to save a budget.");
    }
    
    const dataToSave = prepareBudgetDataForSave(budgetData);

    try {
        if (budgetId) {
            const budgetDoc = doc(firestore, 'users', userId, 'budgets', budgetId);
            return setDocumentNonBlocking(budgetDoc, dataToSave, { merge: true });
        } else {
            const budgetCollection = collection(firestore, 'users', userId, 'budgets');
            return addDocumentNonBlocking(budgetCollection, {...dataToSave, paymentHistory: [] });
        }
    } catch (error) {
        console.error("Critical error in saveBudget service:", error);
        throw error;
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

    await updateDoc(budgetDocRef, {
        paymentHistory: arrayUnion(paymentWithId)
    });
}

export async function updatePaymentInBudget(firestore: Firestore, userId: string, budgetId: string, updatedPayment: Payment) {
    if (!userId || !budgetId || !updatedPayment.id) {
        throw new Error("User ID, Budget ID, and Payment ID are required.");
    }
    const budgetDocRef = doc(firestore, 'users', userId, 'budgets', budgetId);
    
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

    const newPaymentHistory = [...paymentHistory];
    newPaymentHistory[paymentIndex] = paymentToStore;
    
    await updateDoc(budgetDocRef, {
        paymentHistory: newPaymentHistory
    });
}

export async function deletePaymentFromBudget(firestore: Firestore, userId: string, budgetId: string, paymentToDelete: Payment) {
    if (!userId || !budgetId || !paymentToDelete.id) {
        throw new Error("User ID, Budget ID, and Payment ID are required.");
    }
    const budgetDocRef = doc(firestore, 'users', userId, 'budgets', budgetId);
    
    const budgetDoc = await getDoc(budgetDocRef);
    if (!budgetDoc.exists()) {
        throw new Error("Budget not found.");
    }
    const budget = budgetDoc.data() as Budget;
    const paymentHistory = budget.paymentHistory || [];
    
    const paymentToRemove = paymentHistory.find(p => p.id === paymentToDelete.id);

    if (!paymentToRemove) {
      console.warn("Payment to delete not found in history.");
      return;
    }

    await updateDoc(budgetDocRef, {
        paymentHistory: arrayRemove(paymentToRemove)
    });
}
