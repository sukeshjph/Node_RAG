# Multi-Agent RAG Architecture

## System Overview

This is a production-ready, modular RAG (Retrieval-Augmented Generation) system built with a multi-agent architecture. Each agent is a specialized component responsible for a specific task in the pipeline.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT REQUEST                                 │
│                    POST /api/ask { question }                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR LAYER                               │
│                   (orchestrator.ts / orchestrator-simple.ts)             │
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

## Agent Details

### 1. Classifier Agent
**File**: `src/agents/classifier.ts`

**Responsibilities**:
- Analyzes incoming questions
- Categorizes by domain (HR, Trading, Technical, Finance, Compliance, General)
- Determines complexity (Simple, Moderate, Complex)
- Provides confidence score and reasoning

**Technology**:
- Azure OpenAI (GPT-4)
- JSON mode for structured output
- Zod schema validation

**Output**:
```typescript
{
  category: QuestionCategory,
  complexity: QuestionComplexity,
  confidence: number,
  reasoning: string
}
```

### 2. Retriever Agent
**File**: `src/agents/retriever.ts`

**Responsibilities**:
- Generates embeddings for user query
- Performs vector search on Azure Cognitive Search
- Optionally applies Azure AI ReRanker for improved relevance
- Filters by score thresholds

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

**Output**:
```typescript
{
  documents: SearchHit[],
  metrics: {
    retrievalTimeMs: number,
    reRankingTimeMs?: number,
    totalDocuments: number
  }
}
```

### 3. Summariser Agent
**File**: `src/agents/summariser.ts`

**Responsibilities**:
- Determines if summarization is needed
- Condenses multiple documents into concise summary
- Preserves key information relevant to the question
- Handles very large document sets with map-reduce

**Triggers**:
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

**Output**:
```typescript
{
  summarizedContext: string,
  originalDocCount: number,
  tokensUsed: number,
  timeMs: number
}
```

### 4. Answerer Agent
**File**: `src/agents/answerer.ts`

**Responsibilities**:
- Generates final answer with citations
- Uses category-specific prompting
- Ensures grounded responses (only from context)
- Formats with numbered citations [1], [2], [3]

**Technology**:
- Azure OpenAI (GPT-4)
- Category-specific system prompts
- Low temperature for factual accuracy

**Category-Specific Behavior**:
- **HR**: Professional, empathetic tone
- **Trading**: Data-driven, precise with numbers
- **Technical**: Step-by-step, clear instructions
- **Finance**: Regulation-aware, numerical precision
- **Compliance**: Formal, risk-focused language
- **General**: Friendly, accessible explanations

**Output**:
```typescript
{
  answer: string,
  citations: Citation[],
  timeMs: number
}
```

## Orchestration Layers

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
**File**: `src/orchestrator.ts`

**Characteristics**:
- State graph with nodes and edges
- Conditional routing
- Built-in retries and error handling
- State persistence and visualization
- Parallel execution potential

**Flow**:
```typescript
StateGraph {
  nodes: [classify, retrieve, checkSummarization, summarise, answer]
  edges: [
    START → classify → retrieve → checkSummarization
    checkSummarization → (conditional) → summarise OR answer
    summarise → answer → END
  ]
}
```

**Best For**:
- Production deployments
- Complex workflows
- Advanced error handling
- Monitoring and observability
- Extending with more agents

## API Layer

### Modular Endpoints

#### Individual Agents
- `POST /api/classify` - Classification only
- `POST /api/retrieve` - Retrieval only
- `POST /api/summarise` - Summarization only
- `POST /api/answer` - Answer generation only

**Use Cases**:
- Custom workflows
- Testing individual agents
- A/B testing
- Performance benchmarking
- Building alternative pipelines

#### Orchestrated Pipeline
- `POST /api/ask` - Full pipeline (⭐ Recommended)

**Use Cases**:
- Production queries
- End-to-end RAG
- Automatic optimization
- Consistent experience

#### Legacy Endpoint
- `POST /query` - Original monolithic endpoint

**Use Cases**:
- Backwards compatibility
- Migration period
- Side-by-side comparison

## Data Flow

### Request Processing

```
1. REQUEST ARRIVES
   ├─ Extract question, options, requestId
   ├─ Validate with Zod schema
   └─ Generate requestId if not provided

2. CLASSIFICATION PHASE
   ├─ Send question to GPT-4
   ├─ Parse JSON response
   ├─ Validate with Zod
   └─ Extract category, complexity, confidence

3. RETRIEVAL PHASE
   ├─ Generate query embedding (3072D)
   ├─ Vector search (cosine similarity)
   ├─ Fetch top-K candidates
   ├─ Optional: ReRank with Azure AI
   └─ Return sorted documents

4. SUMMARIZATION CHECK
   ├─ Count documents
   ├─ Check complexity
   ├─ Estimate tokens
   └─ Decide: summarize or skip

5. SUMMARIZATION PHASE (if needed)
   ├─ Build summarization prompt
   ├─ Call GPT-4 with context
   ├─ Extract summary
   └─ Track tokens and timing

6. ANSWER GENERATION PHASE
   ├─ Build category-specific system prompt
   ├─ Format context (docs or summary)
   ├─ Generate grounded answer
   ├─ Extract citations
   └─ Validate response

7. RESPONSE
   ├─ Combine answer + citations
   ├─ Add metadata (category, complexity, metrics)
   ├─ Include requestId for tracking
   └─ Return JSON response
```

## State Management

### Agent State (Shared across agents)

```typescript
interface AgentState {
  // Input
  question: string;
  maxResults?: number;
  includeText?: boolean;
  requestId: string;
  
  // Classification
  category?: QuestionCategory;
  complexity?: QuestionComplexity;
  
  // Retrieval
  documents?: SearchHit[];
  retrievalMetrics?: {...};
  
  // Summarization
  needsSummarization?: boolean;
  summarizedContext?: string;
  summarizationTimeMs?: number;
  
  // Answer
  answer?: string;
  citations?: Citation[];
  answerTimeMs?: number;
  
  // Meta
  error?: string;
  retryCount?: number;
  startTime: number;
  totalTimeMs?: number;
}
```

## Error Handling

### Agent-Level Errors
- Each agent has try-catch with logging
- Errors logged with requestId for correlation
- Graceful fallbacks where possible

### Orchestrator-Level Errors
- Catches agent failures
- Provides context in error messages
- Returns 500 with requestId for debugging

### Validation Errors
- Zod schema validation on all inputs
- Returns 400 with detailed error messages
- Prevents invalid data from reaching agents

## Logging

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

### Log Levels
- **DEBUG**: Development mode, all details
- **INFO**: Agent starts, completions, metrics
- **ERROR**: Failures, exceptions, stack traces

### Correlation
- Every request has a unique `requestId`
- Passed through all agents
- Available in response headers
- Used for log aggregation

## Performance

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

## Security

### API Security (TODO)
- [ ] API key authentication
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] CORS configuration
- [ ] HTTPS enforcement

### Data Security
- [ ] Encrypt sensitive data
- [ ] Audit logging
- [ ] PII detection and redaction
- [ ] Access control per category

## Extensibility

### Adding New Agents

1. **Create Agent File**: `src/agents/new-agent.ts`
2. **Define Types**: Add to `src/types/agent-types.ts`
3. **Implement Logic**: Follow existing agent patterns
4. **Add to Orchestrator**: Update workflow
5. **Add Route**: Optional standalone endpoint
6. **Add Tests**: Create test cases
7. **Update Docs**: Document new agent

### Adding New Categories

1. **Update Enum**: `QuestionCategory` in `agent-types.ts`
2. **Add Prompt**: Category-specific instructions in `answerer.ts`
3. **Update Classifier**: Add to classification prompt
4. **Test**: Verify classification accuracy

### Adding New Features

- **Query refinement**: Agent to improve questions
- **Multi-turn conversations**: Maintain context
- **Feedback loop**: Learn from user feedback
- **A/B testing**: Compare different strategies
- **Caching layer**: Redis for frequent queries
- **Monitoring**: Application Insights integration

## Monitoring & Observability

### Metrics to Track

1. **Latency**:
   - Per-agent timing
   - End-to-end latency
   - P50, P95, P99 percentiles

2. **Accuracy**:
   - Classification confidence
   - Retrieval relevance scores
   - User feedback ratings

3. **Usage**:
   - Requests per minute
   - Popular categories
   - Summarization trigger rate

4. **Errors**:
   - Error rates by agent
   - Timeout frequency
   - Retry counts

### Recommended Tools

- **Application Insights**: Azure-native monitoring
- **Pino + ELK**: Log aggregation and search
- **Grafana**: Custom dashboards
- **Prometheus**: Metrics collection

## Deployment

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

## Testing Strategy

### Unit Tests (per agent)
```typescript
describe('ClassifierAgent', () => {
  it('should classify HR questions correctly', async () => {
    const result = await classifyQuestion('What is our vacation policy?', 'test-id');
    expect(result.category).toBe(QuestionCategory.HR);
  });
});
```

### Integration Tests (orchestrator)
```typescript
describe('Orchestrator', () => {
  it('should handle end-to-end flow', async () => {
    const result = await executeRAGPipeline('test question', {}, 'test-id');
    expect(result.answer).toBeDefined();
    expect(result.citations.length).toBeGreaterThan(0);
  });
});
```

### Load Tests
```bash
# Apache Bench
ab -n 1000 -c 10 -p payload.json -T application/json http://localhost:3000/api/ask

# K6
k6 run load-test.js
```

## Migration Guide

### From Legacy to Multi-Agent

1. **Parallel Run**: Deploy new API alongside old one
2. **Shadow Traffic**: Send 10% of traffic to new API
3. **Compare Results**: Validate accuracy and latency
4. **Gradual Rollout**: 10% → 50% → 100%
5. **Monitor**: Track metrics for regressions
6. **Cutover**: Switch DNS / load balancer
7. **Deprecate**: Remove old endpoint after migration period

---

**Version**: 2.0.0  
**Last Updated**: October 2024  
**Architecture**: Multi-Agent RAG with LangChain.js

