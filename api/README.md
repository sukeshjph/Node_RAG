# Simple RAG Query Service

A minimal Node.js TypeScript API that implements RAG (Retrieval-Augmented Generation) using Azure Cognitive Search and Azure OpenAI.

## 🚀 What it does

1. **Query** → Generate embeddings using Azure OpenAI
2. **Retrieve** → Search Azure Cognitive Search with hybrid search
3. **Prompt** → Build grounded prompt with context and citations
4. **Answer** → Generate response using Azure OpenAI with source attribution

## 📁 Structure

```
api/
├── src/
│   ├── server.ts          # Express server with /query endpoint
│   ├── config.ts          # Environment configuration
│   ├── types.ts           # TypeScript interfaces
│   ├── embeddings.ts      # Azure OpenAI embedding service
│   ├── retrieve.ts        # Azure Cognitive Search
│   └── prompt.ts          # LLM prompting and response generation
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
```

## 📡 API

### POST /query

**Request:**
```json
{
  "q": "What is machine learning?",
  "k": 6,
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
  "requestId": "uuid-here"
}
```

### GET /health

Basic health check.

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server