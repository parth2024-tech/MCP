#!/bin/bash

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script with sudo:"
  echo "sudo $0"
  exit 1
fi

echo "Applying Phase 2 Systemd Updates..."

# Update systemd service with V8 flags and NODE_COMPILE_CACHE
cat << 'EOF' > /etc/systemd/system/ase-mcp-server.service
[Unit]
Description=Antigravity Skills Engine (ASE) MCP Server
After=network.target

[Service]
Type=simple
User=thor
Group=thor
WorkingDirectory=/home/thor/skiils
Environment="NODE_COMPILE_CACHE=/tmp/mcp-server-compile-cache"
ExecStart=/usr/bin/node --max-semi-space-size=64 --optimize-for-size=false --turbo-instruction-scheduling=true --experimental-vm-modules tools/server/ase-mcp-server.js
Restart=on-failure
RestartSec=5

# Priority and Scheduling
Nice=-5
# Bind process tree to cores 0, 2, 3
CPUAffinity=0,2,3

[Install]
WantedBy=multi-user.target
EOF

echo "Updated /etc/systemd/system/ase-mcp-server.service with V8 flags and NODE_COMPILE_CACHE."

systemctl daemon-reload

echo ""
echo "============================================================"
echo "Phase 2 tuning applied successfully."
echo "If the server is currently running via systemd, you can restart it:"
echo "sudo systemctl restart ase-mcp-server"
echo "============================================================"
