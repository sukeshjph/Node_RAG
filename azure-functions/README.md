# Azure Function - Document Ingestion

This Azure Function automatically ingests documents from Azure Blob Storage into Azure Cognitive Search.

## Project Structure

```
azure-functions/
├── .vscode/
│   └── settings.json
├── node_modules/
├── src/
│   ├── functions/
│   │   ├── ingestDocuments/
│   │   │   ├── function.json
│   │   │   └── ingestDocuments.ts
│   │   └── httpTrigger/
│   │       ├── function.json
│   │       └── httpTrigger.ts
│   └── samples/
│       └── sample-document.txt
├── test/
│   └── functions/
│       └── ingestDocuments.test.js
├── .funcignore
├── host.json
├── local.settings.json
├── package.json
└── tsconfig.json
```

## Features

- **Blob Trigger**: Automatically processes files uploaded to the `docs-input` container
- **HTTP Trigger**: Simple API endpoint for testing and health checks
- **Text Chunking**: Splits documents into 500-token chunks with 50-token overlap
- **Dual Embeddings**: Generates both chat vectors (3072 dims) and product vectors (768 dims)
- **Error Handling**: Includes retry logic and comprehensive error logging
- **Extensible**: Ready to be extended for PDF and other file formats

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Update `local.settings.json` with your Azure credentials:
   ```json
   {
     "Values": {
       "AZURE_STORAGE_CONNECTION_STRING": "your_storage_connection_string",
       "AZURE_OPENAI_ENDPOINT": "your_openai_endpoint",
       "AZURE_OPENAI_API_KEY": "your_openai_api_key",
       "AZURE_SEARCH_ENDPOINT": "your_search_endpoint",
       "AZURE_SEARCH_KEY": "your_search_key",
       "AZURE_SEARCH_INDEX": "docs_v2"
     }
   }
   ```

3. **Build and Run Locally**:
   ```bash
   npm run build
   npm start
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```

## Index Schema

The function populates the following fields in your search index:

- `id`: Unique identifier (filename-chunkIndex)
- `content`: Text content of the chunk
- `chatVector`: 3072-dimensional embedding for chat queries
- `productVector`: 768-dimensional embedding for product search
- `filename`: Original filename
- `category`: Document category (default: "ingested")
- `createdUtc`: Timestamp when the document was processed

## Usage

1. Upload a `.txt` file to your `docs-input` blob container
2. The function will automatically:
   - Read the file content
   - Split it into chunks
   - Generate embeddings
   - Upload to Azure Cognitive Search

## Extending for Other File Types

To add support for PDFs and other formats:

1. Add file type detection in the main function
2. Use appropriate loaders (e.g., `pdf-parse` for PDFs)
3. Extract text content before chunking
4. Update the file type validation logic

## Error Handling

The function includes:
- Retry logic with exponential backoff
- Comprehensive error logging
- Graceful handling of unsupported file types
- Timeout protection (10 minutes max)
