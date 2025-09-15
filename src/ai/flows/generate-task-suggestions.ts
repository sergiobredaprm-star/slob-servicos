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
  prompt: `You are a helpful assistant that suggests tasks based on client information.

  Based on the following client information, suggest 3 tasks that the client might need.

  Client Name: {{{clientName}}}
  Client Description: {{{clientDescription}}}

  Format your response as a JSON array of strings.
  Example:
  [\"Task 1\", \"Task 2\", \"Task 3\"]`,
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
