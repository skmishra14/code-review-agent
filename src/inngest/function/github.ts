import { inngest } from '../inngest.js';
import { octokit } from '../../libs/octokit.js';
import { run } from '@openai/agents';
import { githubReviewAgent } from '../../agent/agent.js'
import "dotenv/config";

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
        // 1. fetch pull request information
        const pullRequestInfo = await step.run('fetch-pull-request-information', async () => {
            // check if request exists
            try {
                const pullRequestObject = await octokit.pulls.get({ owner, repo, pull_number });

                return {
                    id: pullRequestObject.data.id,
                    title: pullRequestObject.data.title,
                    state: pullRequestObject.data.state,
                    number: pullRequestObject.data.number,
                    comments: pullRequestObject.data.comments,
                    url: pullRequestObject.data.url,
                    diffUrl: pullRequestObject.data.diff_url,
                    changes: pullRequestObject.data.changed_files,
                    commits: pullRequestObject.data.commits
                }
            } catch (error) {
                return null;
            }
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
            const changedResult = await octokit.paginate(octokit.pulls.listFiles, {
                owner,
                repo,
                pull_number,
                per_page: 100
            });

            return changedResult.map((change) => ({
                fileName: change.filename,
                status: change.status,
                additions: change.additions,
                patch: change.patch,
                deletions: change.deletions,
                previous_filename: change.previous_filename,
                changes: change.changes
            }));
        });

        if (changes.length === 0) {
            return {
                message: 'There is no change in this PR!',
                skipped: true
            }
        }

        // 3. AI Analyse 
        const aiResponse = await step.run('ai-analyse-pr', async () => {
            const llmResult = await run(
                githubReviewAgent,
                `
                Pull Request Information:
                ${JSON.stringify(pullRequestInfo, null, 2)}
                \n \n

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