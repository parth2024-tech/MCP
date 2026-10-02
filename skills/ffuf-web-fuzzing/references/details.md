# Ffuf Web Fuzzing — Code Reference

## # Download from: https://github.com/ffuf/ffuf/releases/latest

```

## Core Concepts

### The FUZZ Keyword
The `FUZZ` keyword is used as a placeholder that gets replaced with entries from your wordlist. You can place it anywhere:
- URLs: `https://target.com/FUZZ`
- Headers: `-H "Host: FUZZ"`
- POST data: `-d "username=admin&password=FUZZ"`
- Multiple locations with custom keywords: `-w wordlist.txt:CUSTOM` then use `CUSTOM` instead of `FUZZ`

### Multi-wordlist Modes
- **clusterbomb**: Tests all combinations (default) - cartesian product
- **pitchfork**: Iterates through wordlists in parallel (1-to-1 matching)
- **sniper**: Tests one position at a time (for multiple FUZZ positions)

## Common Use Cases

### 1. Directory and File Discovery
```bash


## # Multiple headers

```

## Filtering and Matching

### Matchers (Include Results)
- `-mc`: Match status codes (default: 200-299,301,302,307,401,403,405,500)
- `-ml`: Match line count
- `-mr`: Match regex
- `-ms`: Match response size
- `-mt`: Match response time (e.g., `>100` or `<100` milliseconds)
- `-mw`: Match word count

### Filters (Exclude Results)
- `-fc`: Filter status codes (e.g., `-fc 404,403,401`)
- `-fl`: Filter line count
- `-fr`: Filter regex (e.g., `-fr "error"`)
- `-fs`: Filter response size (e.g., `-fs 42,4242`)
- `-ft`: Filter response time
- `-fw`: Filter word count

### Auto-Calibration (USE BY DEFAULT!)
**CRITICAL:** Always use `-ac` unless you have a specific reason not to. This is especially important when having Claude analyze results, as it dramatically reduces noise and false positives.

```bash


## ## Configuration File

```

## Troubleshooting

### Too Many False Positives
- Use `-ac` for auto-calibration
- Check default response and filter by size with `-fs`
- Use regex filtering with `-fr`

### Too Slow
- Increase threads: `-t 100`
- Reduce wordlist size
- Use `-ignore-body` if you don't need response content

### Getting Blocked
- Reduce rate: `-rate 2`
- Add delays: `-p 0.5-1.5`
- Reduce threads: `-t 10`
- Randomize User-Agent
- Use proxy rotation

### Missing Results
- Check if you're filtering too aggressively
- Use `-mc all` to see all responses
- Disable auto-calibration temporarily
- Use verbose mode `-v` to see what's happening

## Resources
- Official GitHub: https://github.com/ffuf/ffuf
- Wiki: https://github.com/ffuf/ffuf/wiki
- Codingo's Guide: https://codingo.io/tools/ffuf/bounty/2020/09/17/everything-you-need-to-know-about-ffuf.html
- Practice Lab: http://ffuf.me
- SecLists Wordlists: https://github.com/danielmiessler/SecLists

## Quick Reference Card

| Task | Command Template |
|------|------------------|
| Directory Discovery | `ffuf -w wordlist.txt -u https://target.com/FUZZ -ac` |
| Subdomain Discovery | `ffuf -w subdomains.txt -u https://FUZZ.target.com -ac` |
| Parameter Fuzzing | `ffuf -w params.txt -u https://target.com/page?FUZZ=value -ac` |
| POST Data Fuzzing | `ffuf -w wordlist.txt -X POST -d "param=FUZZ" -u https://target.com/endpoint` |
| With Extensions | Add `-e .php,.html,.txt` |
| Filter Status | Add `-fc 404,403` |
| Filter Size | Add `-fs 1234` |
| Rate Limit | Add `-rate 2` |
| Save Output | Add `-o results.json` |
| Verbose | Add `-c -v` |
| Recursion | Add `-recursion -recursion-depth 2` |
| Through Proxy | Add `-x http://127.0.0.1:8080` |

## Additional Resources

This skill includes supplementary materials in the `resources/` directory:

### Resource Files
- **WORDLISTS.md**: Comprehensive guide to SecLists wordlists, recommended lists for different scenarios, file extensions, and quick reference patterns
- **REQUEST_TEMPLATES.md**: Pre-built req.txt templates for common authentication scenarios (JWT, OAuth, session cookies, API keys, etc.) with usage examples

### Helper Script
- **ffuf_helper.py**: Python script to assist with:
  - Analyzing ffuf JSON results for anomalies and interesting findings
  - Creating req.txt template files from command-line arguments
  - Generating number-based wordlists for IDOR testing

**Helper Script Usage:**
```bash


## # Generate IDOR testing wordlist

```

**When to use resources:**
- Users need wordlist recommendations → Reference WORDLISTS.md
- Users need help with authenticated requests → Reference REQUEST_TEMPLATES.md
- Users want to analyze results → Use ffuf_helper.py analyze
- Users need to generate req.txt → Use ffuf_helper.py create-req
- Users need number ranges for IDOR → Use ffuf_helper.py wordlist

## Notes for Claude
When helping users with ffuf:
1. **ALWAYS include `-ac` in every command** - This is mandatory for productive pentesting and result analysis
2. When users mention authenticated fuzzing or provide auth tokens/cookies:
   - Suggest creating a `req.txt` file with the full HTTP request
   - Show them how to insert FUZZ where they want to fuzz
   - Use `ffuf --request req.txt -w wordlist.txt -ac`
3. Always recommend starting with `-ac` for auto-calibration
4. Suggest appropriate wordlists from SecLists based on the task
5. Remind users to use rate limiting (`-rate`) for production targets
6. Encourage saving output to files for documentation: `-o results.json`
7. Suggest filtering strategies based on initial reconnaissance
8. Always use the FUZZ keyword (case-sensitive)
9. Consider stealth: lower threads, rate limiting, and delays for sensitive targets
10. For pentesting reports, use `-of html` or `-of csv` for client-friendly formats
11. **When analyzing ffuf results for users:**
    - Assume they used `-ac` (if not, results will be too noisy)
    - Focus on anomalies: different status codes, response sizes, timing
    - Look for interesting endpoints: admin, api, backup, config, .git, etc.
    - Flag potential vulnerabilities: error messages, stack traces, version info
    - Suggest follow-up fuzzing on interesting findings

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


