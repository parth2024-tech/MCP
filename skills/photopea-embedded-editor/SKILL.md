---
name: photopea-embedded-editor
description: Embed Photopea in web apps using photopea.js. Covers embedding, file I/O, scripting, exporting, layers, text, filters, and the full Photoshop-compatible API. Use when the task involves photopea embedded editor.
risk: safe
source: community
source_repo: yikuansun/PhotopeaAPI
source_type: community
license: MIT
license_source: "https://github.com/yikuansun/PhotopeaAPI/blob/master/LICENSE"
date_added: 2026-05-20
---

# Photopea Embedded Editor Skill
## Using photopea.js (yikuansun/PhotopeaAPI) in Websites & Apps

---

## When to Use This Skill

Use this skill for **every task** that involves:
- Embedding Photopea as an image editor inside a webpage or web app
- Controlling an embedded Photopea instance from your JavaScript code
- Automating image editing workflows from a host page (open files, run scripts, export results)
- Building an image editing feature into your product using Photopea as the engine
- Writing scripts to manipulate documents, layers, text, selections, filters, colors, and paths

**Do NOT** use raw `postMessage` wiring — always use `photopea.js` as the wrapper.

---

## Library: photopea.js

`photopea.js` is a Promises-based JavaScript wrapper around the Photopea Live Messaging API.
Repository: https://github.com/yikuansun/PhotopeaAPI
npm package: https://www.npmjs.com/package/photopea

### Installation

**CDN (no build step)**
```html
<script src="https://cdn.jsdelivr.net/npm/photopea@1.1.1/dist/photopea.min.js"></script>
```

**Self-hosted**
```html
<script src="./photopea.min.js"></script>
```

**npm (Webpack / Vite / Rollup)**
```bash
npm install photopea
```
```js
import Photopea from "photopea";
> See [references/details.md](references/details.md) for full code examples.
<div id="editor" style="width:1000px; height:650px;"></div>
<script src="https://cdn.jsdelivr.net/npm/photopea@1.1.1/dist/photopea.min.js"></script>
<script>
  Photopea.createEmbed(document.getElementById("editor")).then(async (pea) => {
    // pea is ready
  });
</script>
```

**React:**
```jsx
import { useEffect, useRef } from "react";
import Photopea from "photopea";

export default function Editor() {
  const containerRef = useRef(null);
  const peaRef       = useRef(null);

  useEffect(() => {
    if (!containerRef.current || peaRef.current) return;
    Photopea.createEmbed(containerRef.current).then((pea) => {
      peaRef.current = pea;
    });
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "650px" }} />;
}
```

---

## Step 2 — Opening Files

```js
// Remote URL → new document
await pea.openFromURL("https://example.com/design.psd", false);

// Remote URL → smart object layer inside current document
await pea.openFromURL("https://example.com/overlay.png", true);

// Local file (user input → ArrayBuffer → loadAsset)
document.getElementById("fileInput").addEventListener("change", async (e) => {
  const buf = await e.target.files[0].arrayBuffer();
  await pea.loadAsset(buf);
});

// Base64 data URI via runScript
await pea.runScript(`app.open("data:image/png;base64,iVBORw0...");`);
```

---

## Step 3 — Running Scripts

`runScript` sends a JS string, returns an array of `app.echoToOE(...)` values + `"done"` last.

```js
const result = await pea.runScript(`app.echoToOE("hello");`);
// result → ["hello", "done"]

// Return structured data
const out = await pea.runScript(`
  app.echoToOE(JSON.stringify({
    width:  app.activeDocument.width,
    height: app.activeDocument.height,
    layers: app.activeDocument.layers.length
  }));
`);
const info = JSON.parse(out[0]);
```

---

## Step 4 — Exporting

> See [references/details.md](references/details.md) for full code examples.

**Export format strings for `saveToOE`:**

| String | Format |
|--------|--------|
| `"png"` | PNG lossless |
| `"jpg"` | JPEG default |
| `"jpg:0.8"` | JPEG quality 0.0–1.0 |
| `"webp:0.7"` | WebP quality 0.0–1.0 |
| `"psd"` | Full PSD |
| `"psd:true"` | Minified PSD |
| `"svg:true"` | SVG |

---

## Step 5 — Loading Assets

```js
// Font
const buf = await (await fetch("https://example.com/MyFont.otf")).arrayBuffer();
await pea.loadAsset(buf);
// Now usable in textItem.font

// Brush
await pea.loadAsset(await (await fetch("Nature.ABR")).arrayBuffer());

// Gradient
await pea.loadAsset(await (await fetch("Gradients.GRD")).arrayBuffer());
```

---

## Step 6 — Plugin Mode

```js
// Your page is inside Photopea's sidebar iframe
const pea = new Photopea(window.parent);

const out = await pea.runScript(`app.echoToOE(app.activeDocument.width);`);
console.log("Width:", out[0]);

// Load an asset from your plugin
const buf = await (await fetch("https://my-assets.com/sticker.png")).arrayBuffer();
await pea.loadAsset(buf);
```

Plugin config:
```json
{
  "environment": {
    "plugins": [{
      "name": "My Plugin",
      "url":  "https://my-plugin.example.com",
      "icon": "===https://my-plugin.example.com/icon.png"
    }]
  }
}
```

---

## Utility Patterns

### addImageAndWait — robust async layer insertion
> See [references/details.md](references/details.md) for full code examples.

### getDocumentAsImage — returns `<img>` element
```js
async function getDocumentAsImage(pea) {
  const result = await pea.runScript(`app.activeDocument.saveToOE('png')`);
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.addEventListener("load", (e) => {
      const img = new Image(); img.src = e.target.result; resolve(img);
    });
    fr.readAsDataURL(new Blob([result[0]], { type: "image/png" }));
  });
}
```

---

## Real-World Patterns

### Pattern A — Open + Export UI
> See [references/details.md](references/details.md) for full code examples.

### Pattern B — Template + Text Edit + Export
```js
async function generateCard(pea, name, tagline) {
  await pea.openFromURL("https://example.com/card.psd", false);
  await pea.runScript(`
    app.activeDocument.layers.getByName("Name").textItem.contents    = "${name}";
    app.activeDocument.layers.getByName("Tagline").textItem.contents = "${tagline}";
  `);
  return await pea.exportImage("png");
}
```

### Pattern C — Batch Watermark
```js
async function batchWatermark(pea, imageURLs, watermarkURL) {
  const results = [];
  for (const url of imageURLs) {
    await pea.openFromURL(url, false);
    await pea.openFromURL(watermarkURL, true);
    await pea.runScript(`
      var doc = app.activeDocument, wm = doc.activeLayer;
      wm.translate(doc.width - wm.bounds[2] - 20, doc.height - wm.bounds[3] - 20);
      wm.opacity = 70;
    `);
    results.push(await pea.exportImage("png"));
    await pea.runScript(`app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);`);
  }
  return results;
}
> See [references/details.md](references/details.md) for full code examples.
var savedUnits = app.preferences.rulerUnits;
app.preferences.rulerUnits = Units.PIXELS;
// ... your code ...
app.preferences.rulerUnits = savedUnits;
var doc = app.activeDocument;

// Resize image to 1920×1080 at 72dpi bicubic
doc.resizeImage(1920, 1080, 72, ResampleMethod.BICUBIC);

// Expand canvas to 2000px wide, keeping content centered
doc.resizeCanvas(2000, doc.height, AnchorPosition.MIDDLECENTER);

// Crop to a region
doc.crop([100, 100, 900, 600]);

// Trim transparent edges
doc.trim(TrimType.TRANSPARENT, true, true, true, true);

// Flip horizontal
doc.flipCanvas(Direction.HORIZONTAL);

// Change to grayscale
doc.changeMode(ChangeMode.GRAYSCALE);

// One undo step for many operations
doc.suspendHistory("Batch Edit", "action");
// (Inside Photopea, all ops become one history state)

// Export PNG to filesystem (triggers ZIP download)
var opts = new ExportOptionsSaveForWeb();
opts.format  = SaveDocumentType.PNG;
opts.PNG8    = false;
opts.quality = 100;
doc.exportDocument(new File("/output.png"), ExportType.SAVEFORWEB, opts);

// Close without saving
doc.close(SaveOptions.DONOTSAVECHANGES);
```

---

## `Layers` / `ArtLayers` / `LayerSets` Collections

These collections exist on `Document`, `LayerSet` (groups within groups), and can be iterated.

> See [references/details.md](references/details.md) for full code examples.

---

## `ArtLayer` — Individual Layer

### Properties

> See [references/details.md](references/details.md) for full code examples.

### Transform Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `translate` | `(deltaX, deltaY)` | Move layer by offset |
| `rotate` | `(angle, anchor)` | Rotate by degrees. AnchorPosition optional (default center) |
| `resize` | `(widthPct, heightPct, anchor)` | Scale as percentage of current size |
| `rasterize` | `(target)` | Rasterize. RasterizeType: `ENTIRE`, `FILLCONTENT`, `LAYERCLIPPINGMASK`, `LINKEDLAYERS`, `SHAPE`, `TEXTCONTENTS`, `VECTORMASK` |

### Layer Management Methods

> See [references/details.md](references/details.md) for full code examples.

### Adjustment Methods on ArtLayer

> See [references/details.md](references/details.md) for full code examples.

### Filter Methods on ArtLayer

> See [references/details.md](references/details.md) for full code examples.

**Practical examples:**

---

## `LayerSet` — Group Layer

A LayerSet is a folder/group in the Layers panel. It has the same layer management methods as `Document`.

### Properties


### Methods
Same as Document for layer management: `layers.add()`, `artLayers.add()`, `layerSets.add()`, `.getByName()`, plus `duplicate()`, `remove()`, `move()`.

```js
// Create group with layers inside
var group = doc.layerSets.add();
group.name = "Product Card";

var bgLayer   = group.artLayers.add(); bgLayer.name = "Background";
var textLayer = group.artLayers.add(); textLayer.kind = LayerKind.TEXT;
textLayer.textItem.contents = "Buy Now";
textLayer.textItem.size     = 36;

// Collapse/expand group (Photopea specific, not in standard DOM)
// Use visibility as workaround

// Get specific layer inside a group
var innerLayer = doc.layerSets.getByName("Header Group").artLayers.getByName("Title");
> See [references/details.md](references/details.md) for full code examples.
var layer = doc.layers.getByName("Headline");
var text  = layer.textItem;

// Set content
text.contents = "Hello World";

// Style
text.font   = "Verdana-Bold";
text.size   = 72;
text.color.rgb.hexValue = "FF0000";    // red

// Position point text at (50, 100)
text.position = [50, 100];

// Center align
text.justification = Justification.CENTER;

// Paragraph text with bounding box
text.kind   = TextType.PARAGRAPHTEXT;
text.width  = new UnitValue("400 pixels");
text.height = new UnitValue("200 pixels");

// Letter spacing
text.tracking = 100;   // 10% spacing

// Scale text horizontally to 80%
text.horizontalScale = 80;

// Warp arc
text.warpStyle = WarpStyle.ARC;
text.warpBend  = 30;

// Read all text styles as JSON (Photopea extension)
var styles = JSON.parse(text.totalTextStyle);
app.echoToOE(JSON.stringify(styles));
```

---

## Creating a Text Layer from Scratch

> See [references/details.md](references/details.md) for full code examples.

---

## `SolidColor` — Color Object

> See [references/details.md](references/details.md) for full code examples.

---

## `Selection` — Selection Object

Access via `doc.selection`.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `bounds` | array | `[left, top, right, bottom]` bounding rectangle |
| `solid` | boolean | Whether selection is a solid rectangle |

### Methods


**Practical examples:**

---

## `BlendMode` Enum — All Values

Used in `layer.blendMode` (string form in Photopea) and `BlendMode` constant (standard):

> See [references/details.md](references/details.md) for full code examples.

```js
// Use either form:
layer.blendMode = BlendMode.SCREEN;     // constant
layer.blendMode = "scrn";               // string (Photopea internal form)
// Identify layer type
var layer = doc.activeLayer;
if (layer.kind === LayerKind.TEXT)         /* text layer */;
if (layer.kind === LayerKind.SMARTOBJECT)  /* smart object */;
if (layer.typename === "LayerSet")         /* group */;

// Filter: collect all text layers recursively
var textLayers = [];
function collectText(parent) {
  for (var i = 0; i < parent.layers.length; i++) {
    var l = parent.layers[i];
    if (l.typename === "LayerSet") collectText(l);
    else if (l.kind === LayerKind.TEXT) textLayers.push(l);
  }
}
collectText(doc);
// Export PNG
var pngOpts = new ExportOptionsSaveForWeb();
pngOpts.format      = SaveDocumentType.PNG;
pngOpts.PNG8        = false;    // PNG-24
pngOpts.quality     = 100;
pngOpts.transparency = true;
doc.exportDocument(new File("/export.png"), ExportType.SAVEFORWEB, pngOpts);

// Export JPEG
var jpgOpts = new ExportOptionsSaveForWeb();
jpgOpts.format  = SaveDocumentType.JPEG;
jpgOpts.quality = 80;    // 0–100
doc.exportDocument(new File("/export.jpg"), ExportType.SAVEFORWEB, jpgOpts);

// Export GIF
var gifOpts = new ExportOptionsSaveForWeb();
gifOpts.format     = SaveDocumentType.GIF;
gifOpts.colors     = 256;
gifOpts.dither     = 100;
gifOpts.transparency = true;
doc.exportDocument(new File("/export.gif"), ExportType.SAVEFORWEB, gifOpts);
```

---

## `executeAction` — Advanced Operations

Used for operations not exposed in the standard DOM (adjustments applied as adjustment layers,
Smart Object editing, etc.). Takes the Photoshop Action Manager approach.

> See [references/details.md](references/details.md) for full code examples.

---

## Complete Practical Script Examples

### 1. Rename all text layers based on their contents
```js
app.preferences.rulerUnits = Units.PIXELS;
var doc = app.activeDocument;

function processLayers(parent) {
  for (var i = 0; i < parent.layers.length; i++) {
    var l = parent.layers[i];
    if (l.typename === "LayerSet") processLayers(l);
    else if (l.kind === LayerKind.TEXT) {
      l.name = l.textItem.contents.substring(0, 30);
    }
  }
}
processLayers(doc);
