# Bun Development — Code Reference

## ### 1.1 Installation

```bash
# macOS / Linux
brew install oven-sh/bun/bun

# Alternative: download the official installer, inspect it, then execute it
curl -fsSLo /tmp/bun-install.sh https://bun.sh/install
sed -n '1,160p' /tmp/bun-install.sh
bash /tmp/bun-install.sh

# Windows
powershell -NoProfile -Command "Invoke-WebRequest https://bun.sh/install.ps1 -OutFile $env:TEMP\\bun-install.ps1; Get-Content $env:TEMP\\bun-install.ps1 -TotalCount 120; powershell -ExecutionPolicy Bypass -File $env:TEMP\\bun-install.ps1"

# Homebrew
brew tap oven-sh/bun
brew install bun

# npm (if needed)
npm install -g bun

# Upgrade
bun upgrade
```


## ### 2.2 package.json

```json
{
  "name": "my-bun-project",
  "version": "1.0.0",
  "module": "index.ts",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch index.ts",
    "start": "bun run index.ts",
    "test": "bun test",
    "build": "bun build ./index.ts --outdir ./dist",
    "lint": "bunx eslint ."
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```


## ### 2.3 tsconfig.json (Bun-optimized)

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "composite": true,
    "strict": true,
    "downlevelIteration": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": true,
    "types": ["bun-types"]
  }
}
```


## ### 3.1 Installing Packages

```bash
# Install from package.json
bun install              # or 'bun i'

# Add dependencies
bun add express          # Regular dependency
bun add -d typescript    # Dev dependency
bun add -D @types/node   # Dev dependency (alias)
bun add --optional pkg   # Optional dependency

# From specific registry
bun add lodash --registry https://registry.npmmirror.com

# Install specific version
bun add react@18.2.0
bun add react@latest
bun add react@next

# From git
bun add github:user/repo
bun add git+https://github.com/user/repo.git
```


## ### 5.1 File System (Bun.file)

```typescript
// Read file
const file = Bun.file("./data.json");
const text = await file.text();
const json = await file.json();
const buffer = await file.arrayBuffer();

// File info
console.log(file.size); // bytes
console.log(file.type); // MIME type

// Write file
await Bun.write("./output.txt", "Hello, Bun!");
await Bun.write("./data.json", JSON.stringify({ foo: "bar" }));

// Stream large files
const reader = file.stream();
for await (const chunk of reader) {
  console.log(chunk);
}
```


## ### 5.2 HTTP Server (Bun.serve)

```typescript
const server = Bun.serve({
  port: 3000,

  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Hello World!");
    }

    if (url.pathname === "/api/users") {
      return Response.json([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);
    }

    return new Response("Not Found", { status: 404 });
  },

  error(error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
```


## ### 5.3 WebSocket Server

```typescript
const server = Bun.serve({
  port: 3000,

  fetch(req, server) {
    // Upgrade to WebSocket
    if (server.upgrade(req)) {
      return; // Upgraded
    }
    return new Response("Upgrade failed", { status: 500 });
  },

  websocket: {
    open(ws) {
      console.log("Client connected");
      ws.send("Welcome!");
    },

    message(ws, message) {
      console.log(`Received: ${message}`);
      ws.send(`Echo: ${message}`);
    },

    close(ws) {
      console.log("Client disconnected");
    },
  },
});
```


## ### 5.4 SQLite (Bun.sql)

```typescript
import { Database } from "bun:sqlite";

const db = new Database("mydb.sqlite");

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// Insert
const insert = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
insert.run("Alice", "alice@example.com");

// Query
const query = db.prepare("SELECT * FROM users WHERE name = ?");
const user = query.get("Alice");
console.log(user); // { id: 1, name: "Alice", email: "alice@example.com" }

// Query all
const allUsers = db.query("SELECT * FROM users").all();
```


## ### 6.3 Matchers

```typescript
import { expect, test } from "bun:test";

test("matchers", () => {
  // Equality
  expect(1).toBe(1);
  expect({ a: 1 }).toEqual({ a: 1 });
  expect([1, 2]).toContain(1);

  // Comparisons
  expect(10).toBeGreaterThan(5);
  expect(5).toBeLessThanOrEqual(5);

  // Truthiness
  expect(true).toBeTruthy();
  expect(null).toBeNull();
  expect(undefined).toBeUndefined();

  // Strings
  expect("hello").toMatch(/ell/);
  expect("hello").toContain("ell");

  // Arrays
  expect([1, 2, 3]).toHaveLength(3);

  // Exceptions
  expect(() => {
    throw new Error("fail");
  }).toThrow("fail");

  // Async
  await expect(Promise.resolve(1)).resolves.toBe(1);
  await expect(Promise.reject("err")).rejects.toBe("err");
});
```


## ### 7.2 Build API

```typescript
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "browser", // or "bun", "node"
  minify: true,
  sourcemap: "external",
  splitting: true,
  format: "esm",

  // External packages (not bundled)
  external: ["react", "react-dom"],

  // Define globals
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },

  // Naming
  naming: {
    entry: "[name].[hash].js",
    chunk: "chunks/[name].[hash].js",
    asset: "assets/[name].[hash][ext]",
  },
});

if (!result.success) {
  console.error(result.logs);
}
```


## ### 8.3 Differences from Node.js

```typescript
// ❌ Node.js specific (may not work)
require("module")             // Use import instead
require.resolve("pkg")        // Use import.meta.resolve
__non_webpack_require__       // Not supported

// ✅ Bun equivalents
import pkg from "pkg";
const resolved = import.meta.resolve("pkg");
Bun.resolveSync("pkg", process.cwd());

// ❌ These globals differ
process.hrtime()              // Use Bun.nanoseconds()
setImmediate()                // Use queueMicrotask()

// ✅ Bun-specific features
const file = Bun.file("./data.txt");  // Fast file API
Bun.serve({ port: 3000, fetch: ... }); // Fast HTTP server
Bun.password.hash(password);           // Built-in hashing
```


## # Then run the bundle

```

---

## Quick Reference

| Task         | Command                                    |
| :----------- | :----------------------------------------- |
| Init project | `bun init`                                 |
| Install deps | `bun install`                              |
| Add package  | `bun add <pkg>`                            |
| Run script   | `bun run <script>`                         |
| Run file     | `bun run file.ts`                          |
| Watch mode   | `bun --watch run file.ts`                  |
| Run tests    | `bun test`                                 |
| Build        | `bun build ./src/index.ts --outdir ./dist` |
| Execute pkg  | `bunx <pkg>`                               |

---

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [Elysia Framework](https://elysiajs.com/)
- [Bun Discord](https://bun.sh/discord)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


