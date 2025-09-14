# Azure Functions Testing Guide

## 🚀 Quick Start Testing

### 1. **Start Functions Locally**
```bash
# Build the project
npm run build

# Start the functions
func start
# OR
npm start
```

You should see output like:
```
Azure Functions Core Tools
Core Tools Version: 4.x.x
Function Runtime Version: 4.x.x

[2024-01-01 12:00:00] Host lock lease acquired by instance ID 'xxx'.
[2024-01-01 12:00:00] Starting Azure Functions runtime
[2024-01-01 12:00:00] Worker process started and initialized
[2024-01-01 12:00:00] Host started (xxx ms)
[2024-01-01 12:00:00] Job host started
Hosting environment: Production
Content root path: /path/to/your/project
Now listening on: http://0.0.0.0:7071
Application started. Press Ctrl+C to shut down.

Functions:
        httpTrigger: [GET,POST] http://localhost:7071/api/httpTrigger
        ingestDocuments: [BlobTrigger] docs-input/{name}
```

## 🧪 Testing Methods

### 1. **HTTP Trigger Testing**

#### Using curl:
```bash
# Test with query parameter
curl "http://localhost:7071/api/httpTrigger?name=World"

# Test with POST body
curl -X POST "http://localhost:7071/api/httpTrigger" \
  -H "Content-Type: application/json" \
  -d '{"name": "Azure Functions"}'

# Test without parameters
curl "http://localhost:7071/api/httpTrigger"
```

#### Using Postman:
1. **GET Request**: `http://localhost:7071/api/httpTrigger?name=World`
2. **POST Request**: `http://localhost:7071/api/httpTrigger`
   - Body: `{"name": "Azure Functions"}`
   - Content-Type: `application/json`

#### Expected Responses:
```json
// With name parameter
{
  "body": "Hello, World. This HTTP triggered function executed successfully."
}

// Without name parameter
{
  "body": "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
}
```

### 2. **Blob Trigger Testing**

#### Method 1: Azure Storage Explorer
1. Download [Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/)
2. Connect to your Azure Storage Account
3. Navigate to Blob Containers
4. Create a container named `docs-input` (if it doesn't exist)
5. Upload a `.txt` file to the container
6. Watch the function logs for processing

#### Method 2: Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Storage Account
3. Go to Containers → Create `docs-input` container
4. Upload a test file
5. Check function logs in Azure Functions

#### Method 3: Azure CLI
```bash
# Create container
az storage container create --name docs-input --account-name <your-storage-account>

# Upload test file
az storage blob upload \
  --file sample-document.txt \
  --container-name docs-input \
  --name test-document.txt \
  --account-name <your-storage-account>
```

#### Method 4: Using Azure SDK (Programmatic)
```typescript
import { BlobServiceClient } from "@azure/storage-blob";

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

const containerClient = blobServiceClient.getContainerClient("docs-input");
const blockBlobClient = containerClient.getBlockBlobClient("test.txt");

await blockBlobClient.upload("Hello World!", "Hello World!".length);
```

### 3. **Unit Testing**

#### Run Tests:
```bash
npm test
```

#### Test Structure:
```javascript
// test/functions/ingestDocuments.test.js
const { expect } = require('chai');
const { describe, it, beforeEach } = require('mocha');
const sinon = require('sinon');

describe('ingestDocuments', () => {
    it('should process blob successfully', async () => {
        // Mock context and blob data
        const mockContext = {
            log: sinon.spy(),
            triggerMetadata: { name: 'test.txt' }
        };
        const mockBlob = Buffer.from('test content');
        
        // Test your function
        // expect(result).to.be.true;
    });
});
```

## 🔍 Debugging

### 1. **Local Debugging with VS Code**
1. Install "Azure Functions" extension
2. Set breakpoints in your TypeScript files
3. Press F5 to start debugging
4. Functions will pause at breakpoints

### 2. **Logging**
```typescript
// Different log levels
context.log('Info message');
context.log.warn('Warning message');
context.log.error('Error message');

// Structured logging
context.log('Processing document', {
    filename: 'test.txt',
    size: 1024,
    timestamp: new Date().toISOString()
});
```

### 3. **Console Output**
When running locally, you'll see:
```
[2024-01-01 12:00:00] Executing 'Functions.httpTrigger' (Id=xxx, Version=xxx)
[2024-01-01 12:00:00] HTTP trigger function processed a request.
[2024-01-01 12:00:00] Executed 'Functions.httpTrigger' (Succeeded, Id=xxx, Duration=50ms)
```

## 🚨 Common Issues & Solutions

### 1. **Functions Not Starting**
```bash
# Check if Azure Functions Core Tools is installed
func --version

# Install if missing
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### 2. **Port Already in Use**
```bash
# Kill process on port 7071
lsof -ti:7071 | xargs kill -9

# Or use different port
func start --port 7072
```

### 3. **Dependencies Not Found**
```bash
# Install dependencies
npm install

# Rebuild
npm run build
```

### 4. **Environment Variables Missing**
Check `local.settings.json`:
```json
{
  "Values": {
    "AZURE_STORAGE_CONNECTION_STRING": "your_connection_string",
    "AZURE_OPENAI_ENDPOINT": "your_endpoint",
    "AZURE_OPENAI_API_KEY": "your_api_key",
    "AZURE_SEARCH_ENDPOINT": "your_search_endpoint",
    "AZURE_SEARCH_KEY": "your_search_key",
    "AZURE_SEARCH_INDEX": "docs_v2"
  }
}
```

## 📊 Monitoring & Metrics

### 1. **Local Monitoring**
- Watch console output for logs
- Check function execution times
- Monitor memory usage

### 2. **Azure Portal Monitoring**
- Go to your Function App in Azure Portal
- Navigate to "Monitor" → "Logs"
- View real-time logs and metrics

### 3. **Application Insights**
```typescript
// Custom telemetry
context.log('Custom event', {
    customProperty: 'value',
    timestamp: new Date().toISOString()
});
```

## 🎯 Testing Checklist

- [ ] Functions start without errors
- [ ] HTTP trigger responds to GET requests
- [ ] HTTP trigger responds to POST requests
- [ ] Blob trigger processes uploaded files
- [ ] Error handling works correctly
- [ ] Logging outputs expected messages
- [ ] Environment variables are loaded
- [ ] Azure services are accessible
- [ ] Documents are processed and uploaded to search index

## 🚀 Next Steps

1. **Test HTTP Trigger**: Verify basic functionality
2. **Test Blob Trigger**: Upload a test document
3. **Check Logs**: Ensure proper logging
4. **Verify Azure Integration**: Check search index for uploaded documents
5. **Add More Tests**: Expand test coverage
6. **Deploy to Azure**: Test in production environment

Happy Testing! 🎉
