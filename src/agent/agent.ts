import { Agent } from '@openai/agents';
import { z } from 'zod';

const githubReviewOutputSchema = z.object({
    criticalFixes: z.array(z.string()).optional().nullable().describe('critical fixes if any'),
    suggestion: z.array(z.string()).optional().nullable().describe('suggestions if any'),
    content: z.string().describe('Actual content for the reply')
})

export const githubReviewAgent = new Agent({
    name: 'github code review agent',
    outputType: githubReviewOutputSchema,
    instructions: `
    You are an expert code reviewer.
    You're gived with the pull request details and changes details.
    Give a detailed review about the code change and suggest the changes required and comments.
    Use emoji and make the review sound natural.
    `
});