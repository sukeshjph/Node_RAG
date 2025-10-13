# Multi-Agent RAG API Architecture 🤖

## Overview

This is a modular, multi-agent RAG (Retrieval-Augmented Generation) API built with **LangChain.js** and **LangGraph.js**. The system orchestrates specialized agents to provide intelligent, context-aware answers from your document corpus.

## Architecture

### Agent Pipeline

```
┌─────────────┐
│   User      │
│  Question   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                              │
│                   (LangGraph.js)                             │
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  Classifier  │──▶│  Retriever   │──▶│Check Summary │    │
│  │    Agent     │   │    Agent     │   │    Need?     │    │
│  └──────────────┘   └──────────────┘   └───────┬──────┘    │
│                                                  │           │
│                                        ┌─────────┴────────┐ │
│                                        │                  │ │
│                                        ▼                  ▼ │
│                                ┌──────────────┐   ┌──────────────┐
│                                │ Summariser   │   │   Answerer   │
│                                │    Agent     │──▶│    Agent     │
│                                └──────────────┘   └──────────────┘
│                                                           │
└───────────────────────────────────────────────────────────┼────┘
                                                            │
                                                            ▼
                                                    ┌──────────────┐
                                                    │   Answer +   │
                                                    │  Citations   │
                                                    └──────────────┘
```

## Agents

### 1. **Classifier Agent** 🏷️
**File**: `src/agents/classifier.ts`

**Purpose**: Analyzes questions and classifies them by:
- **Category**: HR, Trading, Technical, Finance, Compliance, General
- **Complexity**: Simple, Moderate, Complex

**Example**:
```typescript
Input: "What's our vacation policy?"
Output: {
  category: "hr",
  complexity: "simple",
  confidence: 0.95,
  reasoning: "Single concept HR question"
}
```

### 2. **Retriever Agent** 🔍
**File**: `src/agents/retriever.ts`

**Purpose**: Fetches relevant documents from Azure Cognitive Search using:
- Vector embeddings (text-embedding-3-large)
- Optional Azure AI ReRanker for improved relevance
- Semantic search with cosine similarity

**Features**:
- Configurable `k` (number of results)
- Category filtering
- Score thresholds
- Automatic reranking

### 3. **Summariser Agent** 📝
**File**: `src/agents/summariser.ts`

**Purpose**: Condenses many documents when:
- More than 10 documents retrieved
- Complex questions with >5 documents
- Estimated token count exceeds 8000

**Strategies**:
- **Simple**: Direct summarization
- **Map-Reduce**: For very large document sets (splits, summarizes chunks, combines)

### 4. **Answerer Agent** 💡
**File**: `src/agents/answerer.ts`

**Purpose**: Generates the final answer with:
- Grounded responses (only from context)
- Numbered citations [1], [2], [3]
- Category-specific tone and formatting
- Source attribution

**Category-Specific Prompting**:
- **HR**: Professional, empathetic
- **Trading**: Data-driven, precise
- **Technical**: Step-by-step, clear
- **Finance**: Numbers-focused, regulatory-aware

## Orchestrator

**File**: `src/orchestrator.ts`

**Technology**: LangGraph.js StateGraph

**Flow**:
1. **Classify** → Determine category and complexity
2. **Retrieve** → Fetch relevant documents
3. **Check** → Decide if summarization needed
4. **Summarise** (conditional) → Condense if needed
5. **Answer** → Generate final response with citations

**Features**:
- State management across agents
- Conditional routing (skip summarization if not needed)
- Error handling and retries
- Timeout protection
- Request tracking with IDs

## API Endpoints

### Modular Endpoints

#### 1. `POST /api/classify`
Classify a question.

```bash
curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{"question": "What is our remote work policy?"}'
```

**Response**:
```json
{
  "category": "hr",
  "complexity": "simple",
  "confidence": 0.92,
  "reasoning": "HR policy question",
  "requestId": "uuid",
  "timeMs": 234
}
```

---

#### 2. `POST /api/retrieve`
Retrieve relevant documents.

```bash
curl -X POST http://localhost:3000/api/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Trading regulations for options",
    "maxResults": 5
  }'
```

**Response**:
```json
{
  "documents": [
    {
      "id": "doc123",
      "content": "...",
      "filename": "options-guide.pdf",
      "category": "trading",
      "score": 0.95
    }
  ],
  "metrics": {
    "retrievalTimeMs": 156,
    "reRankingTimeMs": 89,
    "totalDocuments": 5
  },
  "requestId": "uuid"
}
```

---

#### 3. `POST /api/summarise`
Summarize documents.

```bash
curl -X POST http://localhost:3000/api/summarise \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain our benefits",
    "documents": [...]
  }'
```

---

#### 4. `POST /api/answer`
Generate answer from documents or summary.

```bash
curl -X POST http://localhost:3000/api/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What health insurance do we offer?",
    "documents": [...],
    "includeText": true
  }'
```

---

#### 5. `POST /api/ask` ⭐ **RECOMMENDED**
Full orchestrated pipeline.

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are all our HR benefits?",
    "maxResults": 10,
    "includeText": false
  }'
```

**Response**:
```json
{
  "answer": "Based on the provided documents, our HR benefits include...",
  "citations": [
    {
      "id": "doc1",
      "filename": "benefits-guide.pdf",
      "score": 0.95,
      "category": "hr"
    }
  ],
  "requestId": "uuid",
  "metadata": {
    "category": "hr",
    "complexity": "moderate",
    "documentsRetrieved": 8,
    "usedSummarization": false,
    "metrics": {
      "classificationTimeMs": 234,
      "retrievalTimeMs": 156,
      "reRankingTimeMs": 89,
      "answerTimeMs": 567,
      "totalTimeMs": 1046
    }
  }
}
```

---

### Legacy Endpoint

#### `POST /query`
Original monolithic endpoint (backwards compatible).

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is our vacation policy?",
    "maxResults": 6,
    "includeText": false
  }'
```

## Configuration

### Environment Variables

Create a `.env` file:

```env
# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_KEY=your-search-key
AZURE_SEARCH_INDEX_ALIAS=your-index-alias

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com
AZURE_OPENAI_API_KEY=your-openai-key
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_EMBED_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4

# Azure AI ReRanker (Optional)
USE_RERANKER=true
AZURE_AI_RERANKER_ENDPOINT=https://your-reranker.cognitiveservices.azure.com
AZURE_AI_RERANKER_KEY=your-reranker-key

# System
SYSTEM_PROMPT=You are a helpful assistant...
PORT=3000
NODE_ENV=development
```

## Installation

```bash
# Install dependencies
npm install

# Install LangChain and LangGraph
npm install @langchain/core @langchain/openai langchain langgraph

# Development
npm run dev

# Production build
npm run build
npm start
```

## Project Structure

```
api/
├── src/
│   ├── agents/                    # Individual agent implementations
│   │   ├── classifier.ts         # Classifier Agent
│   │   ├── retriever.ts          # Retriever Agent
│   │   ├── summariser.ts         # Summariser Agent
│   │   └── answerer.ts           # Answerer Agent
│   ├── types/
│   │   └── agent-types.ts        # TypeScript types for agents
│   ├── utils/
│   │   └── logger.ts             # Shared logging utility
│   ├── orchestrator.ts           # LangGraph orchestration
│   ├── server.ts                 # NEW modular Express server
│   ├── user-query-server.ts      # Legacy server (kept for compatibility)
│   ├── config.ts                 # Configuration
│   └── ...                       # Other utilities
├── test/
│   ├── multi-agent.http          # API test suite
│   └── smoke.http                # Legacy tests
├── package.json
└── MULTI_AGENT_README.md         # This file
```

## Development Tips

### Testing Individual Agents

```typescript
import { classifyQuestion } from './agents/classifier';
import { retrieveDocuments } from './agents/retriever';

// Test classifier
const classification = await classifyQuestion(
  "What's our vacation policy?",
  "test-request-id"
);
console.log(classification);

// Test retriever
const retrieval = await retrieveDocuments(
  "vacation policy",
  "test-request-id",
  { k: 5 }
);
console.log(retrieval.documents);
```

### Adding New Agents

1. Create agent file in `src/agents/`
2. Define input/output types in `src/types/agent-types.ts`
3. Add node to orchestrator graph
4. Add route in `src/server.ts`
5. Update tests in `test/multi-agent.http`

### Logging

All agents use structured logging with request IDs:

```typescript
import { logAgentStart, logAgentComplete, logAgentError } from './utils/logger';

logAgentStart('MyAgent', requestId, input);
// ... agent logic
logAgentComplete('MyAgent', requestId, timeMs, output);
```

## Performance Metrics

Typical request breakdown:
- **Classification**: 200-400ms
- **Retrieval**: 100-300ms
- **ReRanking**: 50-150ms (if enabled)
- **Summarization**: 1-3s (if needed)
- **Answer Generation**: 500-1000ms
- **Total**: 1-5s (depending on complexity)

## Future Enhancements

- [ ] Streaming responses for long answers
- [ ] Caching for repeated queries
- [ ] Multi-modal support (images, tables)
- [ ] Query refinement agent
- [ ] Feedback loop for answer quality
- [ ] A/B testing framework
- [ ] Batch processing API
- [ ] WebSocket support for real-time updates

## Troubleshooting

### Common Issues

**Issue**: Classification fails
- Check Azure OpenAI deployment is accessible
- Verify API key and endpoint
- Check model supports JSON mode

**Issue**: No documents retrieved
- Verify Azure Search index has data
- Check embedding dimensions match (3072 for text-embedding-3-large)
- Test search directly in Azure portal

**Issue**: Summarization takes too long
- Reduce `maxTokens` parameter
- Use map-reduce strategy for large document sets
- Consider caching summaries

## License

MIT

---

**Built with**: TypeScript, Express.js, LangChain.js, LangGraph.js, Azure OpenAI, Azure Cognitive Search

