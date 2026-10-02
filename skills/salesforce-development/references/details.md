# Salesforce Development — Extended Reference

    } catch (error) {
      // Abort job on error
      await this.abortJob(job.id);
      throw error;
    }
  }

  private async createBulkJob(sobject: string, operation: string): Promise<any> {
    const response = await fetch(
      `${this.instanceUrl}/services/data/v59.0/jobs/ingest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          object: sobject,
          operation,
          contentType: 'CSV',
          lineEnding: 'LF'
        })
      }
    );

    return response.json();
  }

  private async uploadJobData(jobId: string, records: object[]): Promise<void> {
    // Convert to CSV
    const csv = this.recordsToCSV(records);

    await fetch(
      `${this.instanceUrl}/services/data/v59.0/jobs/ingest/${jobId}/batches`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'text/csv'
        },
        body: csv
      }
    );
  }

  private async closeJob(jobId: string): Promise<void> {
    await fetch(
      `${this.instanceUrl}/services/data/v59.0/jobs/ingest/${jobId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state: 'UploadComplete' })
      }
    );
  }

  private async waitForJobCompletion(jobId: string): Promise<any> {
    const maxWaitTime = 10 * 60 * 1000;  // 10 minutes
    const pollInterval = 5000;  // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const response = await fetch(
        `${this.instanceUrl}/services/data/v59.0/jobs/ingest/${jobId}`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        }
      );

      const job = await response.json();

      if (job.state === 'JobComplete') {
        // Get results
        return {
          success: job.numberRecordsProcessed - job.numberRecordsFailed,
          failed: job.numberRecordsFailed,
          failedResults: job.numberRecordsFailed > 0
            ? await this.getFailedResults(jobId)
            : []
        };
      }

      if (job.state === 'Failed' || job.state === 'Aborted') {
        throw new Error(`Bulk job failed: ${job.state}`);
      }

      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error('Bulk job timeout');
  }

  private async getFailedResults(jobId: string): Promise<any[]> {
    const response = await fetch(
      `${this.instanceUrl}/services/data/v59.0/jobs/ingest/${jobId}/failedResults`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );

    const csv = await response.text();
    return this.parseCSV(csv);
  }

  private recordsToCSV(records: object[]): string {
    if (records.length === 0) return '';

    const headers = Object.keys(records[0]);
    const rows = records.map(r =>
      headers.map(h => this.escapeCSV(r[h])).join(',')
    );

    return [headers.join(','), ...rows].join('/n');
  }

  private escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('/n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

### Context

- large data volumes
- data migration
- bulk operations

### Salesforce DX with Scratch Orgs

Source-driven development with disposable scratch orgs for isolated
testing. Scratch orgs exist 7-30 days and can be created throughout
the day, unlike sandbox refresh limits.

// project-scratch-def.json - Scratch org definition
{
  "orgName": "MyApp Dev Org",
  "edition": "Developer",
  "features": ["EnableSetPasswordInApi", "Communities"],
  "settings": {
    "lightningExperienceSettings": {
      "enableS1DesktopEnabled": true
    },
    "mobileSettings": {
      "enableS1EncryptedStoragePref2": false
    },
    "securitySettings": {
      "passwordPolicies": {
        "enableSetPasswordInApi": true
      }
    }
  }
}

// sfdx-project.json - Project configuration
{
  "packageDirectories": [
    {
      "path": "force-app",
      "default": true,
      "package": "MyPackage",
      "versionName": "ver 1.0",
      "versionNumber": "1.0.0.NEXT",
      "dependencies": [
        {
          "package": "SomePackage@2.0.0"
        }
      ]
    }
  ],
  "namespace": "myns",
  "sfdcLoginUrl": "https://login.salesforce.com",
  "sourceApiVersion": "59.0"
}

# Development workflow commands
# 1. Create scratch org
sf org create scratch \
  --definition-file config/project-scratch-def.json \
  --alias myapp-dev \
  --duration-days 7 \
  --set-default

# 2. Push source to scratch org
sf project deploy start --target-org myapp-dev

# 3. Assign permission set
sf org assign permset --name MyApp_Admin --target-org myapp-dev

# 4. Import sample data
sf data import tree --plan data/sample-data-plan.json --target-org myapp-dev

# 5. Open org
sf org open --target-org myapp-dev

# 6. Run tests
sf apex run test \
  --code-coverage \
  --result-format human \
  --wait 10 \
  --target-org myapp-dev

# 7. Pull changes back
sf project retrieve start --target-org myapp-dev

### Context

- development workflow
- CI/CD
- testing

### 2nd Generation Package (2GP) Development

2GP replaces 1GP with source-driven, modular packaging. Requires Dev Hub
with 2GP enabled, namespace linked, and 75% code coverage for promoted
packages.

# Enable Dev Hub and 2GP in Setup:
# Setup > Dev Hub > Enable Dev Hub
# Setup > Dev Hub > Enable Unlocked Packages and 2GP

# Link namespace (required for managed packages)
sf package create \
  --name "MyManagedPackage" \
  --package-type Managed \
  --path force-app \
  --target-dev-hub DevHub

# Create package version (beta)
sf package version create \
  --package "MyManagedPackage" \
  --installation-key-bypass \
  --wait 30 \
  --code-coverage \
  --target-dev-hub DevHub

# Check version status
sf package version list --packages "MyManagedPackage" --target-dev-hub DevHub

# Promote to released (requires 75% coverage)
sf package version promote \
  --package "MyManagedPackage@1.0.0-1" \
  --target-dev-hub DevHub

# Install in sandbox for testing
sf package install \
  --package "MyManagedPackage@1.0.0-1" \
  --target-org MySandbox \
  --wait 20

# CI/CD Pipeline (GitHub Actions)
# .github/workflows/salesforce-ci.yml
name: Salesforce CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate Dev Hub
        run: |
          echo "${{ secrets.SFDX_AUTH_URL }}" > auth.txt
          sf org login sfdx-url --sfdx-url-file auth.txt --alias DevHub --set-default-dev-hub

      - name: Create Scratch Org
        run: |
          sf org create scratch \
            --definition-file config/project-scratch-def.json \
            --alias ci-scratch \
            --duration-days 1 \
            --set-default

      - name: Deploy Source
        run: sf project deploy start --target-org ci-scratch

      - name: Run Tests
        run: |
          sf apex run test \
            --code-coverage \
            --result-format human \
            --wait 20 \
            --target-org ci-scratch

      - name: Delete Scratch Org
        if: always()
        run: sf org delete scratch --target-org ci-scratch --no-prompt

### Context

- packaging
- ISV development
- AppExchange

## Sharp Edges

### Governor Limits Apply Per Transaction, Not Per Record

Severity: CRITICAL

### @wire Results Are Cached and May Be Stale

Severity: HIGH

### LWC Properties Are Case-Sensitive

Severity: MEDIUM

### Null Pointer Exceptions in Apex Collections

Severity: HIGH

### Trigger Recursion Causes Infinite Loops

Severity: CRITICAL

### Cannot Make Callouts from Synchronous Triggers

Severity: HIGH

### Cannot Mix Setup and Non-Setup DML

Severity: HIGH

### Dynamic SOQL Is Vulnerable to Injection

Severity: CRITICAL

### Scratch Orgs Expire and Lose All Data

Severity: MEDIUM

### API Version Mismatches Cause Silent Failures

Severity: MEDIUM

## Validation Checks

### SOQL Query Inside Loop

Severity: ERROR

SOQL in loops causes governor limit exceptions with bulk data

Message: SOQL query inside loop. Query once outside the loop and use a Map.

### DML Operation Inside Loop

Severity: ERROR

DML in loops hits 150 statement limit

Message: DML operation inside loop. Collect records and perform single DML outside loop.

### HTTP Callout in Trigger

Severity: ERROR

Synchronous triggers cannot make callouts

Message: Callout in trigger. Use @future(callout=true) or Queueable with Database.AllowsCallouts.

### Potential SOQL Injection

Severity: ERROR

Dynamic SOQL with string concatenation is vulnerable

Message: Dynamic SOQL with concatenation. Use bind variables or String.escapeSingleQuotes().

### Missing WITH SECURITY_ENFORCED

Severity: WARNING

SOQL should enforce FLS/CRUD permissions

Message: SOQL without security enforcement. Add WITH SECURITY_ENFORCED.

### Hardcoded Salesforce ID

Severity: WARNING

Record IDs differ between orgs

Message: Hardcoded Salesforce ID. Query by DeveloperName or ExternalId instead.

### Hardcoded Credentials

Severity: ERROR

Credentials must use Named Credentials or Custom Metadata

Message: Hardcoded credentials. Use Named Credentials or Custom Metadata.

### Direct DOM Manipulation in LWC

Severity: WARNING

LWC uses shadow DOM, direct manipulation breaks encapsulation

Message: Direct DOM access in LWC. Use this.template.querySelector() or data binding.

### Reactive Property Without @track

Severity: INFO

Complex object properties need @track for reactivity

Message: Object assignment may need @track for reactivity (post-Spring '20 objects are auto-tracked).

### Wire Without Refresh After DML

Severity: WARNING

Cached wire data becomes stale after updates

Message: DML after @wire without refreshApex. Data may be stale.

## Collaboration

### Delegation Triggers

- user needs external API integration -> backend (REST API design, external system sync)
- user needs complex UI beyond LWC -> frontend (Custom portal with React/Next.js)
- user needs HubSpot integration -> hubspot-integration (Salesforce-HubSpot sync patterns)
- user needs data warehouse sync -> data-engineer (ETL from Salesforce to warehouse)
- user needs payment processing -> stripe-integration (Beyond Salesforce Billing)
- user needs advanced auth -> auth-specialist (SSO, SAML, custom portals)

## When to Use
- User mentions or implies: salesforce
- User mentions or implies: sfdc
- User mentions or implies: apex
- User mentions or implies: lwc
- User mentions or implies: lightning web components
- User mentions or implies: sfdx
- User mentions or implies: scratch org
- User mentions or implies: visualforce
- User mentions or implies: soql
- User mentions or implies: governor limits
- User mentions or implies: connected app

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
