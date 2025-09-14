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
    metrics?: ReRankingMetrics;
}

// ReRanker Types
export interface ReRankerDocument {
    text: string;
    title?: string;
}

export interface ReRankerRequest {
    query: string;
    documents: ReRankerDocument[];
    model?: string;
    top?: number;
}

export interface ReRankerResult {
    index: number;
    score: number;
}

export interface ReRankerResponse {
    results: ReRankerResult[];
}

export interface ReRankingMetrics {
    retrievalTimeMs: number;
    reRankingTimeMs?: number;
    promptTimeMs: number;
    totalTimeMs: number;
}