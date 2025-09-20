export interface SearchHit {
    id: string;
    content: string;
    contentVector?: number[];
    chatVector?: number[];
    productVector?: number[];
    filename: string;
    category: string;
    createdUtc: string;
    score: number;
}

export interface Citation {
    id: string;
    score: number;
    filename: string;
    category: string;
    snippet?: string;
}

export interface QueryRequest {
    question: string;
    maxResults?: number;
    includeText?: boolean;
}

export interface QueryResponse {
    answer: string;
    citations: Citation[];
    requestId: string;
}