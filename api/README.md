# Multi-Agent RAG API 🚀

A production-ready, modular RAG (Retrieval-Augmented Generation) system built with a multi-agent architecture. Each agent is a specialized component responsible for a specific task in the pipeline.

## 🎯 What it does

This API processes user queries through a sophisticated multi-agent pipeline:

1. **Classify** → Analyzes questions by category and complexity
2. **Retrieve** → Finds relevant documents using vector search + reranking
3. **Summarize** → Condenses many documents when needed (optional)
4. **Answer** → Generates grounded responses with citations

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT REQUEST                                 │
│                    POST /api/ask { question }                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR LAYER                               │
│                   (orchestrator-simple.ts / orchestrator-langgraph.ts)   │
│                                                                           │
│  Manages agent flow, state transitions, error handling, retries         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        ┌────────▼─────────┐          ┌─────────▼────────┐
        │   SEQUENTIAL     │          │   LANGGRAPH      │
        │   ORCHESTRATOR   │    OR    │   STATE GRAPH    │
        │   (Simple)       │          │   (Advanced)     │
        └────────┬─────────┘          └─────────┬────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  CLASSIFIER   │      │   RETRIEVER   │      │  SUMMARISER   │
│    AGENT      │─────▶│    AGENT      │─────▶│    AGENT      │
│               │      │               │      │  (Optional)   │
│ - Category    │      │ - Vector      │      │               │
│ - Complexity  │      │   Search      │      │ - Condense    │
│ - Confidence  │      │ - ReRanking   │      │   Context     │
└───────────────┘      └───────────────┘      └───────┬───────┘
                                                       │
                                              ┌────────▼────────┐
                                              │    ANSWERER     │
                                              │     AGENT       │
                                              │                 │
                                              │ - Generate      │
                                              │   Answer        │
                                              │ - Citations     │
                                              └────────┬────────┘
                                                       │
                                                       ▼
                                              ┌────────────────┐
                                              │   RESPONSE     │
                                              │  answer +      │
                                              │  citations +   │
                                              │  metadata      │
                                              └────────────────┘
```

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies

   ```bash
cd api
   npm install
   ```

### 2. Configure Environment

Create a `.env` file:

```env
# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_KEY=your-key
AZURE_SEARCH_INDEX_ALIAS=your-index

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_EMBED_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4

# Azure AI ReRanker (Optional but recommended)
USE_RERANKER=true
AZURE_AI_RERANKER_ENDPOINT=https://your-reranker.cognitiveservices.azure.com
AZURE_AI_RERANKER_KEY=your-key

# Server Config
PORT=3000
NODE_ENV=development
SYSTEM_PROMPT=You are a helpful assistant. Answer based on provided context and cite sources.
```

### 3. Start the Server

```bash
# Development mode (with hot reload)
npm run dev
```

You should see:

```
🚀 Multi-Agent RAG API running on port 3000

📊 Health: http://localhost:3000/health

🤖 New Modular Endpoints:
   POST http://localhost:3000/api/classify
   POST http://localhost:3000/api/retrieve
   POST http://localhost:3000/api/summarise
   POST http://localhost:3000/api/answer
   POST http://localhost:3000/api/ask (⭐ Recommended - Full Orchestration)

🔄 Legacy Endpoint:
   POST http://localhost:3000/query
```

### 4. Test the API

```bash
# Full orchestrated query (recommended)
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is our company vacation policy?",
  "maxResults": 6,
  "includeText": false
  }'
```

**Expected Response:**

```json
{
  "answer": "Based on the provided documents, our company offers comprehensive HR benefits including health insurance with three plan tiers [1], a 401(k) retirement plan with 6% company match [2], and generous paid time off including 15 vacation days, 10 sick days, and 12 company holidays [3].",
  "citations": [
    {
      "id": "doc-123",
      "filename": "benefits-guide.pdf",
      "category": "hr",
      "score": 0.95
    },
    {
      "id": "doc-456",
      "filename": "retirement-plan.pdf",
      "category": "hr",
      "score": 0.92
    },
    {
      "id": "doc-789",
      "filename": "pto-policy.pdf",
      "category": "hr",
      "score": 0.89
    }
  ],
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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

## 📡 API Endpoints

### 🎯 Recommended: `/api/ask`
**Full orchestrated pipeline** - Use this for production.

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are our HR benefits?",
    "maxResults": 10,
    "includeText": false
  }'
```

### 🔧 Individual Agents (for custom workflows)

#### Classify Question
```bash
curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{"question": "What is our remote work policy?"}'
```

**Response:**
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

#### Retrieve Documents
```bash
curl -X POST http://localhost:3000/api/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Trading regulations for options",
    "maxResults": 5
  }'
```

#### Summarize Documents
```bash
curl -X POST http://localhost:3000/api/summarise \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain our benefits",
    "documents": [...]
  }'
```

#### Generate Answer
```bash
curl -X POST http://localhost:3000/api/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What health insurance do we offer?",
    "documents": [...],
    "includeText": true
  }'
```

### 🔄 Legacy: `/query`
Original monolithic endpoint for backwards compatibility.

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is our vacation policy?",
    "maxResults": 6,
    "includeText": false
  }'
```

## 🤖 Agents Explained

### 1. **Classifier Agent** 🏷️
**File**: `src/agents/classifier.ts`

**Purpose**: Analyzes questions and classifies them by:
- **Category**: HR, Trading, Technical, Finance, Compliance, General
- **Complexity**: Simple, Moderate, Complex

**Technology**:
- Azure OpenAI (GPT-4)
- JSON mode for structured output
- Zod schema validation

### 2. **Retriever Agent** 🔍
**File**: `src/agents/retriever.ts`

**Purpose**: Fetches relevant documents using:
- Vector embeddings (text-embedding-3-large)
- Optional Azure AI ReRanker for improved relevance
- Semantic search with cosine similarity

**Technology**:
- Azure Cognitive Search (vector search)
- Azure OpenAI Embeddings (text-embedding-3-large)
- Azure AI ReRanker (optional)

**Process**:
1. Generate query embedding (3072 dimensions)
2. Vector search with cosine similarity
3. Fetch top-K candidates (50+ for reranking, or exact K)
4. Apply reranking if enabled
5. Return top-K final results

### 3. **Summariser Agent** 📝
**File**: `src/agents/summariser.ts`

**Purpose**: Condenses many documents when:
- More than 10 documents retrieved
- Complex question with >5 documents
- Estimated token count exceeds 8000

**Technology**:
- Azure OpenAI (GPT-4)
- Token estimation
- Map-reduce strategy for large sets

**Strategies**:
- **Direct**: Summarize all documents at once (< 10 docs)
- **Map-Reduce**: Split → summarize chunks → combine (> 10 docs)

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
- **Compliance**: Formal, risk-focused
- **General**: Friendly, accessible

## 🎛️ Orchestration Options

### Simple Orchestrator (Default)
**File**: `src/orchestrator-simple.ts`

**Characteristics**:
- Sequential execution
- No external dependencies (beyond agents)
- Simple error handling
- Easy to understand and debug

**Flow**:
```typescript
1. classify()  →  2. retrieve()  →  3. check_summarization()
                                    ↓
                              4a. summarize() (if needed)
                                    ↓
                              4b. answer()
```

**Best For**:
- Getting started quickly
- Simple workflows
- Minimal dependencies
- Development and testing

### LangGraph Orchestrator (Advanced)
**File**: `src/orchestrator-langgraph.ts`

**Characteristics**:
- State graph with nodes and edges
- Conditional routing
- Built-in retries and error handling
- State persistence and visualization
- Parallel execution potential

**To Use LangGraph**:
```bash
npm install langgraph
# Then update server.ts to use orchestrator-langgraph.ts
```

**Best For**:
- Production deployments
- Complex workflows
- Advanced error handling
- Monitoring and observability
- Extending with more agents

## 📁 Project Structure

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
│   ├── orchestrator-simple.ts    # Simple sequential orchestrator
│   ├── orchestrator-langgraph.ts # Advanced LangGraph orchestrator
│   ├── server.ts                 # Modular Express server
│   ├── legacy-routes.ts          # Legacy endpoint routes
│   ├── config.ts                 # Configuration
│   ├── user-query-types.ts       # Shared types
│   ├── user-query-embeddings.ts  # Embedding service
│   └── user-query-reranker.ts    # ReRanker service
├── archive/                      # Legacy files moved here
│   ├── user-query-server.ts
│   ├── user-query-retriever.ts
│   └── user-query-prompt.ts
├── test/
│   ├── multi-agent.http          # API test suite
│   └── smoke.http               # Legacy tests
├── package.json
└── README.md                     # This file
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_SEARCH_ENDPOINT` | Azure Cognitive Search endpoint | ✅ |
| `AZURE_SEARCH_KEY` | Azure Search API key | ✅ |
| `AZURE_SEARCH_INDEX_ALIAS` | Search index name | ✅ |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | ✅ |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | ✅ |
| `AZURE_OPENAI_API_VERSION` | API version (2024-10-21) | ✅ |
| `AZURE_OPENAI_EMBED_DEPLOYMENT` | Embedding model deployment | ✅ |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | Chat model deployment | ✅ |
| `USE_RERANKER` | Enable Azure AI ReRanker | ❌ |
| `AZURE_AI_RERANKER_ENDPOINT` | ReRanker endpoint | ❌ |
| `AZURE_AI_RERANKER_KEY` | ReRanker API key | ❌ |
| `PORT` | Server port (default: 3000) | ❌ |
| `NODE_ENV` | Environment (development/production) | ❌ |

## 🔧 Scripts

```bash
# Development
npm run dev              # Start new multi-agent server with hot reload
npm run dev:legacy       # Start old monolithic server

# Production
npm run build           # Compile TypeScript to JavaScript
npm start              # Run production build (new server)
npm run start:legacy   # Run production build (old server)

# Testing
npm test               # Run tests
npm run lint          # Check code quality
```

## 📊 Performance

### Typical Timings

| Phase           | Time Range | Notes                        |
|-----------------|-----------|------------------------------|
| Classification  | 200-400ms | GPT-4 API call               |
| Embedding       | 50-150ms  | text-embedding-3-large       |
| Vector Search   | 100-300ms | Azure Cognitive Search       |
| ReRanking       | 50-150ms  | Azure AI ReRanker (optional) |
| Summarization   | 1-3s      | Only if triggered            |
| Answer Gen      | 500-1000ms| GPT-4 API call               |
| **Total**       | **1-5s**  | Depends on complexity        |

### Optimization Strategies

1. **Parallel Execution**: LangGraph can run independent nodes in parallel
2. **Caching**: Cache embeddings and common queries
3. **Batch Processing**: Group multiple queries
4. **Smart Summarization**: Skip when not needed
5. **Streaming**: Stream answer generation
6. **Index Optimization**: Tune Azure Search parameters

## 🚨 Troubleshooting

### Common Issues

**Issue**: `Cannot find module 'langgraph'`
- **Solution**: Use the simple orchestrator (default) or run `npm install langgraph`

**Issue**: Azure Connection Errors
- **Check endpoints**: Verify Azure OpenAI and Search endpoints
- **Check API keys**: Ensure keys don't have extra spaces
- **Test connectivity**: `curl $AZURE_OPENAI_ENDPOINT`

**Issue**: No documents retrieved
- Verify Azure Search index has data
- Check `AZURE_SEARCH_INDEX_ALIAS` is correct
- Test search directly in Azure portal
- Check embedding dimensions match (3072 for text-embedding-3-large)

**Issue**: TypeScript Compilation Errors
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

**Issue**: Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process or change PORT in .env
```

## 🧪 Testing

### Using HTTP Test File

1. Open `test/multi-agent.http` in VS Code
2. Install the "REST Client" extension
3. Click "Send Request" above any `###` section

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-10-13T10:30:00.000Z",
  "version": "2.0.0-multi-agent"
}
```

## 📈 Monitoring & Observability

### Structured Logging with Pino

```typescript
{
  requestId: "uuid",
  agent: "ClassifierAgent",
  phase: "start" | "complete" | "error",
  timeMs: 234,
  input: {...},
  output: {...}
}
```

### Request Tracking

Every request gets a unique `requestId`:
- Automatically generated if not provided
- Returned in response
- Used for log correlation
- Available in `X-Request-ID` header

### Metrics to Track

1. **Latency**: Per-agent timing, end-to-end latency
2. **Accuracy**: Classification confidence, retrieval relevance scores
3. **Usage**: Requests per minute, popular categories
4. **Errors**: Error rates by agent, timeout frequency

## 🔐 Security (TODO)

- [ ] API key authentication
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] CORS configuration
- [ ] HTTPS enforcement
- [ ] Encrypt sensitive data
- [ ] Audit logging
- [ ] PII detection and redaction

## 🚀 Deployment

### Azure App Service
```bash
az webapp create --name my-rag-api --runtime "NODE:20-lts"
az webapp deployment source config-local-git
git push azure main
```

### Azure Container Apps
```bash
az containerapp create --name my-rag-api --image myregistry.azurecr.io/rag-api:latest
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## 🔄 Migration Guide

### From Legacy to Multi-Agent

1. **Parallel Run**: Deploy new API alongside old one
2. **Shadow Traffic**: Send 10% of traffic to new API
3. **Compare Results**: Validate accuracy and latency
4. **Gradual Rollout**: 10% → 50% → 100%
5. **Monitor**: Track metrics for regressions
6. **Cutover**: Switch DNS / load balancer
7. **Deprecate**: Remove old endpoint after migration period

## 🛠️ Extensibility

### Adding New Agents

1. Create agent file in `src/agents/`
2. Define input/output types in `src/types/agent-types.ts`
3. Add node to orchestrator graph
4. Add route in `src/server.ts`
5. Update tests in `test/multi-agent.http`

### Adding New Categories

1. Update enum `QuestionCategory` in `agent-types.ts`
2. Add category-specific instructions in `answerer.ts`
3. Update classification prompt
4. Test classification accuracy

### Future Enhancements

- [ ] Streaming responses for long answers
- [ ] Caching for repeated queries
- [ ] Multi-modal support (images, tables)
- [ ] Query refinement agent
- [ ] Feedback loop for answer quality
- [ ] A/B testing framework
- [ ] Batch processing API
- [ ] WebSocket support for real-time updates

## 📚 Additional Resources

- **API Tests**: `test/multi-agent.http`
- **Configuration**: `src/config.ts`
- **Type Definitions**: `src/types/agent-types.ts`
- **Legacy Documentation**: Files in `archive/` folder

## 🤝 Support

For issues:
1. Check this troubleshooting guide
2. Review environment variables: `.env`
3. Test individual agents separately
4. Check TypeScript compilation: `npm run build`

---

**Version**: 2.0.0  
**Last Updated**: October 2024  
**Architecture**: Multi-Agent RAG with TypeScript & Express.js

Happy querying! 🎉