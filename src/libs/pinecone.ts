import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';

import 'dotenv/config';

export const embaddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small'
});

export const pinecone = new Pinecone();

// get the index
export function getIndex() {
    return pinecone.Index(process.env.PINECONE_INDEX!);
}

// save the chunks
export async function saveChunk(repo: string, document: Array<any>) {
    const namespace = repo.replace('/', '-');

    await PineconeStore.fromDocuments(
        document,
        embaddings,
        {
            pineconeIndex: getIndex(),
            namespace
        }
    )
}

// similarity search feature
export async function searchRepo(
    repo: string,
    query: string,
    k = 8
) {
    const namespace = repo.replace('/', '-');

    const vectorStore = await PineconeStore.fromExistingIndex(
        embaddings,
        {
            pineconeIndex: getIndex(),
            namespace
        }
    );

    const docs = await vectorStore.similaritySearch(
        query,
        k
    );

    return docs;
}
