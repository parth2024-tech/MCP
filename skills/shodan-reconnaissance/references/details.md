# Extended Reference

|-------|-------|----------|
| No API Key Configured | Key not initialized | Run `shodan init YOUR_API_KEY` then verify with `shodan info` |
| Query Credits Exhausted | Monthly credits consumed | Use credit-free queries (no filters), wait for reset, or upgrade |
| Host Recently Crawled | Cannot re-scan IP within 24h | Use `shodan host IP` for existing data, or wait 24 hours |
| Rate Limit Exceeded | >1 request/second | Add `time.sleep(1)` between API requests |
| Empty Search Results | Too specific or syntax error | Use quotes for phrases: `'org:"Company Name"'`; broaden criteria |
| Downloaded File Won't Parse | Corrupted or wrong format | Verify with `gunzip -t file.gz`, re-download with `--limit` |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
