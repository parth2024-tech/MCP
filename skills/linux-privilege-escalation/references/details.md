# Linux Privilege Escalation — Code Reference

## ### Enumeration Commands Summary

| Purpose | Command |
|---------|---------|
| Kernel version | `uname -a` |
| Current user | `id` |
| Sudo rights | `sudo -l` |
| SUID files | `find / -perm -u=s -type f 2>/dev/null` |
| Capabilities | `getcap -r / 2>/dev/null` |
| Cron jobs | `cat /etc/crontab` |
| Writable dirs | `find / -writable -type d 2>/dev/null` |
| NFS exports | `cat /etc/exports` |


## # Perl

```

### Key Resources
- GTFOBins: https://gtfobins.github.io
- LinPEAS: https://github.com/carlospolop/PEASS-ng
- Linux Exploit Suggester: https://github.com/mzet-/linux-exploit-suggester

## Constraints and Guardrails

### Operational Boundaries
- Verify kernel exploits in test environment before production use
- Failed kernel exploits may crash the system
- Document all changes made during privilege escalation
- Maintain access persistence only as authorized

### Technical Limitations
- Modern kernels may have exploit mitigations (ASLR, SMEP, SMAP)
- AppArmor/SELinux may restrict exploitation techniques
- Container environments limit kernel-level exploits
- Hardened systems may have restricted sudo configurations

### Legal and Ethical Requirements
- Written authorization required before testing
- Stay within defined scope boundaries
- Report critical findings immediately
- Do not access data beyond scope requirements

## Examples

### Example 1: Sudo to Root via find

**Scenario**: User has sudo rights for find command

```bash


