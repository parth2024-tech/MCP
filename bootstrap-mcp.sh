#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Target directory defaults to current working directory if not specified
TARGET_DIR="${1:-$PWD}"
TARGET_DIR=$(realpath "$TARGET_DIR")

echo "================================================================="
echo "  Configuring ASE MCP Server for project: $TARGET_DIR"
echo "================================================================="

# Create configuration directories
mkdir -p "$TARGET_DIR/.cursor/mcp-profiles"
mkdir -p "$TARGET_DIR/.vscode"

# Write central server configuration template
# Using the absolute path to the central server in /home/thor/skiils
SERVER_PATH="/home/thor/skiils/tools/server/ase-mcp-server.ts"

# 1. Main .cursor/mcp.json
cat <<EOF > "$TARGET_DIR/.cursor/mcp.json"
{
  "servers": {
    "ase": {
      "type": "stdio",
      "command": "/home/thor/.local/bin/mcp-compressor",
      "args": [
        "--compression-level",
        "medium",
        "npx",
        "tsx",
        "$SERVER_PATH"
      ],
      "env": {
        "NEO4J_URI": "neo4j://127.0.0.1:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "12345678",
        "NODE_ENV": "production",
        "ASE_ALLOWED_DIRS": "/home/thor",
        "MCP_VIRTUAL_KEY": "master-key"
      }
    },
    "toonify": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "toonify-mcp"
      ]
    }
  }
}
EOF

# 2. coding.json profile
cat <<EOF > "$TARGET_DIR/.cursor/mcp-profiles/coding.json"
{
  "servers": {
    "ase": {
      "type": "stdio",
      "command": "/home/thor/.local/bin/mcp-compressor",
      "args": ["--compression-level", "medium", "npx", "tsx", "$SERVER_PATH"]
    },
    "toonify": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "toonify-mcp"]
    }
  }
}
EOF

# 3. fullstack.json profile
cat <<EOF > "$TARGET_DIR/.cursor/mcp-profiles/fullstack.json"
{
  "servers": {
    "ase": {
      "type": "stdio",
      "command": "/home/thor/.local/bin/mcp-compressor",
      "args": ["--compression-level", "medium", "npx", "tsx", "$SERVER_PATH"]
    },
    "postgres-db": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/skiils"]
    },
    "browser": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    },
    "toonify": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "toonify-mcp"]
    }
  }
}
EOF

# 4. research.json profile
cat <<EOF > "$TARGET_DIR/.cursor/mcp-profiles/research.json"
{
  "servers": {
    "ase": {
      "type": "stdio",
      "command": "/home/thor/.local/bin/mcp-compressor",
      "args": ["--compression-level", "medium", "npx", "tsx", "$SERVER_PATH"]
    },
    "web-search": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"]
    },
    "toonify": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "toonify-mcp"]
    }
  }
}
EOF

# 5. VS Code mcp.json
cat <<EOF > "$TARGET_DIR/.vscode/mcp.json"
{
  "servers": {
    "ase": {
      "type": "stdio",
      "command": "/home/thor/.local/bin/mcp-compressor",
      "args": ["--compression-level", "medium", "npx", "tsx", "$SERVER_PATH"]
    },
    "toonify": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "toonify-mcp"]
    }
  }
}
EOF

echo "✅ Configuration successfully written to target directories:"
echo "   - $TARGET_DIR/.cursor/mcp.json"
echo "   - $TARGET_DIR/.cursor/mcp-profiles/coding.json"
echo "   - $TARGET_DIR/.cursor/mcp-profiles/fullstack.json"
echo "   - $TARGET_DIR/.cursor/mcp-profiles/research.json"
echo "   - $TARGET_DIR/.vscode/mcp.json"
echo ""
echo "✅ Server entrypoint is verified."
echo "================================================================="
