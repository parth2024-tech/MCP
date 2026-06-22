#!/bin/bash

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script with sudo:"
  echo "sudo $0"
  exit 1
fi

echo "Applying Phase 1 Arch Linux System-Level Tuning..."

# 1. systemd service for ASE MCP Server
cat << 'EOF' > /etc/systemd/system/ase-mcp-server.service
[Unit]
Description=Antigravity Skills Engine (ASE) MCP Server
After=network.target

[Service]
Type=simple
User=thor
Group=thor
WorkingDirectory=/home/thor/skiils
ExecStart=/usr/bin/node tools/server/ase-mcp-server.js
Restart=on-failure
RestartSec=5

# Priority and Scheduling
Nice=-5
# Bind process tree to cores 0, 2, 3
CPUAffinity=0,2,3

[Install]
WantedBy=multi-user.target
EOF
echo "Created /etc/systemd/system/ase-mcp-server.service"

systemctl daemon-reload

# 2. Swappiness
cat << 'EOF' > /etc/sysctl.d/99-ase-swappiness.conf
# Favor keeping active process memory in RAM over swapping
vm.swappiness = 10
EOF
sysctl -w vm.swappiness=10
echo "Configured vm.swappiness=10"

# 3. Transparent Huge Pages (THP)
cat << 'EOF' > /etc/tmpfiles.d/thp.conf
# Ensure THP is always enabled across reboots for V8 Float32Array performance
w /sys/kernel/mm/transparent_hugepage/enabled - - - - always
EOF
echo "always" > /sys/kernel/mm/transparent_hugepage/enabled
echo "Configured THP=always"

# 4. Ext4 journal checksum notification
echo ""
echo "============================================================"
echo "Phase 1 tuning applied successfully."
echo "Note: To optionally disable ext4 journal checksum on your root drive for faster SQLite WAL commits, you can manually run:"
echo "tune2fs -O ^journal_checksum /dev/nvme0n1p2"
echo "============================================================"
