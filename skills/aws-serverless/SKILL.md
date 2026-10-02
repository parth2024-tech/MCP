---
name: aws-serverless
description: Specialized skill for building production-ready serverless. Use when the task involves aws serverless.
  applications on AWS. Covers Lambda functions, API Gateway, DynamoDB, SQS/SNS
  event-driven patterns, SAM/CDK deployment, and cold start optimization.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# AWS Serverless

Specialized skill for building production-ready serverless applications on AWS.
Covers Lambda functions, API Gateway, DynamoDB, SQS/SNS event-driven patterns,
SAM/CDK deployment, and cold start optimization.

## Principles

- Right-size memory and timeout (measure before optimizing)
- Minimize cold starts for latency-sensitive workloads
- Use SnapStart for Java/.NET functions
- Prefer HTTP API over REST API for simple use cases
- Design for failure with DLQs and retries
- Keep deployment packages small
- Use environment variables for configuration
- Implement structured logging with correlation IDs

## Patterns

### Lambda Handler Pattern

Proper Lambda function structure with error handling

**When to use**: Any Lambda function implementation,API handlers, event processors, scheduled tasks

> See [references/details.md](references/details.md) for full code examples.


### Best_practices

- Initialize clients outside handler (reused across warm invocations)
- Always return proper API Gateway response format
- Log with structured JSON for CloudWatch Insights
- Include request ID in error logs for tracing

### API Gateway Integration Pattern

REST API and HTTP API integration with Lambda

**When to use**: Building REST APIs backed by Lambda,Need HTTP endpoints for functions

> See [references/details.md](references/details.md) for full code examples.


### Structure

project/
├── template.yaml      # SAM template
├── src/
│   ├── handlers/
│   │   ├── get.js
│   │   ├── create.js
│   │   └── delete.js
│   └── lib/
│       └── dynamodb.js
└── events/
    └── event.json     # Test events

### Api_comparison

- Http_api:
  - Lower latency (~10ms)
  - Lower cost (50-70% cheaper)
  - Simpler, fewer features
  - Best for: Most REST APIs
- Rest_api:
  - More features (caching, request validation, WAF)
  - Usage plans and API keys
  - Request/response transformation
  - Best for: Complex APIs, enterprise features

### Event-Driven SQS Pattern

Lambda triggered by SQS for reliable async processing

**When to use**: Decoupled, asynchronous processing,Need retry logic and DLQ,Processing messages in batches

> See [references/details.md](references/details.md) for full code examples.



### Best_practices

- Set VisibilityTimeout to 6x Lambda timeout
- Use ReportBatchItemFailures for partial batch failure
- Always configure a DLQ for poison messages
- Process messages idempotently

### DynamoDB Streams Pattern

React to DynamoDB table changes with Lambda

**When to use**: Real-time reactions to data changes,Cross-region replication,Audit logging, notifications

> See [references/details.md](references/details.md) for full code examples.


### Stream_view_types

- KEYS_ONLY: Only key attributes
- NEW_IMAGE: After modification
- OLD_IMAGE: Before modification
- NEW_AND_OLD_IMAGES: Both before and after

### Cold Start Optimization Pattern

Minimize Lambda cold start latency

**When to use**: Latency-sensitive applications,User-facing APIs,High-traffic functions

## 1. Optimize Package Size

```javascript
// Use modular AWS SDK v3 imports
// GOOD - only imports what you need
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

// BAD - imports entire SDK
const AWS = require('aws-sdk');  // Don't do this!
```

## 2. Use SnapStart (Java/.NET)

```yaml
# template.yaml
Resources:
  JavaFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: com.example.Handler::handleRequest
      Runtime: java21
      SnapStart:
        ApplyOn: PublishedVersions  # Enable SnapStart
      AutoPublishAlias: live
```

## 3. Right-size Memory

```yaml
# More memory = more CPU = faster init
Resources:
  FastFunction:
    Type: AWS::Serverless::Function
    Properties:
      MemorySize: 1024  # 1GB gets full vCPU
      Timeout: 30
```

## 4. Provisioned Concurrency (when needed)

```yaml
Resources:
  CriticalFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/critical.handler
      AutoPublishAlias: live

  ProvisionedConcurrency:
    Type: AWS::Lambda::ProvisionedConcurrencyConfig
    Properties:
      FunctionName: !Ref CriticalFunction
      Qualifier: live
      ProvisionedConcurrentExecutions: 5
```

## 5. Keep Init Light

```python
# GOOD - Lazy initialization
_table = None

def get_table():
    global _table
    if _table is None:
        dynamodb = boto3.resource('dynamodb')
        _table = dynamodb.Table(os.environ['TABLE_NAME'])
    return _table

def handler(event, context):
    table = get_table()  # Only initializes on first use
    # ...
```

### Optimization_priority

- 1: Reduce package size (biggest impact)
- 2: Use SnapStart for Java/.NET
- 3: Increase memory for faster init
- 4: Delay heavy imports
- 5: Provisioned concurrency (last resort)

### SAM Local Development Pattern

Local testing and debugging with SAM CLI

**When to use**: Local development and testing,Debugging Lambda functions,Testing API Gateway locally

> See [references/details.md](references/details.md) for full code examples.

```json
// events/get.json (test event)
{
  "pathParameters": {
    "id": "123"
  },
  "httpMethod": "GET",
  "path": "/items/123"
}
```

```json
// .vscode/launch.json (for debugging)
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to SAM CLI",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 5858,
      "localRoot": "${workspaceRoot}/src",
      "remoteRoot": "/var/task/src",
      "protocol": "inspector"
    }
  ]
}
```

### Commands

- Sam_build: Build Lambda deployment packages
- Sam_local_start_api: Start local API Gateway
- Sam_local_invoke: Invoke single function
- Sam_deploy: Deploy to AWS
- Sam_logs: Tail CloudWatch logs

### CDK Serverless Pattern

Infrastructure as code with AWS CDK

**When to use**: Complex infrastructure beyond Lambda,Prefer programming languages over YAML,Need reusable constructs

> See [references/details.md](references/details.md) for full code examples.

```bash
# CDK commands
npm install -g aws-cdk
cdk init app --language typescript
cdk synth    # Generate CloudFormation
cdk diff     # Show changes
cdk deploy   # Deploy to AWS
> See [references/details.md](references/details.md) for full code examples.
# Check CloudWatch Logs for INIT_REPORT
# Look for Init Duration in milliseconds

# Example log line:
# INIT_REPORT Init Duration: 423.45 ms
```

## Reduce INIT duration

```javascript
// 1. Minimize package size
// Use tree shaking, exclude dev dependencies
// npm prune --production

// 2. Lazy load heavy dependencies
let heavyLib = null;
function getHeavyLib() {
  if (!heavyLib) {
    heavyLib = require('heavy-library');
  }
  return heavyLib;
}

// 3. Use AWS SDK v3 modular imports
const { S3Client } = require('@aws-sdk/client-s3');
// NOT: const AWS = require('aws-sdk');
```

## Use SnapStart for Java/.NET

```yaml
Resources:
  JavaFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: java21
      SnapStart:
        ApplyOn: PublishedVersions
```

## Monitor cold start frequency

```javascript
// Track cold starts with custom metric
let isColdStart = true;

exports.handler = async (event) => {
  if (isColdStart) {
    console.log('COLD_START');
    // CloudWatch custom metric here
    isColdStart = false;
  }
  // ...
};
> See [references/details.md](references/details.md) for full code examples.
# template.yaml
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Timeout: 30  # Seconds (max 900)
      # Set to expected duration + buffer
```

## Implement timeout awareness

> See [references/details.md](references/details.md) for full code examples.

## Set downstream timeouts

```javascript
const axios = require('axios');

// Always set timeouts on HTTP calls
const response = await axios.get('https://api.example.com/data', {
  timeout: 5000  // 5 seconds
});
> See [references/details.md](references/details.md) for full code examples.
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      MemorySize: 1024  # MB (128-10240)
      # More memory = more CPU too
```

## Stream large data

```javascript
// BAD - loads entire file into memory
const data = await s3.getObject(params).promise();
const content = data.Body.toString();

// GOOD - stream processing
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});

const response = await s3.send(new GetObjectCommand(params));
const stream = response.Body;

// Process stream in chunks
for await (const chunk of stream) {
  await processChunk(chunk);
}
```

## Monitor memory usage

```javascript
exports.handler = async (event, context) => {
  const used = process.memoryUsage();
  console.log('Memory:', {
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB'
  });
  // ...
};
```

## Use Lambda Power Tuning

```bash
# Find optimal memory setting
# https://github.com/alexcasalboni/aws-lambda-power-tuning
> See [references/details.md](references/details.md) for full code examples.
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      VpcConfig:
        SecurityGroupIds:
          - !Ref LambdaSecurityGroup
        SubnetIds:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2  # Multiple AZs

  LambdaSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Lambda SG
      VpcId: !Ref VPC
      SecurityGroupEgress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0  # Allow HTTPS outbound
```

## Use VPC endpoints for AWS services

```yaml
# Avoid NAT Gateway for AWS service calls
DynamoDBEndpoint:
  Type: AWS::EC2::VPCEndpoint
  Properties:
    ServiceName: !Sub com.amazonaws.${AWS::Region}.dynamodb
    VpcId: !Ref VPC
    RouteTableIds:
      - !Ref PrivateRouteTable
    VpcEndpointType: Gateway

S3Endpoint:
  Type: AWS::EC2::VPCEndpoint
  Properties:
    ServiceName: !Sub com.amazonaws.${AWS::Region}.s3
    VpcId: !Ref VPC
    VpcEndpointType: Gateway
> See [references/details.md](references/details.md) for full code examples.
exports.handler = async (event, context) => {
  // Don't wait for event loop to clear
  context.callbackWaitsForEmptyEventLoop = false;

  // Your code here
  const result = await processRequest(event);

  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};
```

## Close connections properly

```javascript
// For database connections, use connection pooling
// or close connections explicitly

const mysql = require('mysql2/promise');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const connection = await mysql.createConnection({...});
  try {
    const [rows] = await connection.query('SELECT * FROM users');
    return { statusCode: 200, body: JSON.stringify(rows) };
  } finally {
    await connection.end();  // Always close
  }
};
> See [references/details.md](references/details.md) for full code examples.
// Use presigned S3 URLs instead of passing through API Gateway

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

exports.handler = async (event) => {
  const s3 = new S3Client({});

  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `uploads/${Date.now()}.file`
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl })
  };
};
```

## For large responses

> See [references/details.md](references/details.md) for full code examples.

### Infinite Loop or Recursive Invocation

Severity: HIGH

Situation: Lambda triggered by events
