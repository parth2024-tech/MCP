---
name: scanning-tools
description: Master essential security scanning tools for network discovery, vulnerability assessment, web application testing, wireless security, and compliance validation. This skill covers tool selection, configuration, and practical usage across different scanning categories. Use when the task involves scanning tools.
risk: unknown
source: community
author: zebbern
date_added: "2026-02-27"
---

# Security Scanning Tools

## Purpose

Master essential security scanning tools for network discovery, vulnerability assessment, web application testing, wireless security, and compliance validation. This skill covers tool selection, configuration, and practical usage across different scanning categories.

## Prerequisites

### Required Environment
- Linux-based system (Kali Linux recommended)
- Network access to target systems
- Proper authorization for scanning activities

### Required Knowledge
- Basic networking concepts (TCP/IP, ports, protocols)
- Understanding of common vulnerabilities
- Familiarity with command-line interfaces

## Outputs and Deliverables

1. **Network Discovery Reports** - Identified hosts, ports, and services
2. **Vulnerability Assessment Reports** - CVEs, misconfigurations, risk ratings
3. **Web Application Security Reports** - OWASP Top 10 findings
4. **Compliance Reports** - CIS benchmarks, PCI-DSS, HIPAA checks

## Core Workflow

### Phase 1: Network Scanning Tools

#### Nmap (Network Mapper)

Primary tool for network discovery and security auditing:

> See [references/details.md](references/details.md) for full code examples.

#### Masscan

High-speed port scanning for large networks:

```bash
# Basic scanning
masscan -p80 192.168.1.0/24 --rate=1000
masscan -p80,443,8080 192.168.1.0/24 --rate=10000

# Full port range
masscan -p0-65535 192.168.1.0/24 --rate=5000

# Large-scale scanning
masscan 0.0.0.0/0 -p443 --rate=100000 --excludefile exclude.txt

# Output formats
masscan -p80 192.168.1.0/24 -oG results.gnmap
masscan -p80 192.168.1.0/24 -oJ results.json
masscan -p80 192.168.1.0/24 -oX results.xml

# Banner grabbing
masscan -p80 192.168.1.0/24 --banners
```

### Phase 2: Vulnerability Scanning Tools

#### Nessus

Enterprise-grade vulnerability assessment:

```bash
# Start Nessus service
sudo systemctl start nessusd

# Access web interface
# https://localhost:8834

# Command-line (nessuscli)
nessuscli scan --create --name "Internal Scan" --targets 192.168.1.0/24
nessuscli scan --list
nessuscli scan --launch <scan_id>
nessuscli report --format pdf --output report.pdf <scan_id>
```

Key Nessus features:
- Comprehensive CVE detection
- Compliance checks (PCI-DSS, HIPAA, CIS)
- Custom scan templates
- Credentialed scanning for deeper analysis
- Regular plugin updates

#### OpenVAS (Greenbone)

Open-source vulnerability scanning:

> See [references/details.md](references/details.md) for full code examples.

### Phase 3: Web Application Scanning Tools

#### Burp Suite

Comprehensive web application testing:

```
# Proxy configuration
1. Set browser proxy to 127.0.0.1:8080
2. Import Burp CA certificate for HTTPS
3. Add target to scope

# Key modules:
- Proxy: Intercept and modify requests
- Spider: Crawl web applications
- Scanner: Automated vulnerability detection
- Intruder: Automated attacks (fuzzing, brute-force)
- Repeater: Manual request manipulation
- Decoder: Encode/decode data
- Comparer: Compare responses
```

Core testing workflow:
1. Configure proxy and scope
2. Spider the application
3. Analyze sitemap
4. Run active scanner
5. Manual testing with Repeater/Intruder
6. Review findings and generate report

#### OWASP ZAP

Open-source web application scanner:

```bash
# Start ZAP
zaproxy

# Automated scan from CLI
zap-cli quick-scan https://target.com

# Full scan
zap-cli spider https://target.com
zap-cli active-scan https://target.com

# Generate report
zap-cli report -o report.html -f html

# API mode
zap.sh -daemon -port 8080 -config api.key=<your_key>
```

ZAP automation:
```bash
# Docker-based scanning
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t https://target.com -r report.html

# Baseline scan (passive only)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://target.com -r report.html
```

#### Nikto

Web server vulnerability scanner:

> See [references/details.md](references/details.md) for full code examples.

### Phase 4: Wireless Scanning Tools

#### Aircrack-ng Suite

Wireless network penetration testing:

> See [references/details.md](references/details.md) for full code examples.

#### Kismet

Passive wireless detection:

```bash
# Start Kismet
kismet

# Specify interface
kismet -c wlan0

# Access web interface
# http://localhost:2501

# Detect hidden networks
# Kismet passively collects all beacon frames
# including those from hidden SSIDs
```

### Phase 5: Malware and Exploit Scanning

#### ClamAV

Open-source antivirus scanning:

> See [references/details.md](references/details.md) for full code examples.

#### Metasploit Vulnerability Validation

Validate vulnerabilities with exploitation:

> See [references/details.md](references/details.md) for full code examples.

### Phase 6: Cloud Security Scanning

#### Prowler (AWS)

AWS security assessment:

> See [references/details.md](references/details.md) for full code examples.

#### ScoutSuite (Multi-cloud)

Multi-cloud security auditing:

```bash
# Install ScoutSuite
pip install scoutsuite

# AWS scan
scout aws

# Azure scan
scout azure --cli

# GCP scan
scout gcp --user-account

# Generate report
scout aws --report-dir ./reports
```

### Phase 7: Compliance Scanning

#### Lynis

Security auditing for Unix/Linux:

```bash
# Run audit
sudo lynis audit system

# Quick scan
sudo lynis audit system --quick

# Specific profile
sudo lynis audit system --profile server

# Output report
sudo lynis audit system --report-file /tmp/lynis-report.dat

# Check specific section
sudo lynis show profiles
sudo lynis audit system --tests-from-group malware
```

#### OpenSCAP

Security compliance scanning:

```bash
# List available profiles
oscap info /usr/share/xml/scap/ssg/content/ssg-<distro>-ds.xml

# Run scan with profile
oscap xccdf eval --profile xccdf_org.ssgproject.content_profile_pci-dss \
  --report report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel8-ds.xml

# Generate fix script
oscap xccdf generate fix \
  --profile xccdf_org.ssgproject.content_profile_pci-dss \
  --output remediation.sh \
  /usr/share/xml/scap/ssg/content/ssg-rhel8-ds.xml
> See [references/details.md](references/details.md) for full code examples.
# Nmap XML to HTML
xsltproc nmap-output.xml -o report.html

# OpenVAS report export
gvm-cli socket --xml '<get_reports report_id="<id>" format_id="<pdf_format>"/>'

# Combine multiple scan results
# Use tools like Faraday, Dradis, or custom scripts

# Executive summary template:
# 1. Scope and methodology
# 2. Key findings summary
# 3. Risk distribution chart
# 4. Critical vulnerabilities
# 5. Remediation recommendations
# 6. Detailed technical findings
> See [references/details.md](references/details.md) for full code examples.
