'use server';

import { generateTaskSuggestions } from '@/ai/flows/generate-task-suggestions';
import { z } from 'zod';
import { addDoc, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { Budget } from '@/lib/types';

const formSchema = z.object({
  clientName: z.string(),
  clientDescription: z.string(),
});

export async function getTaskSuggestionsAction(
  values: z.infer<typeof formSchema>
) {
  const validatedFields = formSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos.' };
  }

  try {
    const result = await generateTaskSuggestions(validatedFields.data);
    return { suggestions: result.suggestions };
  } catch (error) {
    console.error('AI suggestion error:', error);
    return { error: 'Falha ao gerar sugestões. Tente novamente.' };
  }
}

const budgetSchema = z.object({
  clientName: z.string().min(2, {
    message: 'O nome do cliente deve ter pelo menos 2 caracteres.',
  }),
  clientDescription: z.string().optional(),
  task: z.string().min(5, {
    message: 'A descrição da tarefa deve ter pelo menos 5 caracteres.',
  }),
  period: z
    .object({
      from: z.date(),
      to: z.date(),
    }),
  dailyRate: z.coerce.number().min(1, { message: 'O valor deve ser maior que 0.' }),
  total: z.coerce.number(),
  status: z.enum(['ativo', 'concluído', 'cancelado']),
  userId: z.string(),
});


export async function saveBudget(budgetData: Omit<Budget, 'id'>) {
    const validatedBudget = budgetSchema.safeParse(budgetData);

    if (!validatedBudget.success) {
        console.error("Validation errors:", validatedBudget.error.format());
        throw new Error("Dados do orçamento inválidos.");
    }

    try {
        const firestore = getFirestore();
        const budgetWithId = {
            ...validatedBudget.data,
        };
        const docRef = await addDoc(collection(firestore, 'budgets'), budgetWithId);
        console.log("Budget saved with ID: ", docRef.id);
        return { id: docRef.id, ...budgetWithId };
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error("Não foi possível salvar o orçamento.");
    }
}
