/**
 * Test Dataset for Retrieval Evaluation
 * 
 * Add your test queries with ground truth relevant documents.
 * Update this file with real queries from your domain.
 */

export interface TestCase {
    query: string;
    relevant: string[];  // List of relevant document IDs
    description?: string;
}

/**
 * Hardcoded test set for evaluation
 * 
 * To customize:
 * 1. Replace queries with real questions from your domain
 * 2. Replace document IDs with actual IDs from your Azure Search index
 * 3. Add more test cases as needed
 */
export const testSet: TestCase[] = [
    {
        query: "What is the risk policy?",
        relevant: ["doc123", "doc456"],
        description: "Compliance question about risk management"
    },
    {
        query: "How to reset password?",
        relevant: ["doc789"],
        description: "Technical support question"
    },
    {
        query: "What are our vacation benefits?",
        relevant: ["doc101", "doc102", "doc103"],
        description: "HR benefits question"
    },
    {
        query: "Trading regulations for options",
        relevant: ["doc201", "doc202"],
        description: "Trading compliance question"
    },
    {
        query: "How do I submit an expense report?",
        relevant: ["doc301"],
        description: "Finance process question"
    }
];

/**
 * Validation helper to check if test data is properly configured
 */
export function validateTestSet(testSet: TestCase[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (testSet.length === 0) {
        errors.push("Test set is empty");
    }

    testSet.forEach((test, index) => {
        if (!test.query || test.query.trim().length === 0) {
            errors.push(`Test case ${index}: Query is empty`);
        }
        if (!test.relevant || test.relevant.length === 0) {
            errors.push(`Test case ${index}: No relevant documents specified`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

