import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export async function chunkFiles(files: Array<any>, repo: string) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
    });

    const documents = [];

    for(const file of files) {
        // check for the undefined case
        if (file.content === undefined || file.path === undefined) continue;
        const chunk = await splitter.createDocuments(
            [file.content],
            [{path: file.path, repo}]
        );

        documents.push(...chunk);
    } 

    return documents;
}