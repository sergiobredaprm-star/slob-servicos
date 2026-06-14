'use server';

/**
 * @fileOverview Task suggestion AI agent.
 *
 * - generateTaskSuggestions - A function that generates task suggestions based on client information.
 * - GenerateTaskSuggestionsInput - The input type for the generateTaskSuggestions function.
 * - GenerateTaskSuggestionsOutput - The return type for the generateTaskSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTaskSuggestionsInputSchema = z.object({
  clientName: z.string().describe('The name of the client.'),
  clientDescription: z.string().describe('A description of the client and their needs.'),
  serviceType: z.string().optional().describe('The type of service (e.g., Painting, Electrical).'),
  items: z.array(z.string()).optional().describe('The list of items already added to the service.'),
});
export type GenerateTaskSuggestionsInput = z.infer<typeof GenerateTaskSuggestionsInputSchema>;

const GenerateTaskSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested tasks for the client.'),
});
export type GenerateTaskSuggestionsOutput = z.infer<typeof GenerateTaskSuggestionsOutputSchema>;

export async function generateTaskSuggestions(input: GenerateTaskSuggestionsInput): Promise<GenerateTaskSuggestionsOutput> {
  return generateTaskSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTaskSuggestionsPrompt',
  input: {schema: GenerateTaskSuggestionsInputSchema},
  output: {schema: GenerateTaskSuggestionsOutputSchema},
  prompt: `Você é um consultor especializado em orçamentos para serviços de manutenção e reforma no Brasil (OrçaDiária).
  Sua tarefa é sugerir 3 textos profissionais para o campo "Tarefa a ser realizada".

  Contexto:
  - Nome do Cliente: {{{clientName}}}
  - Descrição das Necessidades: {{{clientDescription}}}
  - Tipo de Serviço Principal: {{{serviceType}}}
  - Itens Técnicos Já Listados: {{{items}}}

  Regras de Ouro:
  1. Se houver "Itens Técnicos Já Listados", use-os para criar sugestões muito específicas (ex: se tiver "Disjuntor", sugira "Revisão de quadro de carga e substituição de disjuntores").
  2. Use termos técnicos adequados e um tom de autoridade no assunto.
  3. Cada sugestão deve ser curta o suficiente para um campo de descrição, mas completa o suficiente para passar confiança.
  4. Responda em Português do Brasil.

  Formate a resposta como um array JSON de strings.
  Exemplo:
  ["Tarefa 1", "Tarefa 2", "Tarefa 3"]`,
});

const generateTaskSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateTaskSuggestionsFlow',
    inputSchema: GenerateTaskSuggestionsInputSchema,
    outputSchema: GenerateTaskSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
