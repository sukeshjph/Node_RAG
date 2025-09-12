/**
 * Interface representing a document chunk in the Azure AI Search index
 * This provides type safety for document ingestion and retrieval operations
 */
export interface IndexedChunk {
    id: string;
    filename: string;
    page: number;
    chunk_index: number;
    content: string;
    contentVector: number[];
    createdUtc: string; // ISO date string
}
