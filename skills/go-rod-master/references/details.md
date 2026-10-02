# Go Rod Master — Code Reference

## ### Auto-Wait

```

---

## Stealth & Anti-Bot Detection (go-rod/stealth)

> **IMPORTANT:** For any production scraping or automation against real websites, ALWAYS use `stealth.MustPage()` instead of `browser.MustPage()`. This is the single most important step for avoiding bot detection.

### How Stealth Works

The `go-rod/stealth` package injects JavaScript evasions into every new page that:

- **Remove `navigator.webdriver`** — the primary headless detection signal.
- **Spoof WebGL vendor/renderer** — presents real GPU info (e.g., "Intel Inc." / "Intel Iris OpenGL Engine") instead of headless markers like "Google SwiftShader".
- **Fix Chrome plugin array** — reports proper `PluginArray` type with realistic plugin count.
- **Patch permissions API** — returns `"prompt"` instead of bot-revealing values.
- **Set realistic languages** — reports `en-US,en` instead of empty arrays.
- **Fix broken image dimensions** — headless browsers report 0x0; stealth fixes this to 16x16.

### Usage

**Creating a stealth page (recommended for all production use):**

```go


## ### 4. Network Request Interception (Hijacking)

```go
router := browser.HijackRequests()
defer router.MustStop()

// Block all image requests
router.MustAdd("*.png", func(ctx *rod.Hijack) {
    ctx.Response.Fail(proto.NetworkErrorReasonBlockedByClient)
})

// Modify request headers
router.MustAdd("*api.example.com*", func(ctx *rod.Hijack) {
    ctx.Request.Req().Header.Set("Authorization", "Bearer token123")
    ctx.MustLoadResponse()
})

// Modify response body
router.MustAdd("*.js", func(ctx *rod.Hijack) {
    ctx.MustLoadResponse()
    ctx.Response.SetBody(ctx.Response.Body() + "/n// injected")
})

go router.Run()
```


## ### 5. Waiting Strategies

```go
// Wait for page load event
page.MustWaitLoad()

// Wait for no pending network requests (AJAX idle)
wait := page.MustWaitRequestIdle()
page.MustElement("#search").MustInput("query")
wait()

// Wait for element to be stable (not animating)
page.MustElement(".modal").MustWaitStable().MustClick()

// Wait for element to become invisible
page.MustElement(".loading").MustWaitInvisible()

// Wait for JavaScript condition
page.MustWait(`() => document.title === 'Ready'`)

// Wait for specific navigation/event
wait := page.WaitEvent(&proto.PageLoadEventFired{})
page.MustNavigate("https://example.com")
wait()
```


## ### 7. Screenshots & PDF

```go
// Full-page screenshot
page.MustScreenshot("page.png")

// Custom screenshot (JPEG, specific region)
img, _ := page.Screenshot(true, &proto.PageCaptureScreenshot{
    Format:  proto.PageCaptureScreenshotFormatJpeg,
    Quality: gson.Int(90),
    Clip: &proto.PageViewport{
        X: 0, Y: 0, Width: 1280, Height: 800, Scale: 1,
    },
})
utils.OutputFile("screenshot.jpg", img)

// Scroll screenshot (captures full scrollable page)
img, _ := page.MustWaitStable().ScrollScreenshot(nil)
utils.OutputFile("full_page.jpg", img)

// PDF export
page.MustPDF("output.pdf")
```


## ### 8. Concurrent Page Pool

```go
pool := rod.NewPagePool(5) // max 5 concurrent pages

create := func() *rod.Page {
    return browser.MustIncognito().MustPage()
}

var wg sync.WaitGroup
for _, url := range urls {
    wg.Add(1)
    go func(u string) {
        defer wg.Done()

        page := pool.MustGet(create)
        defer pool.Put(page)

        page.MustNavigate(u).MustWaitLoad()
        fmt.Println(page.MustInfo().Title)
    }(url)
}
wg.Wait()

pool.Cleanup(func(p *rod.Page) { p.MustClose() })
```


## ### 12. Loading Chrome Extensions

```

---

## Examples

See the `examples/` directory for complete, runnable Go files:
- `examples/basic_scrape.go` — Minimal scraping example
- `examples/stealth_page.go` — Anti-detection with go-rod/stealth
- `examples/request_hijacking.go` — Intercepting and modifying network requests
- `examples/concurrent_pages.go` — Page pool for concurrent scraping

---

## Best Practices

- ✅ **ALWAYS use `stealth.MustPage(browser)`** instead of `browser.MustPage()` for real-world sites.
- ✅ **ALWAYS `defer browser.MustClose()`** immediately after connecting.
- ✅ Use the error-returning API (not `Must*`) in production code.
- ✅ Set explicit timeouts with `.Timeout()` — never rely on defaults for production.
- ✅ Use `browser.MustIncognito().MustPage()` for isolated sessions.
- ✅ Use `PagePool` for concurrent scraping instead of spawning unlimited pages.
- ✅ Use `MustWaitStable()` before clicking elements that might be animating.
- ✅ Use `MustWaitRequestIdle()` after actions that trigger AJAX calls.
- ✅ Use `launcher.New().Headless(false).Devtools(true)` for debugging.
- ❌ **NEVER** use `time.Sleep()` for waiting — use Rod's built-in wait methods.
- ❌ **NEVER** create a new `Browser` per task — create one Browser, use multiple `Page` instances.
- ❌ **NEVER** use `browser.MustPage()` for production scraping — use `stealth.MustPage()`.
- ❌ **NEVER** ignore errors in production — always handle them explicitly.
- ❌ **NEVER** forget to defer-close browsers, pages, and hijack routers.

## Common Pitfalls

- **Problem:** Element not found even though it exists on the page.
  **Solution:** The element may be inside an iframe or shadow DOM. Use `page.MustSearch()` instead of `page.MustElement()` — it searches across all iframes and shadow DOMs.

- **Problem:** Click doesn't work because the element is animating.
  **Solution:** Call `el.MustWaitStable()` before `el.MustClick()`.

- **Problem:** Bot detection despite using stealth.
  **Solution:** Combine `stealth.MustPage()` with: randomized viewport sizes, realistic User-Agent strings, human-like input delays between keystrokes, and random idle behaviors (scroll, hover).

- **Problem:** Browser process leaks (zombie processes).
  **Solution:** Always `defer browser.MustClose()`. Rod uses [leakless](https://github.com/ysmood/leakless) to kill zombies after main process crash, but explicit cleanup is preferred.

- **Problem:** Timeout errors on slow pages.
  **Solution:** Use chained context: `page.Timeout(30 * time.Second).MustWaitLoad()`. For AJAX-heavy pages, use `MustWaitRequestIdle()` instead of `MustWaitLoad()`.

- **Problem:** HijackRequests router not intercepting requests.
  **Solution:** You must call `go router.Run()` after setting up routes, and `defer router.MustStop()` for cleanup.

## Limitations

- **CAPTCHAs:** Rod does not include CAPTCHA solving. External services (2captcha, etc.) must be integrated separately.
- **Extreme Anti-Bot:** While `go-rod/stealth` handles common detection (WebDriver, plugin fingerprints, WebGL), extremely strict systems (some Cloudflare configurations, Akamai Bot Manager) may still detect automation. Additional measures (residential proxies, human-like behavioral patterns) may be needed.
- **DRM Content:** Cannot interact with DRM-protected media (e.g., Widevine).
- **Resource Usage:** Each browser instance consumes significant RAM (~100-300MB+). Use `PagePool` and limit concurrency on memory-constrained systems.
- **Extensions in Headless:** Chrome extensions do not work in headless mode. Use `Headless(false)` with XVFB for server environments.
- **Platform:** Requires a Chromium-compatible browser. Does not support Firefox or Safari.

## Documentation References

- [Official Documentation](https://go-rod.github.io/) — Guides, tutorials, FAQ
- [Go API Reference](https://pkg.go.dev/github.com/go-rod/rod) — Complete type and method documentation
- [go-rod/stealth](https://github.com/go-rod/stealth) — Anti-bot detection plugin
- [Examples (source)](https://github.com/go-rod/rod/blob/main/examples_test.go) — Official example tests
- [Rod vs Chromedp Comparison](https://github.com/nichochar/go-rod.github.io/blob/main/lib/examples/compare-chromedp) — Migration reference
- [Chrome DevTools Protocol Docs](https://chromedevtools.github.io/devtools-protocol/) — Underlying protocol reference
- [Chrome CLI Flags Reference](https://peter.sh/experiments/chromium-command-line-switches) — Launcher flag documentation
- `references/api-reference.md` — Quick-reference cheat sheet


