# Aws Serverless — Code Reference

## ### Lambda Handler Pattern

```javascript
// Node.js Lambda Handler
// handler.js

// Initialize outside handler (reused across invocations)
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Handler function
exports.handler = async (event, context) => {
  // Optional: Don't wait for event loop to clear (Node.js)
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Parse input based on event source
    const body = typeof event.body === 'string'
      ? JSON.parse(event.body)
      : event.body;

    // Business logic
    const result = await processRequest(body);

    // Return API Gateway compatible response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', JSON.stringify({
      error: error.message,
      stack: error.stack,
      requestId: context.awsRequestId
    }));

    return {
      statusCode: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message || 'Internal server error'
      })
    };
  }
};

async function processRequest(data) {
  // Your business logic here
  const result = await docClient.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { id: data.id }
  }));
  return result.Item;
}
```


```python
# Python Lambda Handler
# handler.py

import json
import os
import logging
import boto3
from botocore.exceptions import ClientError

# Initialize outside handler (reused across invocations)
logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def handler(event, context):
    try:
        # Parse input
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})

        # Business logic
        result = process_request(body)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }

    except ClientError as e:
        logger.error(f"DynamoDB error: {e.response['Error']['Message']}")
        return error_response(500, 'Database error')

    except json.JSONDecodeError:
        return error_response(400, 'Invalid JSON')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error_response(500, 'Internal server error')

def process_request(data):
    response = table.get_item(Key={'id': data['id']})
    return response.get('Item')

def error_response(status_code, message):
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'error': message})
    }
```


## ### API Gateway Integration Pattern

```yaml
# template.yaml (SAM)
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    MemorySize: 256
    Environment:
      Variables:
        TABLE_NAME: !Ref ItemsTable

Resources:
  # HTTP API (recommended for simple use cases)
  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: prod
      CorsConfiguration:
        AllowOrigins:
          - "*"
        AllowMethods:
          - GET
          - POST
          - DELETE
        AllowHeaders:
          - "*"

  # Lambda Functions
  GetItemFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/get.handler
      Events:
        GetItem:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Path: /items/{id}
            Method: GET
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref ItemsTable

  CreateItemFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/create.handler
      Events:
        CreateItem:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Path: /items
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ItemsTable

  # DynamoDB Table
  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST

Outputs:
  ApiUrl:
    Value: !Sub "https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com/prod"
```


```javascript
// src/handlers/get.js
const { getItem } = require('../lib/dynamodb');

exports.handler = async (event) => {
  const id = event.pathParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing id parameter' })
    };
  }

  const item = await getItem(id);

  if (!item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Item not found' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(item)
  };
};
```


## ### Event-Driven SQS Pattern

```yaml
# template.yaml
Resources:
  ProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/processor.handler
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt ProcessingQueue.Arn
            BatchSize: 10
            FunctionResponseTypes:
              - ReportBatchItemFailures  # Partial batch failure handling

  ProcessingQueue:
    Type: AWS::SQS::Queue
    Properties:
      VisibilityTimeout: 180  # 6x Lambda timeout
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
        maxReceiveCount: 3

  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      MessageRetentionPeriod: 1209600  # 14 days
```


```javascript
// src/handlers/processor.js
exports.handler = async (event) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      await processMessage(body);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);
      // Report this item as failed (will be retried)
      batchItemFailures.push({
        itemIdentifier: record.messageId
      });
    }
  }

  // Return failed items for retry
  return { batchItemFailures };
};

async function processMessage(message) {
  // Your processing logic
  console.log('Processing:', message);

  // Simulate work
  await saveToDatabase(message);
}
```


```python
# Python version
import json
import logging

logger = logging.getLogger()

def handler(event, context):
    batch_item_failures = []

    for record in event['Records']:
        try:
            body = json.loads(record['body'])
            process_message(body)
        except Exception as e:
            logger.error(f"Failed to process {record['messageId']}: {e}")
            batch_item_failures.append({
                'itemIdentifier': record['messageId']
            })

    return {'batchItemFailures': batch_item_failures}
```


## ### DynamoDB Streams Pattern

```yaml
# template.yaml
Resources:
  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: items
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES

  StreamProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/stream.handler
      Events:
        Stream:
          Type: DynamoDB
          Properties:
            Stream: !GetAtt ItemsTable.StreamArn
            StartingPosition: TRIM_HORIZON
            BatchSize: 100
            MaximumRetryAttempts: 3
            DestinationConfig:
              OnFailure:
                Destination: !GetAtt StreamDLQ.Arn

  StreamDLQ:
    Type: AWS::SQS::Queue
```


```javascript
// src/handlers/stream.js
exports.handler = async (event) => {
  for (const record of event.Records) {
    const eventName = record.eventName;  // INSERT, MODIFY, REMOVE

    // Unmarshall DynamoDB format to plain JS objects
    const newImage = record.dynamodb.NewImage
      ? unmarshall(record.dynamodb.NewImage)
      : null;
    const oldImage = record.dynamodb.OldImage
      ? unmarshall(record.dynamodb.OldImage)
      : null;

    console.log(`${eventName}: `, { newImage, oldImage });

    switch (eventName) {
      case 'INSERT':
        await handleInsert(newImage);
        break;
      case 'MODIFY':
        await handleModify(oldImage, newImage);
        break;
      case 'REMOVE':
        await handleRemove(oldImage);
        break;
    }
  }
};

// Use AWS SDK v3 unmarshall
const { unmarshall } = require('@aws-sdk/util-dynamodb');
```


## ### SAM Local Development Pattern

```bash
# Install SAM CLI
pip install aws-sam-cli

# Initialize new project
sam init --runtime nodejs20.x --name my-api

# Build the project
sam build

# Run locally
sam local start-api

# Invoke single function
sam local invoke GetItemFunction --event events/get.json

# Local debugging (Node.js with VS Code)
sam local invoke --debug-port 5858 GetItemFunction

# Deploy
sam deploy --guided
```


## ### CDK Serverless Pattern

```typescript
// lib/api-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'ItemsTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev only
    });

    // Lambda Function
    const getItemFn = new lambda.Function(this, 'GetItemFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'get.handler',
      code: lambda.Code.fromAsset('src/handlers'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions
    table.grantReadData(getItemFn);

    // API Gateway
    const api = new apigateway.RestApi(this, 'ItemsApi', {
      restApiName: 'Items Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const items = api.root.addResource('items');
    const item = items.addResource('{id}');

    item.addMethod('GET', new apigateway.LambdaIntegration(getItemFn));

    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}
```


## # CDK commands

```

## Sharp Edges

### Cold Start INIT Phase Now Billed (Aug 2025)

Severity: HIGH

Situation: Running Lambda functions in production

Symptoms:
Unexplained increase in Lambda costs (10-50% higher).
Bill includes charges for function initialization.
Functions with heavy startup logic cost more than expected.

Why this breaks:
As of August 1, 2025, AWS bills the INIT phase the same way it bills
invocation duration. Previously, cold start initialization wasn't billed
for the full duration.

This affects functions with:
- Heavy dependency loading (large packages)
- Slow initialization code
- Frequent cold starts (low traffic or poor concurrency)

Cold starts now directly impact your bill, not just latency.

Recommended fix:

## Measure your INIT phase

```bash


## ## Monitor cold start frequency

```

### Lambda Timeout Misconfiguration

Severity: HIGH

Situation: Running Lambda functions, especially with external calls

Symptoms:
Function times out unexpectedly.
"Task timed out after X seconds" in logs.
Partial processing with no response.
Silent failures with no error caught.

Why this breaks:
Default Lambda timeout is only 3 seconds. Maximum is 15 minutes.

Common timeout causes:
- Default timeout too short for workload
- Downstream service taking longer than expected
- Network issues in VPC
- Infinite loops or blocking operations
- S3 downloads larger than expected

Lambda terminates at timeout without graceful shutdown.

Recommended fix:

## Set appropriate timeout

```yaml


## ## Implement timeout awareness

```javascript
exports.handler = async (event, context) => {
  // Get remaining time
  const remainingTime = context.getRemainingTimeInMillis();

  // If running low on time, fail gracefully
  if (remainingTime < 5000) {
    console.warn('Running low on time, aborting');
    throw new Error('Insufficient time remaining');
  }

  // For long operations, check periodically
  for (const item of items) {
    if (context.getRemainingTimeInMillis() < 10000) {
      // Save progress and exit gracefully
      await saveProgress(processedItems);
      throw new Error('Timeout approaching, saved progress');
    }
    await processItem(item);
  }
};
```


## ## Set downstream timeouts

```

### Out of Memory (OOM) Crash

Severity: HIGH

Situation: Lambda function processing data

Symptoms:
Function stops abruptly without error.
CloudWatch logs appear truncated.
"Max Memory Used" hits configured limit.
Inconsistent behavior under load.

Why this breaks:
When Lambda exceeds memory allocation, AWS forcibly terminates
the runtime. This happens without raising a catchable exception.

Common causes:
- Processing large files in memory
- Memory leaks across invocations
- Buffering entire response bodies
- Heavy libraries consuming too much memory

Recommended fix:

## Increase memory allocation

```yaml


## # https://github.com/alexcasalboni/aws-lambda-power-tuning

```

### VPC-Attached Lambda Cold Start Delay

Severity: MEDIUM

Situation: Lambda functions in VPC accessing private resources

Symptoms:
Extremely slow cold starts (was 10+ seconds, now ~100ms).
Timeouts on first invocation after idle period.
Functions work in VPC but slow compared to non-VPC.

Why this breaks:
Lambda functions in VPC need Elastic Network Interfaces (ENIs).
AWS improved this significantly with Hyperplane ENIs, but:

- First cold start in VPC still has overhead
- NAT Gateway issues can cause timeouts
- Security group misconfig blocks traffic
- DNS resolution can be slow

Recommended fix:

## Verify VPC configuration

```yaml


## # Avoid NAT Gateway for AWS service calls

```

## Only use VPC when necessary

Don't attach Lambda to VPC unless you need:
- Access to RDS/ElastiCache in VPC
- Access to private EC2 instances
- Compliance requirements

Most AWS services can be accessed without VPC.

### Node.js Event Loop Not Cleared

Severity: MEDIUM

Situation: Node.js Lambda function with callbacks or timers

Symptoms:
Function takes full timeout duration to return.
"Task timed out" even though logic completed.
Extra billing for idle time.

Why this breaks:
By default, Lambda waits for the Node.js event loop to be empty
before returning. If you have:
- Unresolved setTimeout/setInterval
- Dangling database connections
- Pending callbacks

Lambda waits until timeout, even if your response was ready.

Recommended fix:

## Tell Lambda not to wait for event loop

```javascript


## ## Close connections properly

```

### API Gateway Payload Size Limits

Severity: MEDIUM

Situation: Returning large responses or receiving large requests

Symptoms:
"413 Request Entity Too Large" error
"Execution failed due to configuration error: Malformed Lambda proxy response"
Response truncated or failed

Why this breaks:
API Gateway has hard payload limits:
- REST API: 10 MB request/response
- HTTP API: 10 MB request/response
- Lambda itself: 6 MB sync response, 256 KB async

Exceeding these causes failures that may not be obvious.

Recommended fix:

## For large file uploads

```javascript


## ## For large responses

```javascript
// Store in S3, return presigned download URL
exports.handler = async (event) => {
  const largeData = await generateLargeReport();

  await s3.send(new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `reports/${reportId}.json`,
    Body: JSON.stringify(largeData)
  }));

  const downloadUrl = await getSignedUrl(s3,
    new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `reports/${reportId}.json`
    }),
    { expiresIn: 3600 }
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ downloadUrl })
  };
};
```


## ## Monitor with CloudWatch alarms

```

## Validation Checks

### Hardcoded AWS Credentials

Severity: ERROR

AWS credentials must never be hardcoded

Message: Hardcoded AWS access key detected. Use IAM roles or environment variables.

### AWS Secret Key in Source Code

Severity: ERROR

Secret keys should use Secrets Manager or environment variables

Message: Hardcoded AWS secret key. Use IAM roles or Secrets Manager.

### Overly Permissive IAM Policy

Severity: WARNING

Avoid wildcard permissions in Lambda IAM roles

Message: Overly permissive IAM policy. Use least privilege principle.

### Lambda Handler Without Error Handling

Severity: WARNING

Lambda handlers should have try/catch for graceful errors

Message: Lambda handler without error handling. Add try/catch.

### Missing callbackWaitsForEmptyEventLoop

Severity: INFO

Node.js handlers should set callbackWaitsForEmptyEventLoop

Message: Consider setting context.callbackWaitsForEmptyEventLoop = false

### Default Memory Configuration

Severity: INFO

Default 128MB may be too low for many workloads

Message: Using default 128MB memory. Consider increasing for better performance.

### Low Timeout Configuration

Severity: WARNING

Very low timeout may cause unexpected failures

Message: Timeout of 1-3 seconds may be too low. Increase if making external calls.

### No Dead Letter Queue Configuration

Severity: WARNING

Async functions should have DLQ for failed invocations

Message: No DLQ configured. Add for async invocations.

### Importing Full AWS SDK v2

Severity: WARNING

Import specific clients from AWS SDK v3 for smaller packages

Message: Importing full AWS SDK. Use modular SDK v3 imports for smaller packages.

### Hardcoded DynamoDB Table Name

Severity: WARNING

Table names should come from environment variables

Message: Hardcoded table name. Use environment variable for portability.

## Collaboration

### Delegation Triggers

- user needs GCP serverless -> gcp-cloud-run (Cloud Run for containers, Cloud Functions for events)
- user needs Azure serverless -> azure-functions (Azure Functions, Logic Apps)
- user needs database design -> postgres-wizard (RDS design, or use DynamoDB patterns)
- user needs authentication -> auth-specialist (Cognito, API Gateway authorizers)
- user needs complex workflows -> workflow-automation (Step Functions, EventBridge)
- user needs AI integration -> llm-architect (Lambda calling Bedrock or external LLMs)

## When to Use
Use this skill when the request clearly matches the capabilities and patterns described above.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.




---


Symptoms:
Runaway costs.
Thousands of invocations in minutes.
CloudWatch logs show repeated invocations.
Lambda writing to source bucket/table that triggers it.

Why this breaks:
Lambda can accidentally trigger itself:
- S3 trigger writes back to same bucket
- DynamoDB trigger updates same table
- SNS publishes to topic that triggers it
- Step Functions with wrong error handling

Recommended fix:

## Use different buckets/prefixes

```yaml
# S3 trigger with prefix filter
Events:
  S3Event:
    Type: S3
    Properties:
      Bucket: !Ref InputBucket
      Events: s3:ObjectCreated:*
      Filter:
        S3Key:
          Rules:
            - Name: prefix
              Value: uploads/  # Only trigger on uploads/

# Output to different bucket or prefix
# OutputBucket or processed/ prefix
```

## Add idempotency checks

```javascript
exports.handler = async (event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;

    // Skip if this is a processed file
    if (key.startsWith('processed/')) {
      console.log('Skipping already processed file:', key);
      continue;
    }

    // Process and write to different location
    await processFile(key);
    await writeToS3(`processed/${key}`, result);
  }
};
```

## Set reserved concurrency as circuit breaker

```yaml
Resources:
  RiskyFunction:
    Type: AWS::Serverless::Function
    Properties:
      ReservedConcurrentExecutions: 10  # Max 10 parallel
      # Limits blast radius of runaway invocations
```

## Monitor with CloudWatch alarms

```yaml
InvocationAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    MetricName: Invocations
    Namespace: AWS/Lambda
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 1
    Threshold: 1000  # Alert if >1000 invocations/min
    ComparisonOperator: GreaterThanThreshold
> See [references/details.md](references/details.md) for full code examples.
