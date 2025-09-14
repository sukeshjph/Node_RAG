# User Query Processing API

A Node.js TypeScript API that processes user queries using RAG (Retrieval-Augmented Generation) with Azure Cognitive Search and Azure OpenAI. This API handles the user-facing query processing side of the RAG system.

## 🚀 What it does

1. **Query** → Generate embeddings using Azure OpenAI
2. **Retrieve** → Search Azure Cognitive Search with hybrid search
3. **Prompt** → Build grounded prompt with context and citations
4. **Answer** → Generate response using Azure OpenAI with source attribution

## 📁 Structure

```
api/
├── src/
│   ├── user-query-server.ts      # Express server with /query endpoint
│   ├── config.ts                 # Environment configuration
│   ├── user-query-types.ts       # TypeScript interfaces
│   ├── user-query-embeddings.ts  # Azure OpenAI embedding service
│   ├── user-query-retriever.ts   # Azure Cognitive Search
│   ├── user-query-reranker.ts    # Azure AI ReRanker service
│   └── user-query-prompt.ts      # LLM prompting and response generation
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your Azure credentials
   ```

3. **Run:**
   ```bash
   npm run dev
   ```

## ⚙️ Configuration

Create a `.env` file:

```env
# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_KEY=your-search-key
AZURE_SEARCH_INDEX_ALIAS=docs_current

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-openai-key
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_EMBED_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini

# Server
PORT=3000
NODE_ENV=development

# Optional: Azure AI ReRanker Configuration
USE_RERANKER=false
AZURE_AI_RERANKER_ENDPOINT=https://your-reranker-endpoint.cognitiveservices.azure.com
AZURE_AI_RERANKER_KEY=your-reranker-key
RERANKER_MODEL=microsoft-reranker-v1
```

## 📡 API

### POST /query

**Request:**
```json
{
  "question": "What is machine learning?",
  "maxResults": 6,
  "includeText": false
}
```

**Response:**
```json
{
  "answer": "Machine learning is a subset of artificial intelligence... [1] [2]",
  "citations": [
    {
      "id": "doc-1-3",
      "score": 12.34,
      "filename": "ml-guide.txt",
      "category": "research"
    }
  ],
  "requestId": "uuid-here",
  "metrics": {
    "retrievalTimeMs": 245,
    "reRankingTimeMs": 180,
    "promptTimeMs": 1200,
    "totalTimeMs": 1625
  }
}
```

### GET /health

Basic health check.

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server