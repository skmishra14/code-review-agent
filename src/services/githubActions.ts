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