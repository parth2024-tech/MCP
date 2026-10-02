---
name: ffuf-web-fuzzing
description: Expert guidance for ffuf web fuzzing during penetration testing, including authenticated fuzzing with raw requests, auto-calibration, and result analysis. Use when the task involves ffuf web fuzzing.
risk: unknown
source: community
---

# FFUF (Fuzz Faster U Fool) Skill

## When to Use
- You are fuzzing web targets with `ffuf` during authorized security testing or penetration testing.
- The task involves content discovery, subdomain enumeration, parameter fuzzing, or authenticated request fuzzing.
- You need guidance on wordlists, filtering, calibration, and interpreting ffuf results efficiently.

## Overview
FFUF is a fast web fuzzer written in Go, designed for discovering hidden content, directories, files, subdomains, and testing for vulnerabilities during penetration testing. It's significantly faster than traditional tools like dirb or dirbuster.

## Installation
```bash
# Using Go
go install github.com/ffuf/ffuf/v2@latest

# Using Homebrew (macOS)
brew install ffuf

# Binary download
# Download from: https://github.com/ffuf/ffuf/releases/latest
> See [references/details.md](references/details.md) for full code examples.
# Basic directory fuzzing
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ

# With file extensions
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -e .php,.html,.txt,.pdf

# Colored and verbose output
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -c -v

# With recursion (finds nested directories)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -recursion -recursion-depth 2
```

### 2. Subdomain Enumeration
```bash
# Virtual host discovery
ffuf -w /path/to/subdomains.txt -u https://target.com -H "Host: FUZZ.target.com" -fs 4242

# Note: -fs 4242 filters out responses of size 4242 (adjust based on default response size)
```

### 3. Parameter Fuzzing
```bash
# GET parameter names
ffuf -w /path/to/params.txt -u https://target.com/script.php?FUZZ=test_value -fs 4242

# GET parameter values
ffuf -w /path/to/values.txt -u https://target.com/script.php?id=FUZZ -fc 401

# Multiple parameters
ffuf -w params.txt:PARAM -w values.txt:VAL -u https://target.com/?PARAM=VAL -mode clusterbomb
```

### 4. POST Data Fuzzing
```bash
# Basic POST fuzzing
ffuf -w /path/to/passwords.txt -X POST -d "username=admin&password=FUZZ" -u https://target.com/login.php -fc 401

# JSON POST data
ffuf -w entries.txt -u https://target.com/api -X POST -H "Content-Type: application/json" -d '{"name": "FUZZ", "key": "value"}' -fr "error"

# Fuzzing multiple POST fields
ffuf -w users.txt:USER -w passes.txt:PASS -X POST -d "username=USER&password=PASS" -u https://target.com/login -mode pitchfork
```

### 5. Header Fuzzing
```bash
# Custom headers
ffuf -w /path/to/wordlist.txt -u https://target.com -H "X-Custom-Header: FUZZ"

# Multiple headers
ffuf -w /path/to/wordlist.txt -u https://target.com -H "User-Agent: FUZZ" -H "X-Forwarded-For: 127.0.0.1"
> See [references/details.md](references/details.md) for full code examples.
# Auto-calibration - ALWAYS USE THIS
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -ac

# Per-host auto-calibration (useful for multiple hosts)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -ach

# Custom auto-calibration string (for specific patterns)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -acc "404NotFound"
```

**Why `-ac` is essential:**
- Automatically detects and filters repetitive false positive responses
- Removes noise from dynamic websites with random content
- Makes results analysis much easier for both humans and Claude
- Prevents thousands of identical 404/403 responses from cluttering output
- Adapts to the target's specific behavior

**When Claude analyzes your ffuf results, `-ac` is MANDATORY** - without it, Claude will waste time sifting through thousands of false positives instead of finding the interesting anomalies.

## Rate Limiting and Timing

### Rate Control
```bash
# Limit to 2 requests per second (stealth mode)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -rate 2

# Add delay between requests (0.1 to 2 seconds random)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -p 0.1-2.0

# Set number of concurrent threads (default: 40)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -t 10
```

### Time Limits
```bash
# Maximum total execution time (60 seconds)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -maxtime 60

# Maximum time per job (useful with recursion)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -maxtime-job 60 -recursion
```

## Output Options

### Output Formats
```bash
# JSON output
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -o results.json

# HTML output
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -of html -o results.html

# CSV output
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -of csv -o results.csv

# All formats
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -of all -o results

# Silent mode (no progress, only results)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -s

# Pipe to file with tee
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -s | tee results.txt
```

## Advanced Techniques

### Using Raw HTTP Requests (Critical for Authenticated Fuzzing)
This is one of the most powerful features of ffuf, especially for authenticated requests with complex headers, cookies, or tokens.

**Workflow:**
1. Capture a full authenticated request (from Burp Suite, browser DevTools, etc.)
2. Save it to a file (e.g., `req.txt`)
3. Replace the value you want to fuzz with the `FUZZ` keyword
4. Use the `--request` flag

```bash
# From a file containing raw HTTP request
ffuf --request req.txt -w /path/to/wordlist.txt -ac
```

**Example req.txt file:**
```http
POST /api/v1/users/FUZZ HTTP/1.1
Host: target.com
User-Agent: Mozilla/5.0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Cookie: session=abc123xyz; csrftoken=def456
Content-Type: application/json
Content-Length: 27

{"action":"view","id":"1"}
```

**Use Cases:**
- Fuzzing authenticated endpoints with complex auth headers
- Testing API endpoints with JWT tokens
- Fuzzing with CSRF tokens, session cookies, and custom headers
- Testing endpoints that require specific User-Agents or Accept headers
- POST/PUT/DELETE requests with authentication

**Pro Tips:**
- You can place FUZZ in multiple locations: URL path, headers, body
- Use `-request-proto https` if needed (default is https)
- Always use `-ac` to filter out authenticated "not found" or error responses
- Great for IDOR testing: fuzz user IDs, document IDs, etc. in authenticated contexts

```bash
# Common authenticated fuzzing patterns
ffuf --request req.txt -w user_ids.txt -ac -mc 200 -o results.json

# With multiple FUZZ positions using custom keywords
ffuf --request req.txt -w endpoints.txt:ENDPOINT -w ids.txt:ID -mode pitchfork -ac
```

### Proxy Usage
```bash
# HTTP proxy (useful for Burp Suite)
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -x http://127.0.0.1:8080

# SOCKS5 proxy
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -x socks5://127.0.0.1:1080

# Replay matched requests through proxy
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -replay-proxy http://127.0.0.1:8080
```

### Cookie and Authentication
```bash
# Using cookies
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -b "sessionid=abc123; token=xyz789"

# Client certificate authentication
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -cc client.crt -ck client.key
```

### Encoding
```bash
# URL encoding
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -enc 'FUZZ:urlencode'

# Multiple encodings
ffuf -w /path/to/wordlist.txt -u https://target.com/FUZZ -enc 'FUZZ:urlencode b64encode'
```

### Testing for Vulnerabilities
```bash
# SQL injection testing
ffuf -w sqli_payloads.txt -u https://target.com/page.php?id=FUZZ -fs 1234

# XSS testing
ffuf -w xss_payloads.txt -u https://target.com/search?q=FUZZ -mr "<script>"

# Command injection
ffuf -w cmdi_payloads.txt -u https://target.com/execute?cmd=FUZZ -fr "error"
```

### Batch Processing Multiple Targets
```bash
# Process multiple URLs
cat targets.txt | xargs -I@ sh -c 'ffuf -w wordlist.txt -u @/FUZZ -ac'

# Loop through multiple targets with results
for url in $(cat targets.txt); do 
    ffuf -w wordlist.txt -u $url/FUZZ -ac -o "results_$(echo $url | md5sum | cut -d' ' -f1).json"
done
```

## Best Practices

### 1. ALWAYS Use Auto-Calibration
Use `-ac` by default for every scan. This is non-negotiable for productive pentesting:
```bash
ffuf -w wordlist.txt -u https://target.com/FUZZ -ac
```

### 2. Use Raw Requests for Authentication
Don't struggle with command-line flags for complex auth. Capture the full request and use `--request`:
```bash
# 1. Capture authenticated request from Burp/DevTools
# 2. Save to req.txt with FUZZ keyword in place
# 3. Run with -ac
ffuf --request req.txt -w wordlist.txt -ac -o results.json
```

### 3. Use Appropriate Wordlists
- **Directory discovery**: SecLists Discovery/Web-Content (raft-large-directories.txt, directory-list-2.3-medium.txt)
- **Subdomains**: SecLists Discovery/DNS (subdomains-top1million-5000.txt)
- **Parameters**: SecLists Discovery/Web-Content (burp-parameter-names.txt)
- **Usernames**: SecLists Usernames
- **Passwords**: SecLists Passwords
- Source: https://github.com/danielmiessler/SecLists

### 3. Rate Limiting for Stealth
Use `-rate` to avoid triggering WAF/IDS or overwhelming the server:
```bash
ffuf -w wordlist.txt -u https://target.com/FUZZ -rate 2 -t 10
```

### 4. Filter Strategically
- Check the default response first to identify common response sizes, status codes, or patterns
- Use `-fs` to filter by size or `-fc` to filter by status code
- Combine filters: `-fc 403,404 -fs 1234`

### 5. Save Results Appropriately
Always save results to a file for later analysis:
```bash
ffuf -w wordlist.txt -u https://target.com/FUZZ -o results.json -of json
```

### 6. Use Interactive Mode
Press ENTER during execution to drop into interactive mode where you can:
- Adjust filters on the fly
- Save current results
- Restart the scan
- Manage the queue

### 7. Recursion Depth
Be careful with recursion depth to avoid getting stuck in infinite loops or overwhelming the server:
```bash
ffuf -w wordlist.txt -u https://target.com/FUZZ -recursion -recursion-depth 2 -maxtime-job 120
```

## Common Patterns and One-Liners

### Quick Directory Scan
```bash
ffuf -w ~/wordlists/common.txt -u https://target.com/FUZZ -mc 200,301,302,403 -ac -c -v
```

### Comprehensive Scan with Extensions
```bash
ffuf -w ~/wordlists/raft-large-directories.txt -u https://target.com/FUZZ -e .php,.html,.txt,.bak,.old -ac -c -v -o results.json
```

### Authenticated Fuzzing (Raw Request)
```bash
# 1. Save your authenticated request to req.txt with FUZZ keyword
# 2. Run:
ffuf --request req.txt -w ~/wordlists/api-endpoints.txt -ac -o results.json -of json
```

### API Endpoint Discovery
```bash
ffuf -w ~/wordlists/api-endpoints.txt -u https://api.target.com/v1/FUZZ -H "Authorization: Bearer TOKEN" -mc 200,201 -ac -c
```

### Subdomain Discovery with Auto-Calibration
```bash
ffuf -w ~/wordlists/subdomains-top5000.txt -u https://FUZZ.target.com -ac -c -v
```

### POST Login Brute Force
```bash
ffuf -w ~/wordlists/passwords.txt -X POST -d "username=admin&password=FUZZ" -u https://target.com/login -fc 401 -rate 5 -ac
```

### IDOR Testing with Auth
```bash
# Use req.txt with authenticated headers and FUZZ in the ID parameter
ffuf --request req.txt -w numbers.txt -ac -mc 200 -fw 100-200
```

## Configuration File
Create `~/.config/ffuf/ffufrc` for default settings:
```
[http]
headers = ["User-Agent: Mozilla/5.0"]
timeout = 10

[general]
colors = true
threads = 40

[matcher]
status = "200-299,301,302,307,401,403,405,500"
> See [references/details.md](references/details.md) for full code examples.
# Analyze results to find interesting anomalies
python3 ffuf_helper.py analyze results.json

# Create authenticated request template
python3 ffuf_helper.py create-req -o req.txt -m POST -u "https://api.target.com/users" \
    -H "Authorization: Bearer TOKEN" -d '{"action":"FUZZ"}'

# Generate IDOR testing wordlist
python3 ffuf_helper.py wordlist -o ids.txt -t numbers -s 1 -e 10000
> See [references/details.md](references/details.md) for full code examples.
