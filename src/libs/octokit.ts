import { Octokit } from '@octokit/rest';
import "dotenv/config"

export const octokit: Octokit = new Octokit({
    auth: process.env.GIT_HUB_TOKEN,
    userAgent: 'github-pull-request-agent'
});