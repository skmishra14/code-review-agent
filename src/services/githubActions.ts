import { octokit } from "../libs/octokit.js";
import { shouldSkipFiles } from "../utils/utils.js";


export async function fetchRepoFiles(owner: string, repo: string) {
    const { data: repoInfo } = await octokit.repos.get({ owner, repo }).catch((err) => {
        throw err;
    });

    const { data: tree } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: repoInfo.default_branch,
        recursive: "true",
    });

    const files = [];

    for (const item of tree.tree) {
        if (item.type !== 'blob') continue;
        if (shouldSkipFiles(item.path, item.size)) continue;

        const { data: blob } = await octokit.git.getBlob({
            owner,
            repo,
            file_sha: item.sha
        });

        files.push({
            path: item.path,
            content: Buffer.from(blob.content, 'base64').toString('utf-8')
        });

        if (files.length >= 500) break;
    }

    return files;
}

export async function fetchPullRequestFiles(owner: string, repo: string, pull_number: number) {
    const pullRequestObject = await octokit.pulls.get({ owner, repo, pull_number }).catch((err) => {
        throw err;
    });

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
}

export async function fetchPullRequestChanges(owner: string, repo: string, pull_number: number) {
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
}