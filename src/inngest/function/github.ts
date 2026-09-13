import { inngest } from '../inngest.js';
import { octokit } from '../../libs/octokit.js';
import { run } from '@openai/agents';
import { githubReviewAgent } from '../../agent/agent.js';
import { saveChunk, searchRepo } from '../../libs/pinecone.js';
import "dotenv/config";
import { fetchPullRequestChanges, fetchPullRequestFiles, fetchRepoFiles } from '../../services/githubActions.js';
import { chunkFiles } from '../../services/chunker.js';

/**
 * event: {
 *      data: {
 *          owner: <repo-owner>
 *          repo: <repo-name>
 *          pull_number: <number>
 *      }
 *  }
 */

export const githubPullRequest = inngest.createFunction(
    { id: 'pr-request-function', triggers: [{ event: 'github/pr.request' }] },
    async ({ event, step }) => {
        const { owner, repo, pull_number } = event.data;

        // just the embeddigs of current repo  
        const files = await step.run('add-repo-embaddings', async () => {
            // get the complete repo data
            return fetchRepoFiles(owner, repo);
        });

        const chunckedDocuments = await step.run('chunking-the-repo', async () => {
            return chunkFiles(files, repo);
        });

        await step.run('save-chunks-to-vector-store', async () => {
            await saveChunk(repo, chunckedDocuments);
        });

        // 1. fetch pull request information
        const pullRequestInfo = await step.run('fetch-pull-request-information', async () => {
            // check if request exists
            const pullRequestObject = await fetchPullRequestFiles(owner, repo, pull_number);
            return pullRequestObject;

        });

        if (!pullRequestInfo) {
            return {
                message: "Couldn't able to find the pull request information",
                skipped: true
            }
        }

        if (pullRequestInfo.state !== 'open') {
            return {
                message: 'Pull request is not opened yet!',
                skipped: true,
                complete: false
            }
        }

        // 2. fetch the details of the changes
        const changes = await step.run('fetch-changes', async () => {
            const changedResult = await fetchPullRequestChanges(owner, repo, pull_number);
            return changedResult;
        });

        if (changes.length === 0) {
            return {
                message: 'There is no change in this PR!',
                skipped: true
            }
        }

        const contextResult = await step.run('get-ai-context-from-change', async () => {
            return searchRepo(repo, 
                `
                Find the code and the files that is/are relevent to this pull request

                Changs: 
                ${JSON.stringify(changes, null, 2)}

                Find:
                - related functions
                - chagnes scope
                - caller and user
                - relevent tests
                `
            );
        });

        // 3. AI Analyse 
        const aiResponse = await step.run('ai-analyse-pr', async () => {
            const llmResult = await run(
                githubReviewAgent,
                `
                Pull Request Information:
                ${JSON.stringify(pullRequestInfo, null, 2)}
                \n \n

                Context:
                ${contextResult}

                Changes Details:
                ${JSON.stringify(changes, null, 2)}
                `);

            if (!llmResult.finalOutput) {
                throw new Error('AI agent returned no output');
            }
            return {
                llmResponse: llmResult.finalOutput
            }
        });

        // 4. create comment on the PR
        await step.run('add review comments', async () => {
            const { content, criticalFixes, suggestion } = aiResponse.llmResponse;

            const sections = [content];

            if (criticalFixes?.length) {
                sections.push(
                    `**Critical Changes**: \n${criticalFixes?.map(fix => `-${fix}`).join('\n')}`
                )
            }

            if (suggestion?.length) {
                sections.push(
                    `**Suggestion**: \n ${suggestion?.map(suggestion => `-${suggestion}`).join('\n')}`
                )
            }

            await octokit.issues.createComment({
                owner,
                repo,
                issue_number: pull_number,
                body: sections.join('\n')
            });
        });
    }
);