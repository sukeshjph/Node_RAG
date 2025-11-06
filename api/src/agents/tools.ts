/**
 * LangChain Tools for Category-Specific Data Retrieval
 * These tools are called dynamically based on the question category
 */

import * as z from "zod";

import { retrieveDocuments } from "./retriever";
import { tool } from "langchain";

/**
 * Tool: Retrieve Finance Data
 * Specialized retrieval for finance-related questions
 */
export const retrieveFinanceDataTool = tool(
    async ({ question, requestId, maxResults = 5 }) => {
        // Finance-specific logic:
        // - Could query a finance API
        // - Could query a specific finance index
        // - Could apply finance-specific filters

        console.log(`[Finance Tool] Retrieving finance data for: ${question}`);

        // Example: Call finance-specific API
        // const financeData = await fetch('https://api.finance-system.com/query', {...});

        // For now, use Azure Search with finance filters
        const result = await retrieveDocuments(question, requestId, {
            k: maxResults,
            // Could add filter: documentType eq 'financial_report'
        });

        return JSON.stringify({
            source: "finance_system",
            documents: result.documents.map(doc => ({
                id: doc.id,
                title: doc.title,
                content: doc.content?.substring(0, 500),
                score: doc.score,
                metadata: doc.metadata,
            })),
            count: result.documents.length,
            metrics: result.metrics,
        });
    },
    {
        name: "retrieve_finance_data",
        description: "Retrieves financial data from the finance system. Use this for questions about budgets, expenses, financial reports, revenue, or accounting.",
        schema: z.object({
            question: z.string().describe("The finance-related question"),
            requestId: z.string().describe("Request tracking ID"),
            maxResults: z.number().optional().describe("Maximum number of results (default: 5)"),
        }),
    }
);

/**
 * Tool: Retrieve HR Data
 * Specialized retrieval for HR-related questions
 */
export const retrieveHRDataTool = tool(
    async ({ question, requestId, maxResults = 5 }) => {
        console.log(`[HR Tool] Retrieving HR data for: ${question}`);

        // Example: Query HR database
        // const hrData = await queryHRDatabase(question);

        const result = await retrieveDocuments(question, requestId, {
            k: maxResults,
            // Could add filter: category eq 'hr_policy'
        });

        return JSON.stringify({
            source: "hr_system",
            documents: result.documents.map(doc => ({
                id: doc.id,
                title: doc.title,
                content: doc.content?.substring(0, 500),
                score: doc.score,
                metadata: doc.metadata,
            })),
            count: result.documents.length,
            metrics: result.metrics,
        });
    },
    {
        name: "retrieve_hr_data",
        description: "Retrieves HR data from the human resources system. Use this for questions about employee benefits, vacation policies, HR procedures, or personnel matters.",
        schema: z.object({
            question: z.string().describe("The HR-related question"),
            requestId: z.string().describe("Request tracking ID"),
            maxResults: z.number().optional().describe("Maximum number of results (default: 5)"),
        }),
    }
);

/**
 * Tool: Retrieve Compliance Data
 * Specialized retrieval for compliance/legal questions
 */
export const retrieveComplianceDataTool = tool(
    async ({ question, requestId, maxResults = 5 }) => {
        console.log(`[Compliance Tool] Retrieving compliance data for: ${question}`);

        // Example: Query compliance database
        // const complianceData = await queryComplianceDB(question);

        const result = await retrieveDocuments(question, requestId, {
            k: maxResults,
            // Could add filter: documentType eq 'policy' or documentType eq 'regulation'
        });

        return JSON.stringify({
            source: "compliance_system",
            documents: result.documents.map(doc => ({
                id: doc.id,
                title: doc.title,
                content: doc.content?.substring(0, 500),
                score: doc.score,
                metadata: doc.metadata,
            })),
            count: result.documents.length,
            metrics: result.metrics,
        });
    },
    {
        name: "retrieve_compliance_data",
        description: "Retrieves compliance and regulatory data. Use this for questions about policies, regulations, legal requirements, or compliance procedures.",
        schema: z.object({
            question: z.string().describe("The compliance-related question"),
            requestId: z.string().describe("Request tracking ID"),
            maxResults: z.number().optional().describe("Maximum number of results (default: 5)"),
        }),
    }
);

/**
 * Tool: General Document Search
 * Fallback for general questions
 */
export const retrieveGeneralDataTool = tool(
    async ({ question, requestId, maxResults = 5 }) => {
        console.log(`[General Tool] Retrieving general data for: ${question}`);

        const result = await retrieveDocuments(question, requestId, {
            k: maxResults,
        });

        return JSON.stringify({
            source: "general_search",
            documents: result.documents.map(doc => ({
                id: doc.id,
                title: doc.title,
                content: doc.content?.substring(0, 500),
                score: doc.score,
                metadata: doc.metadata,
            })),
            count: result.documents.length,
            metrics: result.metrics,
        });
    },
    {
        name: "retrieve_general_data",
        description: "Retrieves general documents from the knowledge base. Use this for questions that don't fit into specific categories.",
        schema: z.object({
            question: z.string().describe("The question to search for"),
            requestId: z.string().describe("Request tracking ID"),
            maxResults: z.number().optional().describe("Maximum number of results (default: 5)"),
        }),
    }
);

/**
 * Map of category to tool
 */
export const CATEGORY_TOOLS_MAP = {
    finance: retrieveFinanceDataTool,
    hr: retrieveHRDataTool,
    compliance: retrieveComplianceDataTool,
    general: retrieveGeneralDataTool,
} as const;

/**
 * Get all available tools
 */
export function getAllTools() {
    return [
        retrieveFinanceDataTool,
        retrieveHRDataTool,
        retrieveComplianceDataTool,
        retrieveGeneralDataTool,
    ];
}

