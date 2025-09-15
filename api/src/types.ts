export interface SearchHit {
    id: string;
    content: string;
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
    q: string;
    k?: number;
    includeText?: boolean;
}

export interface QueryResponse {
    answer: string;
    citations: Citation[];
    requestId: string;
}