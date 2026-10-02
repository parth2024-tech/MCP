---
name: aws-compliance-checker
description: Automated compliance checking against CIS, PCI-DSS, HIPAA, and SOC 2 benchmarks. Use when the task involves aws compliance checker.
category: security
risk: safe
source: community
tags: "[aws, compliance, audit, cis, pci-dss, hipaa, kiro-cli]"
date_added: "2026-02-27"
---

# AWS Compliance Checker

Automated compliance validation against industry standards including CIS AWS Foundations, PCI-DSS, HIPAA, and SOC 2.

## When to Use
Use this skill when you need to validate AWS compliance against industry standards, prepare for audits, or maintain continuous compliance monitoring.

## Supported Frameworks

**CIS AWS Foundations Benchmark**
- Identity and Access Management
- Logging and Monitoring
- Networking
- Data Protection

**PCI-DSS (Payment Card Industry)**
- Network security
- Access controls
- Encryption
- Monitoring and logging

**HIPAA (Healthcare)**
- Access controls
- Audit controls
- Data encryption
- Transmission security

**SOC 2**
- Security
- Availability
- Confidentiality
- Privacy

## CIS AWS Foundations Checks

### Identity & Access Management (1.x)

> See [references/details.md](references/details.md) for full code examples.

### Logging (2.x)

> See [references/details.md](references/details.md) for full code examples.

### Monitoring (3.x)

> See [references/details.md](references/details.md) for full code examples.

### Networking (4.x)

> See [references/details.md](references/details.md) for full code examples.

## PCI-DSS Compliance Checks

> See [references/details.md](references/details.md) for full code examples.

## HIPAA Compliance Checks

> See [references/details.md](references/details.md) for full code examples.

## Automated Compliance Reporting

> See [references/details.md](references/details.md) for full code examples.

## Example Prompts

- "Run CIS AWS Foundations compliance check"
- "Generate a PCI-DSS compliance report"
- "Check HIPAA compliance for my AWS account"
- "Audit against SOC 2 requirements"
- "Create a compliance dashboard"

## Best Practices

- Run compliance checks weekly
- Automate with Lambda/EventBridge
- Track compliance trends over time
- Document exceptions with justification
- Integrate with AWS Security Hub
- Use AWS Config Rules for continuous monitoring

## Kiro CLI Integration

```bash
kiro-cli chat "Use aws-compliance-checker to run CIS benchmark"
kiro-cli chat "Generate PCI-DSS report with aws-compliance-checker"
```

## Additional Resources

- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/benchmark/amazon_web_services)
- [AWS Security Hub](https://aws.amazon.com/security-hub/)
- [AWS Compliance Programs](https://aws.amazon.com/compliance/programs/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
