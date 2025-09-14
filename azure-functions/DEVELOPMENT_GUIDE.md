# Azure Functions Development Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Run Locally
```bash
npm start
```

### 4. Test Functions
- **HTTP Trigger**: `GET http://localhost:7071/api/httpTrigger?name=World`
- **Blob Trigger**: Upload a file to your `docs-input` container
- **Timer Trigger**: Runs every 5 minutes automatically

## 📁 Project Structure Explained

```
azure-functions/
├── .vscode/
│   └── settings.json              # VS Code Azure Functions settings
├── src/
│   └── functions/
│       ├── ingestDocuments/       # Blob trigger for document ingestion
│       │   ├── function.json      # Function configuration
│       │   └── ingestDocuments.ts # Function implementation
│       ├── httpTrigger/           # HTTP trigger example
│       │   ├── function.json
│       │   └── httpTrigger.ts
│       └── timerTrigger/          # Timer trigger example
│           ├── function.json
│           └── timerTrigger.ts
├── test/
│   └── functions/                 # Unit tests
├── host.json                      # Runtime configuration
├── local.settings.json            # Local environment variables
└── package.json                   # Dependencies and scripts
```

## 🔧 Function Configuration (function.json)

### Blob Trigger Example
```json
{
  "bindings": [
    {
      "name": "myBlob",                    // Parameter name in function
      "type": "blobTrigger",               // Trigger type
      "direction": "in",                   // Input binding
      "path": "docs-input/{name}",         // Blob path pattern
      "connection": "AZURE_STORAGE_CONNECTION_STRING"
    }
  ],
  "scriptFile": "../../../dist/src/functions/ingestDocuments.js",
  "disabled": false
}
```

### HTTP Trigger Example
```json
{
  "bindings": [
    {
      "authLevel": "function",             // Authorization level
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",                       // Request parameter
      "methods": ["get", "post"]           // Allowed HTTP methods
    },
    {
      "type": "http",                      // Output binding
      "direction": "out",
      "name": "res"                        // Response parameter
    }
  ],
  "scriptFile": "../../../dist/src/functions/httpTrigger.js"
}
```

### Timer Trigger Example
```json
{
  "bindings": [
    {
      "name": "myTimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 */5 * * * *"          // Cron expression (every 5 minutes)
    }
  ],
  "scriptFile": "../../../dist/src/functions/timerTrigger.js"
}
```

## 📝 Function Implementation Patterns

### 1. Basic Function Structure
```typescript
import { AzureFunction, Context } from "@azure/functions";

const myFunction: AzureFunction = async (context: Context, input: any): Promise<void> => {
    context.log('Function started');
    
    try {
        // Your business logic here
        context.log('Processing...');
        
        // Set output if needed
        context.bindings.output = result;
        
    } catch (error) {
        context.log.error('Error occurred:', error);
        throw error;
    }
    
    context.log('Function completed successfully');
};

export default myFunction;
```

### 2. Error Handling
```typescript
const myFunction: AzureFunction = async (context: Context, input: any): Promise<void> => {
    try {
        // Function logic
    } catch (error) {
        // Log error details
        context.log.error('Function failed:', {
            error: error.message,
            stack: error.stack,
            input: input
        });
        
        // Re-throw to mark function as failed
        throw error;
    }
};
```

### 3. Retry Logic
```typescript
async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            
            const delay = delayMs * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

## 🔗 Common Bindings

### Input Bindings
- **blobTrigger**: File uploads to blob storage
- **httpTrigger**: HTTP requests
- **queueTrigger**: Messages from Service Bus/Storage Queue
- **timerTrigger**: Scheduled execution
- **cosmosDBTrigger**: Document changes in Cosmos DB

### Output Bindings
- **blob**: Write to blob storage
- **queue**: Send messages to queues
- **cosmosDB**: Write to Cosmos DB
- **table**: Write to Table storage
- **http**: HTTP response

### Example: Queue to Blob
```json
{
  "bindings": [
    {
      "name": "queueItem",
      "type": "queueTrigger",
      "direction": "in",
      "queueName": "process-queue"
    },
    {
      "name": "outputBlob",
      "type": "blob",
      "direction": "out",
      "path": "processed/{id}.json"
    }
  ]
}
```

## 🧪 Testing

### Unit Testing
```typescript
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import sinon from 'sinon';

describe('ingestDocuments', () => {
    let mockContext: any;
    let mockBlob: Buffer;

    beforeEach(() => {
        mockContext = {
            log: {
                info: sinon.spy(),
                error: sinon.spy()
            },
            bindingData: { name: 'test.txt' }
        };
        mockBlob = Buffer.from('test content');
    });

    it('should process blob successfully', async () => {
        // Mock external dependencies
        // Call function
        // Assert results
    });
});
```

### Integration Testing
```bash
# Test with real Azure services
npm run build
npm start

# Upload test file to blob storage
# Verify function execution in logs
```

## 🚀 Deployment

### 1. Azure CLI
```bash
# Create function app
az functionapp create \
  --resource-group myRG \
  --consumption-plan-location westeurope \
  --runtime node \
  --functions-version 4 \
  --name myFunctionApp

# Deploy
func azure functionapp publish myFunctionApp
```

### 2. VS Code Extension
1. Install "Azure Functions" extension
2. Sign in to Azure
3. Right-click function app → Deploy

### 3. GitHub Actions
```yaml
name: Deploy Azure Functions
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: Azure/functions-action@v1
        with:
          app-name: myFunctionApp
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

## 🔍 Monitoring and Debugging

### Local Debugging
1. Set breakpoints in VS Code
2. Press F5 to start debugging
3. Functions will pause at breakpoints

### Application Insights
```typescript
// Custom telemetry
context.log('Custom event', {
    customProperty: 'value',
    timestamp: new Date().toISOString()
});
```

### Logging Levels
```typescript
context.log('Info message');           // Information
context.log.warn('Warning message');   // Warning
context.log.error('Error message');    // Error
context.log.verbose('Verbose message'); // Verbose
```

## ⚡ Performance Optimization

### 1. Cold Start Reduction
```typescript
// Lazy load heavy dependencies
let heavyLibrary: any = null;

const myFunction: AzureFunction = async (context: Context) => {
    if (!heavyLibrary) {
        heavyLibrary = await import('heavy-library');
    }
    // Use heavyLibrary
};
```

### 2. Connection Pooling
```typescript
// Reuse connections
let searchClient: SearchClient | null = null;

function getSearchClient() {
    if (!searchClient) {
        searchClient = new SearchClient(endpoint, index, credential);
    }
    return searchClient;
}
```

### 3. Memory Optimization
```typescript
// Process large files in chunks
async function processLargeFile(content: string) {
    const chunkSize = 1000;
    for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        await processChunk(chunk);
    }
}
```

## 🔒 Security Best Practices

### 1. Environment Variables
```typescript
// Never hardcode secrets
const apiKey = process.env.AZURE_OPENAI_API_KEY;
if (!apiKey) {
    throw new Error('API key not configured');
}
```

### 2. Input Validation
```typescript
function validateInput(input: any) {
    if (!input || typeof input !== 'object') {
        throw new Error('Invalid input');
    }
    // Add more validation
}
```

### 3. Error Handling
```typescript
// Don't expose internal errors
try {
    // Sensitive operation
} catch (error) {
    context.log.error('Internal error:', error);
    throw new Error('Operation failed');
}
```

This guide should help you develop, test, and deploy Azure Functions effectively! 🚀
