import { inngest } from '../inngest.js';
import { octokit } from '../../libs/octokit.js';

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
        // 1. fetch pull request information
        const pullRequestInfo = await step.run('fetch-pull-request-information', async () => {
            const { owner, repo, pull_number } = event.data;

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

        // 
    }
);