# Azure Functions Primer for .NET Developers

## 🎯 Overview

Azure Functions is Microsoft's serverless compute platform, similar to AWS Lambda but with some key differences. Since you know .NET Azure Functions and AWS Lambda, this guide will help you understand the JavaScript/TypeScript ecosystem.

## 📊 Platform Comparison

| Feature | Azure Functions (.NET) | Azure Functions (Node.js) | AWS Lambda |
|---------|----------------------|---------------------------|------------|
| **Runtime** | .NET 6/7/8 | Node.js 18/20 | Node.js, Python, Java, .NET, etc. |
| **Entry Point** | `static` methods | `module.exports` or `export default` | `exports.handler` |
| **Configuration** | `function.json` + attributes | `function.json` | `serverless.yml` or console |
| **Triggers** | Attributes + bindings | `function.json` bindings | Event sources |
| **Cold Start** | ~100-500ms | ~50-200ms | ~100-300ms |
| **Pricing** | Pay per execution | Pay per execution | Pay per execution + duration |

## 🏗️ Project Structure Comparison

### Azure Functions (.NET)
```
MyFunctionApp/
├── MyFunctionApp.csproj
├── local.settings.json
├── host.json
└── Functions/
    ├── HttpTriggerFunction.cs
    └── BlobTriggerFunction.cs
```

### Azure Functions (Node.js/TypeScript) - What We Built
```
azure-functions/
├── package.json
├── tsconfig.json
├── local.settings.json
├── host.json
└── src/
    └── functions/
        └── ingestDocuments/
            ├── function.json
            └── ingestDocuments.ts
```

### AWS Lambda (for comparison)
```
my-lambda/
├── package.json
├── serverless.yml
├── handler.js
└── events/
    └── s3-trigger.json
```

## 🔧 Key Concepts

### 1. Function App vs Individual Functions

**Azure Functions (.NET):**
```csharp
public static class MyFunctions
{
    [FunctionName("HttpTrigger")]
    public static async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequest req)
    {
        // Function logic
    }
}
```

**Azure Functions (Node.js):**
```typescript
import { AzureFunction, Context } from "@azure/functions";

const httpTrigger: AzureFunction = async (context: Context, req: any): Promise<void> => {
    // Function logic
};

export default httpTrigger;
```

### 2. Triggers and Bindings

#### Azure Functions (.NET) - Attributes
```csharp
[FunctionName("BlobTrigger")]
public static void Run([BlobTrigger("samples/{name}")] Stream myBlob, string name)
{
    // Process blob
}
```

#### Azure Functions (Node.js) - function.json
```json
{
  "bindings": [
    {
      "name": "myBlob",
      "type": "blobTrigger",
      "direction": "in",
      "path": "samples/{name}",
      "connection": "AzureWebJobsStorage"
    }
  ]
}
```

#### AWS Lambda - Event Sources
```javascript
exports.handler = async (event) => {
    // S3 event structure
    const records = event.Records;
    for (const record of records) {
        // Process S3 object
    }
};
```

## 🚀 Common Triggers

### 1. HTTP Trigger

**Azure Functions (.NET):**
```csharp
[HttpTrigger(AuthorizationLevel.Function, "get", "post")]
```

**Azure Functions (Node.js):**
```json
{
  "type": "httpTrigger",
  "direction": "in",
  "name": "req",
  "methods": ["get", "post"]
}
```

**AWS Lambda (API Gateway):**
```javascript
// Handled by API Gateway integration
exports.handler = async (event) => {
    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Hello World' })
    };
};
```

### 2. Blob Storage Trigger

**Azure Functions (.NET):**
```csharp
[BlobTrigger("container/{name}")]
```

**Azure Functions (Node.js):**
```json
{
  "type": "blobTrigger",
  "path": "container/{name}",
  "connection": "AzureWebJobsStorage"
}
```

**AWS Lambda (S3):**
```javascript
exports.handler = async (event) => {
    // Process S3 event
    const bucket = event.Records[0].s3.bucket.name;
    const key = event.Records[0].s3.object.key;
};
```

### 3. Timer Trigger

**Azure Functions (.NET):**
```csharp
[TimerTrigger("0 */5 * * * *")] // Every 5 minutes
```

**Azure Functions (Node.js):**
```json
{
  "type": "timerTrigger",
  "schedule": "0 */5 * * * *"
}
```

**AWS Lambda (EventBridge/CloudWatch):**
```javascript
// Triggered by EventBridge rule
exports.handler = async (event) => {
    // Cron: 0 */5 * * * *
};
```

## 🔄 Input/Output Bindings

### Azure Functions (.NET)
```csharp
[FunctionName("ProcessOrder")]
public static async Task Run(
    [QueueTrigger("orders")] Order order,
    [Blob("processed-orders/{id}.json")] Stream output)
{
    // Process order and write to blob
}
```

### Azure Functions (Node.js)
```json
{
  "bindings": [
    {
      "name": "order",
      "type": "queueTrigger",
      "direction": "in",
      "queueName": "orders"
    },
    {
      "name": "output",
      "type": "blob",
      "direction": "out",
      "path": "processed-orders/{id}.json"
    }
  ]
}
```

### AWS Lambda
```javascript
// Manual SDK calls
const s3 = new AWS.S3();
const sqs = new AWS.SQS();

exports.handler = async (event) => {
    // Process SQS message
    const order = JSON.parse(event.Records[0].body);
    
    // Write to S3
    await s3.putObject({
        Bucket: 'processed-orders',
        Key: `${order.id}.json`,
        Body: JSON.stringify(order)
    }).promise();
};
```

## 🛠️ Development Workflow

### 1. Local Development

**Azure Functions (.NET):**
```bash
func start
# Functions run on http://localhost:7071
```

**Azure Functions (Node.js):**
```bash
npm run build
npm start
# Functions run on http://localhost:7071
```

**AWS Lambda:**
```bash
serverless offline
# Functions run on http://localhost:3000
```

### 2. Testing

**Azure Functions (.NET):**
```csharp
[Test]
public async Task TestHttpTrigger()
{
    var request = new Mock<HttpRequest>();
    var logger = new Mock<ILogger>();
    
    var result = await HttpTrigger.Run(request.Object, logger.Object);
    Assert.IsInstanceOf<OkObjectResult>(result);
}
```

**Azure Functions (Node.js):**
```javascript
const { expect } = require('chai');
const sinon = require('sinon');

describe('ingestDocuments', () => {
    it('should process blob successfully', async () => {
        const mockContext = { log: { info: sinon.spy() } };
        const mockBlob = Buffer.from('test content');
        
        await ingestDocuments(mockContext, mockBlob);
        
        expect(mockContext.log.info.called).to.be.true;
    });
});
```

**AWS Lambda:**
```javascript
const { handler } = require('./handler');

describe('Lambda Function', () => {
    it('should process S3 event', async () => {
        const event = {
            Records: [{
                s3: {
                    bucket: { name: 'test-bucket' },
                    object: { key: 'test-file.txt' }
                }
            }]
        };
        
        const result = await handler(event);
        expect(result.statusCode).to.equal(200);
    });
});
```

## 🔧 Configuration Management

### Azure Functions (.NET)
```csharp
// local.settings.json
{
  "Values": {
    "MySetting": "value"
  }
}

// In code
var setting = Environment.GetEnvironmentVariable("MySetting");
```

### Azure Functions (Node.js)
```javascript
// local.settings.json
{
  "Values": {
    "MySetting": "value"
  }
}

// In code
const setting = process.env.MySetting;
```

### AWS Lambda
```javascript
// Environment variables in Lambda console or serverless.yml
const setting = process.env.MY_SETTING;
```

## 📦 Package Management

### Azure Functions (.NET)
```xml
<PackageReference Include="Microsoft.Azure.WebJobs.Extensions.Storage" Version="5.0.0" />
<PackageReference Include="Microsoft.Azure.WebJobs.Extensions.ServiceBus" Version="5.0.0" />
```

### Azure Functions (Node.js)
```json
{
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "@azure/storage-blob": "^12.0.0",
    "@azure/service-bus": "^7.0.0"
  }
}
```

### AWS Lambda
```json
{
  "dependencies": {
    "aws-sdk": "^2.1000.0",
    "serverless": "^3.0.0"
  }
}
```

## 🚀 Deployment

### Azure Functions (.NET)
```bash
# Azure CLI
az functionapp create --resource-group myRG --consumption-plan-location westeurope --runtime dotnet --functions-version 4 --name myFunctionApp

# Deploy
func azure functionapp publish myFunctionApp
```

### Azure Functions (Node.js)
```bash
# Same as .NET
func azure functionapp publish myFunctionApp
```

### AWS Lambda
```bash
# Serverless Framework
serverless deploy

# AWS CLI
aws lambda create-function --function-name myFunction --runtime nodejs18.x --handler index.handler --zip-file fileb://function.zip
```

## 🔍 Monitoring and Logging

### Azure Functions (.NET)
```csharp
public static async Task Run([TimerTrigger("0 */5 * * * *")] TimerInfo myTimer, ILogger log)
{
    log.LogInformation($"C# Timer trigger function executed at: {DateTime.Now}");
}
```

### Azure Functions (Node.js)
```typescript
const httpTrigger: AzureFunction = async (context: Context, req: any): Promise<void> => {
    context.log('HTTP trigger function processed a request.');
    context.log.info('This is an info log');
    context.log.error('This is an error log');
};
```

### AWS Lambda
```javascript
exports.handler = async (event) => {
    console.log('Lambda function executed');
    console.info('This is an info log');
    console.error('This is an error log');
};
```

## 🎯 Best Practices

### 1. Cold Start Optimization
- **Azure Functions**: Use connection pooling, avoid heavy imports
- **AWS Lambda**: Use provisioned concurrency for critical functions

### 2. Error Handling
- **Azure Functions**: Use retry policies in `host.json`
- **AWS Lambda**: Use Dead Letter Queues (DLQ)

### 3. Security
- **Azure Functions**: Use Managed Identity, Key Vault
- **AWS Lambda**: Use IAM roles, AWS Secrets Manager

### 4. Performance
- **Azure Functions**: Optimize bundle size, use streaming for large payloads
- **AWS Lambda**: Optimize memory allocation, use Lambda layers

## 🔄 Migration Patterns

### From .NET Azure Functions to Node.js
1. Convert C# classes to TypeScript modules
2. Replace attributes with `function.json` bindings
3. Update logging from `ILogger` to `Context.log`
4. Convert dependency injection to manual instantiation

### From AWS Lambda to Azure Functions
1. Replace `exports.handler` with `AzureFunction` type
2. Convert event sources to triggers
3. Replace AWS SDK calls with Azure SDK calls
4. Update configuration management

This primer should give you a solid foundation for working with Azure Functions in Node.js/TypeScript while leveraging your existing .NET and AWS Lambda experience! 🚀
