# Installation Instructions

## Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Azure subscription with:
  - Azure Cognitive Search instance
  - Azure OpenAI instance
  - Azure AI ReRanker (optional)

## Step-by-Step Installation

### 1. Install Dependencies

```bash
cd api
npm install
```

This will install all required packages including:
- Express.js
- TypeScript
- Azure SDKs
- OpenAI SDK
- LangChain.js and LangGraph.js
- Zod for validation
- Pino for logging

### 2. Verify Installation

Check that packages are installed:

```bash
npm list --depth=0
```

You should see:
```
├── @azure/search-documents@12.2.0-beta.1
├── @langchain/core@0.3.x
├── @langchain/openai@0.3.x
├── langchain@0.3.x
├── langgraph@0.2.x
├── express@4.18.x
├── openai@4.x
└── ... (other packages)
```

### 3. Configure Environment

Copy the example .env file (or create one):

```bash
cp .env.example .env  # if you have an example
# OR
nano .env  # create new
```

Add your Azure credentials:

```env
# Azure Cognitive Search
AZURE_SEARCH_ENDPOINT=https://YOUR-SEARCH-SERVICE.search.windows.net
AZURE_SEARCH_KEY=YOUR-SEARCH-KEY
AZURE_SEARCH_INDEX_ALIAS=your-index-name

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://YOUR-OPENAI.openai.azure.com
AZURE_OPENAI_API_KEY=YOUR-OPENAI-KEY
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_EMBED_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4

# Azure AI ReRanker (Optional)
USE_RERANKER=true
AZURE_AI_RERANKER_ENDPOINT=https://YOUR-RERANKER.cognitiveservices.azure.com
AZURE_AI_RERANKER_KEY=YOUR-RERANKER-KEY

# Server
PORT=3000
NODE_ENV=development
SYSTEM_PROMPT=You are a helpful assistant. Answer based on provided context and cite sources.
```

### 4. Build TypeScript

```bash
npm run build
```

This compiles TypeScript files from `src/` to `dist/`.

### 5. Start the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

### 6. Verify Server is Running

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-10-13T...",
#   "version": "2.0.0-multi-agent"
# }
```

## Troubleshooting

### Issue: `Cannot find module 'langgraph'`

**Solution 1**: Run `npm install` to ensure all packages are installed.

**Solution 2**: Use the simple orchestrator (already configured):
The `server.ts` is already configured to use `orchestrator-simple.ts` which doesn't require LangGraph.

If you want to use the full LangGraph version:
```bash
npm install langgraph @langchain/core @langchain/openai
```

Then update `src/server.ts`:
```typescript
// Change this line:
import { executeRAGPipeline } from './orchestrator-simple';

// To this:
import { executeRAGPipeline } from './orchestrator';
```

### Issue: Azure Connection Errors

**Check endpoints**:
```bash
# Verify endpoints are correct
echo $AZURE_OPENAI_ENDPOINT
echo $AZURE_SEARCH_ENDPOINT

# Test connectivity
curl $AZURE_OPENAI_ENDPOINT
```

**Check API keys**:
- Ensure keys don't have extra spaces
- Keys should not be wrapped in quotes in .env
- Regenerate keys if needed from Azure Portal

### Issue: TypeScript Compilation Errors

```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

If errors persist:
```bash
# Check TypeScript version
npx tsc --version

# Should be 5.3.0 or higher
npm install typescript@latest --save-dev
```

### Issue: Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Issue: Module Resolution Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Choosing Orchestrator Version

### Simple Orchestrator (Default)
**File**: `orchestrator-simple.ts`

**Pros**:
- ✅ No additional dependencies
- ✅ Easier to understand and debug
- ✅ Faster startup time
- ✅ Works immediately after npm install

**Cons**:
- ❌ No state graph visualization
- ❌ Basic error handling
- ❌ Sequential only (no parallelization)

**Use when**:
- Getting started
- Don't need advanced orchestration features
- Want minimal dependencies

### LangGraph Orchestrator (Advanced)
**File**: `orchestrator.ts`

**Pros**:
- ✅ Advanced state management
- ✅ Conditional routing
- ✅ Built-in retries and error handling
- ✅ State graph visualization
- ✅ Parallel agent execution
- ✅ Better for complex workflows

**Cons**:
- ❌ Requires additional packages
- ❌ Slightly more complex

**Use when**:
- Production deployments
- Need advanced orchestration
- Want to extend with more agents
- Need monitoring and observability

## Next Steps

1. ✅ Installation complete
2. 📖 Read `QUICK_START.md` for usage examples
3. 🧪 Test with `test/multi-agent.http`
4. 🎨 Customize agents in `src/agents/`
5. 🚀 Deploy to Azure

## Package Scripts Reference

```json
{
  "dev": "ts-node-dev --respawn src/server.ts",
  "dev:legacy": "ts-node-dev --respawn src/user-query-server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js",
  "start:legacy": "node dist/user-query-server.js"
}
```

- `npm run dev` - Start new multi-agent server with hot reload
- `npm run dev:legacy` - Start old monolithic server
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production build (new server)
- `npm run start:legacy` - Run production build (old server)

## Support

For issues:
1. Check this troubleshooting guide
2. Review `MULTI_AGENT_README.md`
3. Check TypeScript compilation: `npm run build`
4. Verify environment variables: `.env`
5. Test individual agents separately

Happy coding! 🚀

