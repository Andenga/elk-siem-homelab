# ELK SIEM Homelab

A self-hosted SIEM detecting simulated attacks across Windows and Linux endpoints, built on the Elastic Stack, with detections written as Sigma rules and mapped to MITRE ATT&CK.

[Demo video](#) &nbsp;•&nbsp;  [Detections](#detections-implemented)

---

## Overview

Most "SIEM homelab" repos on GitHub stop at "I installed ELK and it works." This one goes a step further: for every technique simulated, there's a Sigma detection rule behind it, a MITRE ATT&CK mapping, and a short write-up documenting what was detected, how, and what an analyst would do next — see [`/detections`](detections/).

The lab covers both endpoint and network telemetry — Windows and Linux hosts feeding Elasticsearch via Sysmon/Winlogbeat and Auditd/Filebeat, plus Suricata watching traffic between the VMs — so detections aren't limited to a single data source.

**Minimum viable scope:** ELK server, one Windows victim, Kali attacker, Sysmon, 3 documented detections.
**Current/standout scope:** adds a Linux victim, Suricata network monitoring, 5+ MITRE-mapped detections, and (time permitting) a small enrichment script.

See the [status table](#detections-implemented) below for what's actually done versus still in progress.

## Architecture

```
                         ┌───────────────────────────┐
                         │  Isolated Host-Only Network  │
                         │  (VMware VMnet2)             │
                         └───────────────────────────┘
                        │             │              │
          ┌─────────────┘             │              └─────────────┐
          │                           │                             │
   ┌──────────────┐           ┌──────────────┐              ┌──────────────┐
   │  Kali Linux  │  attacks  │  Windows 10  │   Sysmon +   │              │
   │  (Attacker)  │──────────▶│  (Victim)    │──Winlogbeat─▶│  ELK Server  │
   │              │           └──────────────┘              │ Elasticsearch │
   │ Atomic Red   │           ┌──────────────┐   Auditd +   │  + Kibana    │
   │ Team + Hydra │──────────▶│ Ubuntu Victim│───Filebeat──▶│              │
   │ + Nmap       │           └──────────────┘              └──────────────┘
   │              │                                                 ▲
   │              │──── traffic mirrored to Suricata ───────────────┘
   └──────────────┘
```

Full-resolution diagram: [`diagrams/network-architecture.png`](diagrams/network-architecture.png)

## Tech Stack

| Component | Purpose |
|---|---|
| VMware Workstation Pro | Hypervisor / VM hosting |
| Ubuntu Server 24.04 LTS | Host OS for the ELK stack |
| Docker + Docker Compose | Containerized deployment of Elasticsearch & Kibana |
| Elasticsearch 8.15 / Kibana 8.15 | Log storage, search, dashboards, detection rules |
| Sysmon (SwiftOnSecurity config) + Winlogbeat | Windows endpoint telemetry |
| Auditd + Filebeat | Linux endpoint telemetry |
| Suricata | Network-layer detection (port scans, plaintext creds, etc.) |
| Atomic Red Team | Repeatable, MITRE-mapped attack simulation |
| Sigma | Detection rules, converted to Elastic queries via `sigma-cli` |
| Kali Linux | Attack source (Nmap, Hydra, Atomic Red Team execution) |

## Detections Implemented

| MITRE ID | Technique | Data Source | Status | Write-up |
|---|---|---|---|---|
| T1059 | Command and Scripting Interpreter (PowerShell) | Sysmon | 🔲 Not started | `detections/t1059.md` |
| T1110 | Brute Force | Windows Security Log | 🔲 Not started | `detections/t1110.md` |
| T1547 | Boot/Logon Autostart Execution | Sysmon | 🔲 Not started | `detections/t1547.md` |
| T1046 | Network Service Discovery (port scan) | Suricata | 🔲 Not started | `detections/t1046.md` |
| T1003 | OS Credential Dumping | Sysmon | 🔲 Not started (stretch) | `detections/t1003.md` |

Update the status column as each one is actually built and verified — an honest "in progress" table is more credible than a repo that claims everything works on day one.

## Detection Example (fill in once you have one working)

```markdown
### T1110 — Brute Force

**Scenario:** Simulated a brute-force login attempt against the Windows victim
using Hydra from Kali, targeting RDP/SMB.

**Detection logic:** Sigma rule matching repeated Windows Security Log event ID 4625
(failed logon) from a single source within a short window, converted to an
Elasticsearch query via sigma-cli. See detections/t1110.md and
detection-rules/t1110-brute-force.yml for the full rule.

**Evidence:** screenshots/08-alert-triggered.png, logs/hydra-output.txt

**Analyst notes:** In a real environment this would warrant blocking the source
IP and checking whether any of the attempted accounts succeeded elsewhere.
```

## Repository Structure

```
.
├── README.md
├── docker-compose.yml              # Elasticsearch + Kibana deployment
├── .env.example                    # Placeholder secrets — never commit real ones
│
├── docs/
│   ├── build-guide.md              # Full step-by-step build documentation
│   └── troubleshooting.md          # Problems hit + how they were fixed
│
├── diagrams/
│   └── network-architecture.png
│
├── detections/                     # One analyst-style write-up per technique
│   ├── t1059.md
│   ├── t1110.md
│   ├── t1547.md
│   ├── t1046.md
│   └── t1003.md
│
├── detection-rules/                # The actual Sigma rules and/or exported Kibana rules
│   ├── t1110-brute-force.yml
│   └── ...
│
├── screenshots/
│   ├── 01-network-editor.png
│   ├── 05-sysmon-events-flowing.png
│   ├── 06-discover-live-logs.png
│   ├── 07-suricata-alert.png
│   └── 08-alert-triggered.png
│
└── logs/
    ├── docker-ps-output.txt
    ├── cluster-health.txt
    ├── nmap-scan-output.txtb
    ├── hydra-output.txt
    └── sample-events.ndjson
```

## How It's Built

The lab runs as VMs under VMware Workstation Pro on a host-only network (`VMnet2`, `192.168.75.0/24`) with no route to the internet or my home network, so attack traffic stays fully contained rather than relying on firewall rules.

Elasticsearch and Kibana run as Docker containers on an Ubuntu Server host, with security enabled by default (`xpack.security.enabled=true`). The Windows victim runs Sysmon using the SwiftOnSecurity config (the de facto baseline most SOC write-ups reference) rather than default Windows auditing, since Sysmon's process, network, and registry events are what most endpoint detections actually key off. Winlogbeat ships those logs to Elasticsearch. The Linux victim runs Auditd + Filebeat for the same purpose on that side.

For attack simulation, most techniques are run through Atomic Red Team rather than ad hoc commands, because each Atomic test maps directly to a MITRE ATT&CK technique ID — that mapping is what turns "I ran some commands" into something documentable. Kali also runs Nmap and Hydra directly against both victims to generate real network-layer attack traffic for Suricata to catch, separate from the Atomic Red Team endpoint tests.

Detections are written as Sigma rules first, then converted to Elasticsearch queries with `sigma-cli`, rather than built directly in Kibana's rule UI — Sigma rules are portable and readable independent of the backend, which is closer to how detection content actually gets shared and reviewed in practice.

Full step-by-step notes (every VM setting, every command) are in [`docs/build-guide.md`](docs/build-guide.md).

## Build Order

Roughly how this was (or is being) built, in case the phases are useful as a checklist:

1. Infra + ELK deployment
2. Log ingestion — Windows (Sysmon/Winlogbeat) and Linux (Auditd/Filebeat)
3. First attack + first working detection, end to end
4. Network monitoring (Suricata) layered in once the endpoint side is solid
5. Remaining detections + write-ups
6. README, diagram, demo video

## Video Walkthrough

A short screen recording of one attack → detection flow end-to-end (e.g. the Hydra brute-force attempt through the Sigma-based alert firing in Kibana) is more convincing than any amount of static documentation, since it can't be staged as easily as a screenshot.

📹 **[Demo video](#)** *(add once recorded)*

## Challenges & Fixes

- **Elasticsearch container kept exiting on startup.** Caused by the Linux kernel's default `vm.max_map_count` being too low for Elasticsearch's memory-mapped file usage. Fixed by raising it with `sysctl -w vm.max_map_count=262144` and persisting it in `/etc/sysctl.conf`.
- **Couldn't reach Kibana from the host browser.** Kibana was bound to the VM's internal IP, not `localhost`, since it runs inside a VM. Resolved by browsing to the VM's actual host-only network IP instead.
- _(Add real ones as they come up — Sigma-to-Elastic conversion quirks, Suricata span-port/mirroring issues, and Sysmon config tuning are the likely candidates.)_

## Lessons Learned / Skills Demonstrated

- Virtual network segmentation and isolated lab design
- Docker-based deployment of production-grade software with security enabled
- Endpoint telemetry pipeline design (Sysmon/Auditd → Beats → Elasticsearch → Kibana)
- Writing detection logic as Sigma rules and converting them to a specific backend
- Mapping simulated and real attacker behavior to MITRE ATT&CK
- Network-layer detection alongside host-based detection (Suricata)
- Documenting findings the way a SOC analyst would, not just as a changelog


*Built as a personal project to gain hands-on detection engineering experience.*