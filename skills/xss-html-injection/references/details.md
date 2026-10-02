# Extended Reference

| Script not executing | Check CSP blocking; verify encoding; try event handlers (img, svg onerror); confirm JS enabled |
| Payload appears but doesn't execute | Break out of attribute context with `"` or `'`; check if inside comment; test different contexts |
| Cookies not accessible | Check HttpOnly flag; try localStorage/sessionStorage; use no-cors mode |
| CSP blocking payloads | Find JSONP on whitelisted domains; check for unsafe-inline; test base-uri bypass |
| WAF blocking requests | Use encoding variations; fragment payload; null bytes; case variations |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
