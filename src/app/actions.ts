'use server';

import { generateTaskSuggestions } from '@/ai/flows/generate-task-suggestions';
import { z } from 'zod';

const suggestionSchema = z.object({
  clientName: z.string(),
  clientDescription: z.string(),
  serviceType: z.string().optional(),
  items: z.array(z.string()).optional(),
});

export async function getTaskSuggestionsAction(
  values: z.infer<typeof suggestionSchema>
) {
  const validatedFields = suggestionSchema.safeParse(values);

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
