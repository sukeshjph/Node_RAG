# Azure Functions Debugging Guide

## 🚀 How to Debug Blob Trigger Functions

### **Step 1: Start Functions Locally**

```bash
# Build the project first
npm run build

# Start functions with verbose logging
func start --verbose
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

Functions:
        httpTrigger: [GET,POST] http://localhost:7071/api/httpTrigger
        ingestDocuments: [BlobTrigger] docs-input/{name}
```

### **Step 2: Test HTTP Trigger First**

```bash
# Test the HTTP trigger to make sure functions are working
curl "http://localhost:7071/api/httpTrigger?name=Test"
```

Expected response:
```json
{
  "body": "Hello, Test. This HTTP triggered function executed successfully."
}
```

### **Step 3: Debug Blob Trigger**

#### **Method 1: VS Code Debugging (Recommended)**

1. **Set Breakpoints** in `src/functions/ingestDocuments.ts`:
   ```typescript
   export async function ingestDocuments(myBlob: Buffer, context: InvocationContext): Promise<void> {
       const filename = context.triggerMetadata?.name as string; // <- BREAKPOINT HERE
       console.log(`🚀 Blob trigger function processed blob: ${blobName}`); // <- BREAKPOINT HERE
   ```

2. **Start Functions in Debug Mode**:
   ```bash
   func start --javascript --inspect
   ```

3. **Attach VS Code Debugger**:
   - Press `F5` in VS Code
   - Or go to Run → Start Debugging
   - Select "Attach to Node Functions"

4. **Upload a file to trigger the function** (see Step 4)

#### **Method 2: Console Logging (Easiest)**

The function already has detailed logging. When you upload a file, you'll see:
```
[2024-01-01 12:00:00] Executing 'Functions.ingestDocuments' (Id=xxx, Version=xxx)
🚀 Blob trigger function processed blob: docs-input/test.txt
📄 Filename: test.txt
📦 Blob size: 1024 bytes
⏰ Timestamp: 2024-01-01T12:00:00.000Z
📄 File: test.txt - Split into 3 chunks
✅ Processed chunk 1/3 for test.txt
✅ Processed chunk 2/3 for test.txt
✅ Processed chunk 3/3 for test.txt
🔄 Generated 3 document chunks with embeddings
📤 Successfully uploaded 3 documents to search index
✅ Successfully processed file: test.txt
[2024-01-01 12:00:00] Executed 'Functions.ingestDocuments' (Succeeded, Id=xxx, Duration=5000ms)
```

### **Step 4: Upload Test Files**

#### **Option A: Azure Portal (Easiest)**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Storage Account (`aistoragesuku`)
3. Go to Containers → Create `docs-input` container (if it doesn't exist)
4. Upload a `.txt` file
5. Watch the function logs

#### **Option B: Azure Storage Explorer**
1. Download [Azure Storage Explorer](https://azure.microsoft.com/en-us/features/storage-explorer/)
2. Connect to your storage account
3. Navigate to Blob Containers
4. Create `docs-input` container
5. Upload a test file

#### **Option C: Azure CLI**
```bash
# Create container
az storage container create --name docs-input --account-name aistoragesuku

# Upload test file
az storage blob upload \
  --file sample-document.txt \
  --container-name docs-input \
  --name test-document.txt \
  --account-name aistoragesuku
```

#### **Option D: Programmatic Upload**
```typescript
import { BlobServiceClient } from "@azure/storage-blob";

const blobServiceClient = BlobServiceClient.fromConnectionString(
  "DefaultEndpointsProtocol=https;AccountName=aistoragesuku;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net"
);

const containerClient = blobServiceClient.getContainerClient("docs-input");
const blockBlobClient = containerClient.getBlockBlobClient("test.txt");

await blockBlobClient.upload("Hello World!", "Hello World!".length);
```

### **Step 5: Monitor Function Execution**

#### **Real-time Logs**
Watch the terminal where you started `func start` for:
- Function execution start/end
- Console.log outputs
- Error messages
- Performance metrics

#### **Azure Portal Monitoring**
1. Go to your Function App in Azure Portal
2. Navigate to "Monitor" → "Logs"
3. View real-time logs and metrics

### **Step 6: Verify Results**

#### **Check Azure Search**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Search Service
3. Go to "Search Explorer"
4. Query your index to see uploaded documents

#### **Check Function Logs**
Look for these success indicators:
```
✅ Successfully processed file: test.txt
📤 Successfully uploaded 3 documents to search index
```

## 🔍 Common Debugging Issues

### **1. Functions Not Starting**
```bash
# Check if all dependencies are installed
npm install

# Rebuild the project
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### **2. Blob Trigger Not Firing**
- Ensure the container name is exactly `docs-input`
- Check that the file is a `.txt` file
- Verify the storage connection string is correct
- Check function logs for errors

### **3. Azure Services Not Accessible**
- Verify all environment variables in `local.settings.json`
- Check Azure service status
- Ensure your IP is not blocked by firewall rules

### **4. Embedding Generation Fails**
- Check OpenAI API key and endpoint
- Verify the deployment name is correct
- Check rate limits and quotas

## 🎯 Debugging Checklist

- [ ] Functions start without errors
- [ ] HTTP trigger works
- [ ] Storage connection is established
- [ ] Blob container `docs-input` exists
- [ ] Test file upload triggers function
- [ ] Function logs show processing steps
- [ ] Documents appear in Azure Search
- [ ] No errors in function execution

## 🚀 Next Steps

1. **Start with HTTP trigger** to verify basic functionality
2. **Upload a small test file** to trigger blob function
3. **Watch the logs** for processing steps
4. **Check Azure Search** for uploaded documents
5. **Add more logging** if needed for specific debugging

Happy Debugging! 🎉
