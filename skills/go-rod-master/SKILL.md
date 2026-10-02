---
name: go-rod-master
description: Comprehensive guide for browser automation and web scraping with go-rod (Chrome DevTools Protocol) including stealth anti-bot-detection patterns. Use when the task involves go rod master.
risk: safe
source: "https://github.com/go-rod/rod"
date_added: "2026-02-27"
---

# Go-Rod Browser Automation Master

## Overview

[Rod](https://github.com/go-rod/rod) is a high-level Go driver built directly on the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) for browser automation and web scraping. Unlike wrappers around other tools, Rod communicates with the browser natively via CDP, providing thread-safe operations, chained context design for timeouts/cancellation, auto-wait for elements, correct iframe/shadow DOM handling, and zero zombie browser processes.

The companion library [go-rod/stealth](https://github.com/go-rod/stealth) injects anti-bot-detection evasions based on [puppeteer-extra stealth](https://github.com/nichochar/puppeteer-extra/tree/master/packages/extract-stealth-evasions), hiding headless browser fingerprints from detection systems.

## When to Use This Skill

- Use when the user asks to **scrape**, **automate**, or **test** a website using Go.
- Use when the user needs a **headless browser** for dynamic/SPA content (React, Vue, Angular).
- Use when the user mentions **stealth**, **anti-bot**, **avoiding detection**, **Cloudflare**, or **bot detection bypass**.
- Use when the user wants to work with the **Chrome DevTools Protocol (CDP)** directly from Go.
- Use when the user needs to **intercept** or **hijack** network requests in a browser context.
- Use when the user asks about **concurrent browser scraping** or **page pooling** in Go.
- Use when the user is migrating from **chromedp** or **Playwright Go** and wants a simpler API.

## Safety & Risk

**Risk Level: 🔵 Safe**

- **Read-Only by Default:** Default behavior is navigating and reading page content (scraping/testing).
- **Isolated Contexts:** Browser contexts are sandboxed; cookies and storage do not persist unless explicitly saved.
- **Resource Cleanup:** Designed around Go's `defer` pattern — browsers and pages close automatically.
- **No External Mutations:** Does not modify external state unless the script explicitly submits forms or POSTs data.

## Installation

```bash
# Core rod library
go get github.com/go-rod/rod@latest

# Stealth anti-detection plugin (ALWAYS include for production scraping)
go get github.com/go-rod/stealth@latest
```

Rod auto-downloads a compatible Chromium binary on first run. To pre-download:

```bash
go run github.com/nichochar/go-rod.github.io/cmd/launcher@latest
```

## Core Concepts

### Browser Lifecycle

Rod manages three layers: **Browser → Page → Element**.

```go
// Launch and connect to a browser
browser := rod.New().MustConnect()
defer browser.MustClose()

// Create a page (tab)
page := browser.MustPage("https://example.com")

// Find an element
el := page.MustElement("h1")
fmt.Println(el.MustText())
```

### Must vs Error Patterns

Rod provides two API styles for every operation:

| Style | Method | Use Case |
|:------|:-------|:---------|
| **Must** | `MustElement()`, `MustClick()`, `MustText()` | Scripting, debugging, prototyping. Panics on error. |
| **Error** | `Element()`, `Click()`, `Text()` | Production code. Returns `error` for explicit handling. |

**Production pattern:**

```go
el, err := page.Element("#login-btn")
if err != nil {
    return fmt.Errorf("login button not found: %w", err)
}
if err := el.Click(proto.InputMouseButtonLeft, 1); err != nil {
    return fmt.Errorf("click failed: %w", err)
}
```

**Scripting pattern with Try:**

```go
err := rod.Try(func() {
    page.MustElement("#login-btn").MustClick()
})
if errors.Is(err, context.DeadlineExceeded) {
    log.Println("timeout finding login button")
}
```

### Context & Timeout

Rod uses Go's `context.Context` for cancellation and timeouts. Context propagates recursively to all child operations.

```go
// Set a 5-second timeout for the entire operation chain
page.Timeout(5 * time.Second).
    MustWaitLoad().
    MustElement("title").
    CancelTimeout(). // subsequent calls are not bound by the 5s timeout
    Timeout(30 * time.Second).
    MustText()
```

### Element Selectors

Rod supports multiple selector strategies:

```go
// CSS selector (most common)
page.MustElement("div.content > p.intro")

// CSS selector with text regex matching
page.MustElementR("button", "Submit|Send")

// XPath
page.MustElementX("//div[@class='content']//p")

// Search across iframes and shadow DOM (like DevTools Ctrl+F)
page.MustSearch(".deeply-nested-element")
```

### Auto-Wait

Rod automatically retries element queries until the element appears or the context times out. You do not need manual sleeps:

```go
// This will automatically wait until the element exists
el := page.MustElement("#dynamic-content")

// Wait until the element is stable (position/size not changing)
el.MustWaitStable().MustClick()

// Wait until page has no pending network requests
wait := page.MustWaitRequestIdle()
page.MustElement("#search").MustInput("query")
wait()
> See [references/details.md](references/details.md) for full code examples.
import (
    "github.com/go-rod/rod"
    "github.com/go-rod/stealth"
)

browser := rod.New().MustConnect()
defer browser.MustClose()

// Use stealth.MustPage instead of browser.MustPage
page := stealth.MustPage(browser)
page.MustNavigate("https://bot.sannysoft.com")
```

**With error handling:**

```go
page, err := stealth.Page(browser)
if err != nil {
    return fmt.Errorf("failed to create stealth page: %w", err)
}
page.MustNavigate("https://example.com")
```

**Using stealth.JS directly (advanced — for custom page creation):**

```go
// If you need to create the page yourself (e.g., with specific options),
// inject stealth.JS manually via EvalOnNewDocument
page := browser.MustPage()
page.MustEvalOnNewDocument(stealth.JS)
page.MustNavigate("https://example.com")
```

### Verifying Stealth

Navigate to a bot detection test page to verify evasions:

```go
page := stealth.MustPage(browser)
page.MustNavigate("https://bot.sannysoft.com")
page.MustScreenshot("stealth_test.png")
```

Expected results for a properly stealth-configured browser:
- **WebDriver**: `missing (passed)`
- **Chrome**: `present (passed)`
- **Plugins Length**: `3` (not `0`)
- **Languages**: `en-US,en`

---

## Implementation Guidelines

### 1. Launcher Configuration

Use the `launcher` package to customize browser launch flags:

```go
import "github.com/go-rod/rod/lib/launcher"

url := launcher.New().
    Headless(true).             // false for debugging
    Proxy("127.0.0.1:8080").    // upstream proxy
    Set("disable-gpu", "").     // custom Chrome flag
    Delete("use-mock-keychain"). // remove a default flag
    MustLaunch()

browser := rod.New().ControlURL(url).MustConnect()
defer browser.MustClose()
```

**Debugging mode (visible browser + slow motion):**

```go
l := launcher.New().
    Headless(false).
    Devtools(true)
defer l.Cleanup()

browser := rod.New().
    ControlURL(l.MustLaunch()).
    Trace(true).
    SlowMotion(2 * time.Second).
    MustConnect()
```

### 2. Proxy Support

```go
// Set proxy at launch
url := launcher.New().
    Proxy("socks5://127.0.0.1:1080").
    MustLaunch()

browser := rod.New().ControlURL(url).MustConnect()

// Handle proxy authentication
go browser.MustHandleAuth("username", "password")()

// Ignore SSL certificate errors (for MITM proxies)
browser.MustIgnoreCertErrors(true)
```

### 3. Input Simulation

```go
import "github.com/go-rod/rod/lib/input"

// Type into an input field (replaces existing value)
page.MustElement("#email").MustInput("user@example.com")

// Simulate keyboard keys
page.Keyboard.MustType(input.Enter)

// Press key combinations
page.Keyboard.MustPress(input.ControlLeft)
page.Keyboard.MustType(input.KeyA)
page.Keyboard.MustRelease(input.ControlLeft)

// Mouse click at coordinates
page.Mouse.MustClick(input.MouseLeft)
page.Mouse.MustMoveTo(100, 200)
```

### 4. Network Request Interception (Hijacking)

> See [references/details.md](references/details.md) for full code examples.

### 5. Waiting Strategies

> See [references/details.md](references/details.md) for full code examples.

### 6. Race Selectors (Multiple Outcomes)

Handle pages where the result can be one of several outcomes (e.g., login success vs error):

```go
page.MustElement("#username").MustInput("user")
page.MustElement("#password").MustInput("pass").MustType(input.Enter)

// Race between success and error selectors
elm := page.Race().
    Element(".dashboard").MustHandle(func(e *rod.Element) {
        fmt.Println("Login successful:", e.MustText())
    }).
    Element(".error-message").MustDo()

if elm.MustMatches(".error-message") {
    log.Fatal("Login failed:", elm.MustText())
}
```

### 7. Screenshots & PDF

> See [references/details.md](references/details.md) for full code examples.

### 8. Concurrent Page Pool

> See [references/details.md](references/details.md) for full code examples.

### 9. Event Handling

```go
// Listen for console.log output
go page.EachEvent(func(e *proto.RuntimeConsoleAPICalled) {
    if e.Type == proto.RuntimeConsoleAPICalledTypeLog {
        fmt.Println(page.MustObjectsToJSON(e.Args))
    }
})()

// Wait for a specific event before proceeding
wait := page.WaitEvent(&proto.PageLoadEventFired{})
page.MustNavigate("https://example.com")
wait()
```

### 10. File Download

```go
wait := browser.MustWaitDownload()

page.MustElementR("a", "Download PDF").MustClick()

data := wait()
utils.OutputFile("downloaded.pdf", data)
```

### 11. JavaScript Evaluation

```go
// Execute JS on the page
page.MustEval(`() => console.log("hello")`)

// Pass parameters and get return value
result := page.MustEval(`(a, b) => a + b`, 1, 2)
fmt.Println(result.Int()) // 3

// Eval on a specific element ("this" = the DOM element)
title := page.MustElement("title").MustEval(`() => this.innerText`).String()

// Direct CDP calls for features Rod doesn't wrap
proto.PageSetAdBlockingEnabled{Enabled: true}.Call(page)
```

### 12. Loading Chrome Extensions

```go
extPath, _ := filepath.Abs("./my-extension")

u := launcher.New().
    Set("load-extension", extPath).
    Headless(false). // extensions require headed mode
    MustLaunch()

browser := rod.New().ControlURL(u).MustConnect()
> See [references/details.md](references/details.md) for full code examples.
