# Quick Start Guide - Multi-Agent RAG API 🚀

## Setup in 5 Minutes

### 1. Install Dependencies

```bash
cd api
npm install
```

This will install:
- Express.js for the API server
- LangChain.js and LangGraph.js for orchestration
- Azure SDK for Search and OpenAI
- TypeScript and dev tools

### 2. Configure Environment

Create a `.env` file in the `/api` directory:

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

# Or legacy server (backwards compatible)
npm run dev:legacy
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

#### Option A: Using cURL

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

#### Option B: Using the HTTP Test File

1. Open `test/multi-agent.http` in VS Code
2. Install the "REST Client" extension
3. Click "Send Request" above any `###` section

#### Option C: Using Postman

Import the following:

**POST** `http://localhost:3000/api/ask`

**Headers**:
```
Content-Type: application/json
```

**Body** (JSON):
```json
{
  "question": "What are our HR benefits?",
  "maxResults": 10,
  "includeText": false
}
```

### 5. Expected Response

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

## Understanding the Response

### Answer
The AI-generated response based on your document corpus.

### Citations
Array of source documents used to generate the answer:
- `id`: Unique document identifier
- `filename`: Source file name
- `category`: Document category (hr, trading, technical, etc.)
- `score`: Relevance score (0.0-1.0)
- `snippet`: Optional text preview (if `includeText: true`)

### Metadata
Insights into how the question was processed:
- `category`: Classified question category
- `complexity`: Question complexity level
- `documentsRetrieved`: Number of documents fetched
- `usedSummarization`: Whether documents were summarized
- `metrics`: Detailed timing breakdown

## API Endpoints Overview

### 🎯 Recommended: `/api/ask`
**Full orchestrated pipeline** - Use this for production.

Automatically:
1. Classifies your question
2. Retrieves relevant documents
3. Summarizes if needed
4. Generates answer with citations

### 🔧 Individual Agents (for custom workflows)

- **`/api/classify`** - Just classify the question
- **`/api/retrieve`** - Just retrieve documents
- **`/api/summarise`** - Just summarize documents
- **`/api/answer`** - Just generate an answer (needs docs or summary)

### 🔄 Legacy: `/query`
Original monolithic endpoint for backwards compatibility.

## Common Use Cases

### 1. Simple Question-Answering

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I reset my password?"}'
```

### 2. Complex Multi-Part Questions

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain our entire benefits package including health insurance, retirement, and time off policies",
    "maxResults": 15,
    "includeText": true
  }'
```

This will automatically:
- Retrieve more documents (15)
- Detect complexity as "complex"
- Trigger summarization
- Generate comprehensive answer

### 3. Custom Workflow

```bash
# Step 1: Classify
curl -X POST http://localhost:3000/api/classify \
  -d '{"question": "Your question here"}'

# Step 2: Retrieve with category filtering
curl -X POST http://localhost:3000/api/retrieve \
  -d '{"question": "Your question", "maxResults": 10}'

# Step 3: Generate answer
curl -X POST http://localhost:3000/api/answer \
  -d '{"question": "Your question", "documents": [...]}'
```

## Monitoring & Debugging

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

### Request Tracking

Every request gets a unique `requestId`:
- Automatically generated if not provided
- Returned in response
- Used for log correlation
- Available in `X-Request-ID` header

```bash
# Provide your own request ID
curl -X POST http://localhost:3000/api/ask \
  -H "X-Request-ID: my-custom-id-123" \
  -d '{"question": "..."}'
```

### Logs

Development mode shows detailed, colorized logs:

```
[10:30:00.123] INFO: 🎭 Orchestrator - Starting orchestration
    requestId: "abc-123"
    question: "What is our vacation policy?"

[10:30:00.234] INFO: 🤖 ClassifierAgent - Starting
    agent: "ClassifierAgent"
    phase: "start"

[10:30:00.468] INFO: ✅ ClassifierAgent - Completed in 234ms
    category: "hr"
    complexity: "simple"

[10:30:00.624] INFO: 🤖 RetrieverAgent - Starting
[10:30:00.780] INFO: ✅ RetrieverAgent - Completed in 156ms
    documentsFound: 8

[10:30:01.347] INFO: ✅ AnswererAgent - Completed in 567ms
[10:30:01.350] INFO: 🎭 Orchestrator - Orchestration completed
    totalTimeMs: 1227
```

## Next Steps

1. **Customize Agents**: Modify prompts in `/src/agents/` to fit your domain
2. **Add Categories**: Update `QuestionCategory` enum in `/src/types/agent-types.ts`
3. **Tune Performance**: Adjust `k` values, reranker settings, summarization thresholds
4. **Add Authentication**: Implement JWT or API key validation
5. **Deploy**: Build with `npm run build` and deploy to Azure App Service or Container Apps

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=3001
```

### Azure Connection Errors
```bash
# Verify endpoints
echo $AZURE_OPENAI_ENDPOINT
echo $AZURE_SEARCH_ENDPOINT

# Test connectivity
curl $AZURE_OPENAI_ENDPOINT
```

### No Documents Found
- Check your search index has data
- Verify `AZURE_SEARCH_INDEX_ALIAS` is correct
- Test search in Azure Portal
- Check embedding dimensions match (3072 for text-embedding-3-large)

### Slow Responses
- Enable ReRanker only if needed
- Reduce `maxResults` for faster retrieval
- Lower summarization `maxTokens`
- Check network latency to Azure

## Support

- Documentation: See `MULTI_AGENT_README.md`
- API Tests: See `test/multi-agent.http`
- Configuration: See `src/config.ts`

Happy querying! 🎉

