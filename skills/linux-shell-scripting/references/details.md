# Linux Shell Scripting — Code Reference

## # Log current CPU usage to a file with timestamp

```bash
#!/bin/bash
output_file="system_health_check.txt"

# Perform system health check and save results to a file
{
    echo "System Health Check - $(date)"
    echo "================================"
    echo ""
    echo "Uptime:"
    uptime
    echo ""
    echo "Load Average:"
    cat /proc/loadavg
    echo ""
    echo "Memory Usage:"
    free -h
    echo ""
    echo "Disk Usage:"
    df -h
    echo ""
    echo "Top Processes:"
    ps aux --sort=-%cpu | head -10
} > "$output_file"

echo "System health check saved to $output_file"
```


## # Generate a random password

```bash
#!/bin/bash
file="$1"
action="${2:-encrypt}"

if [ -z "$file" ]; then
    echo "Usage: $0 <file> [encrypt|decrypt]"
    exit 1
fi

if [ "$action" == "encrypt" ]; then
    # Encrypt file using AES-256-CBC
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "$file" -out "$file.enc"
    echo "File encrypted: $file.enc"
elif [ "$action" == "decrypt" ]; then
    # Decrypt file
    output_file="${file%.enc}"
    openssl enc -aes-256-cbc -d -pbkdf2 -in "$file" -out "$output_file"
    echo "File decrypted: $output_file"
fi
```


## ### Phase 9: System Information

```bash
#!/bin/bash
output_file="system_info_$(hostname)_$(date +%Y%m%d).txt"

{
    echo "System Information Report"
    echo "Generated: $(date)"
    echo "========================="
    echo ""
    echo "Hostname: $(hostname)"
    echo "OS: $(uname -a)"
    echo ""
    echo "CPU Info:"
    lscpu | grep -E "Model name|CPU\(s\)|Thread"
    echo ""
    echo "Memory:"
    free -h
    echo ""
    echo "Disk Space:"
    df -h
    echo ""
    echo "Network Interfaces:"
    ip -br addr
    echo ""
    echo "Logged In Users:"
    who
} > "$output_file"

echo "System info saved to $output_file"
```


## # Execute a script on a remote server via SSH

```

## Quick Reference

### Common Script Patterns

| Pattern | Purpose |
|---------|---------|
| `#!/bin/bash` | Shebang for bash |
| `$(date +%Y%m%d)` | Date formatting |
| `$((expression))` | Arithmetic |
| `${var:-default}` | Default value |
| `"$@"` | All arguments |

### Useful Commands

| Command | Purpose |
|---------|---------|
| `chmod +x script.sh` | Make executable |
| `./script.sh` | Run script |
| `nohup ./script.sh &` | Run in background |
| `crontab -e` | Edit cron jobs |
| `source script.sh` | Run in current shell |

### Cron Format
Minute(0-59) Hour(0-23) Day(1-31) Month(1-12) Weekday(0-7, 0/7=Sun)

## Constraints and Limitations

- Always test scripts in non-production first
- Use absolute paths to avoid errors
- Quote variables to handle spaces properly
- Many scripts require root/sudo privileges
- Use `bash -x script.sh` for debugging

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.


