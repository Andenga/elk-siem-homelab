# ELK SIEM Homelab

A self-hosted SIEM detecting simulated attacks across a Windows and Linux endpoint, built on the Elastic Stack, with detections written as Sigma rules, converted to Elastic queries, and wired to live Webhook and Jira response actions.

[Demo video](https://youtu.be/vcyImooMafg) &nbsp;•&nbsp; [Build log](/Build%20Log.md) &nbsp;•&nbsp; [Troubleshooting](/Troubleshooting.md)

---

## Overview

This lab covers endpoint and network telemetry, a Windows victim feeding Elasticsearch via Winlogbeat/Sysmon, a Linux victim via Auditd/Filebeat, and Suricata watching traffic between the VMs, driven by real and simulated attacks (Atomic Red Team, Nmap, Hydra) and detected with Sigma rules mapped to MITRE ATT&CK, each wired to an automated response action (Webhook, Jira).

All tools used are free or have a free trial.

> **Note on secrets:** passwords, API keys, and other PII have been redacted, I have replaced them with placeholders, please take note of that as you recreate the project.

## Architecture

```

┌─────────────────────────────────────────────────────────────────────────────┐
│                         VMware Workstation Pro (Host)                        │
│                                                                             │
│   ┌───────────────────────────┐        ┌───────────────────────────────┐    │
│   │   Host-Only Network       │        │   NAT Network                 │    │
│   │   (VMnet — isolated)      │        │   (Internet access)           │    │
│   │   192.168.218.0/24        │        │                               │    │
│   └─────────────┬─────────────┘        └───────────────┬───────────────┘    │
│                 │                                      │                    │
│      ┌──────────┴──────────┬───────────────┬───────────┴────────┐           │
│      │                     │               │                    │           │
│      ▼                     ▼               ▼                    ▼           │
│  ┌────────────┐      ┌────────────┐   ┌────────────┐      ┌────────────┐    │
│  │ ELK-Server │      │  Victim-   │   │  Victim-   │      │    Kali    │    │
│  │ Ubuntu     │      │  Windows   │   │   Linux    │      │   Linux    │    │
│  │ 24.04 LTS  │      │  10 / 11   │   │ 24.04 LTS  │      │ (attacker) │    │
│  │            │      │            │   │            │      │            │    │
│  │ 8–16 GB    │      │  4 GB      │   │  2 GB      │      │  4 GB      │    │
│  │ 4 vCPU     │      │  2 vCPU    │   │  2 vCPU    │      │  2 vCPU    │    │
│  │ 60 GB      │      │  60 GB     │   │  40 GB     │      │  40 GB     │    │
│  │            │      │            │   │            │      │            │    │
│  │ .218.134   │      │ .218.135   │   │ .218.136   │      │ .218.137   │    │
│  └─────┬──────┘      └─────┬──────┘   └─────┬──────┘      └─────┬──────┘    │
│        │                   │                │                   │           │
│        │  Elasticsearch :9200               │                   │           │
│        │  Kibana       :5601                │                   │           │
│        │  Suricata (IDS)                    │                   │           │
│        │                                    │                   │           │
│        │  ◄──── Filebeat + Auditd ──────────┘                   │           │
│        │  ◄──── Winlogbeat + Sysmon ────────┘                   │           │
│        │                                                        │           │
│        │  ◄──── nmap (T1046) / hydra RDP (T1110) ───────────────┘           │
│        │                                                                     │
│        │  Atomic Red Team (local, on Victim-Windows):                       │
│        │    T1059.001 · T1547.001 · T1003 · T1082                           │
│        │                                                                     │
│        │  Sigma rules ──► Lucene queries ──► Kibana Detection Rules        │
│        │                                          │                          │
│        │                          ┌───────────────┼───────────────┐         │
│        │                          ▼               ▼               ▼         │
│        │                    ┌──────────┐   ┌──────────┐    ┌──────────┐     │
│        │                    │ Webhook  │   │ Webhook  │    │  Jira    │     │
│        │                    │ (T1059)  │   │ (T1082)  │    │(T1547)   │     │
│        │                    └────┬─────┘   └────┬─────┘    └────┬─────┘     │
│        │                         │              │               │           │
│        └─────────────────────────┼──────────────┼───────────────┼───────────┘
│                                  ▼              ▼               ▼
│                            webhook.site    webhook.site    Jira Cloud
│                                                             (project PER)
└─────────────────────────────────────────────────────────────────────────────┘

```

## Tech Stack

| Component | Purpose |
|---|---|
| VMware Workstation Pro | Hypervisor / VM hosting |
| Ubuntu Server 24.04 LTS | Host OS for the ELK stack, and the Linux victim |
| Docker + Docker Compose | Containerized deployment of Elasticsearch & Kibana |
| Elasticsearch 8.15 / Kibana 8.15 | Log storage, search, dashboards, detection rules |
| Winlogbeat + Sysmon | Windows endpoint telemetry |
| Auditd + Filebeat | Linux endpoint telemetry |
| Suricata | Network-layer visibility (flow/alert events between VMs) |
| Atomic Red Team | Repeatable, MITRE-mapped attack simulation on the Windows victim |
| Sigma / sigma-cli | Detection rules, converted to Lucene queries for Elasticsearch |
| Kibana Security rules | Scheduled detection rules with Webhook / Jira actions |
| Kali Linux | Attack source (Nmap, Hydra, Atomic Red Team execution) |

## Lab Environment

| VM | OS | Role | IP |
|---|---|---|---|
| ELK-Server | Ubuntu Server 24.04 LTS | Elasticsearch + Kibana + Suricata | 192.168.218.134 |
| Victim-Windows | Windows 10/11 | Monitored endpoint, Atomic Red Team target | 192.168.218.135 |
| Victim-Linux | Ubuntu Server 24.04 LTS | Monitored endpoint (Auditd/Filebeat) | 192.168.218.136 |
| Kali | Kali Linux | Attacker box (Nmap, Hydra, Atomic Red Team runner) | 192.168.218.137 |

## Detections Implemented

Each detection below was built as a Sigma rule, converted to a Lucene query with `sigma-cli`, deployed as a scheduled custom-query rule in Kibana, and re-triggered to confirm the alert fired end-to-end (including the connected response action).

| MITRE ID | Technique | Data Source | Response Action | Status |
|---|---|---|---|---|
| T1059.001 | Command and Scripting Interpreter (PowerShell) | Winlogbeat / Sysmon | Webhook | ✅ Built & verified |
| T1547.001 | Boot/Logon Autostart Execution (Registry Run keys) | Winlogbeat / Sysmon | Jira | ✅ Built & verified |
| T1003 | OS Credential Dumping | Winlogbeat / Sysmon | - | ✅ Built & verified (stretch goal) |
| T1082 | System Information Discovery | Winlogbeat / Sysmon | Webhook | ✅ Built & verified |
| T1046 | Network Service Discovery (Nmap scan) | Suricata | - | 🔲 Attack traffic generated; no Sigma/Kibana rule built |
| T1110 | Brute Force (Hydra vs RDP) | Suricata / Windows Security Log | - | 🔲 Attack traffic generated; no Sigma/Kibana rule built |

T1046 and T1110 were run from Kali against both victims to generate real network-layer attack traffic, and confirmed visible as flow/alert events in Suricata's `eve.json`, but no Sigma rule or Kibana detection rule was built on top of that traffic in this pass - that's the natural next step for the lab.

## What Atomic Red Team Actually Showed

A large share of the value here wasn't "the alert fired", it was reading the raw Atomic Red Team output and Sysmon/Winlogbeat data critically instead of taking `TestSuccess: True` at face value. Summarized findings:

- **T1059.001 (PowerShell)** - 22 sub-tests run. Several legitimately succeeded and were detectable (command-line parameter variations, `-EncodedCommand`, download cradles via MSXML/mshta, fileless execution, nslookup DNS abuse). Others failed for environmental reasons, missing tools (Mimikatz, PowerUp, SOAPHound), no AD domain (BloodHound), or a dead download host (Invoke-AppPathBypass returned an HTTP 503), not because a defense blocked them. Telling those two failure modes apart mattered for writing an honest detection rule.
- **T1547.001 (Registry Run key persistence)** - 21 sub-tests, the large majority successful (Run/RunOnce keys, VBS/JSE/BAT startup scripts, startup-folder shortcuts, Winlogon Userinit/Shell, BootExecute, secedit-based Run key creation, RDP logon persistence, Turla Mosquito-style rundll32 persistence). Two sub-tests hung waiting on an interactive `overwrite?` console prompt Atomic Red Team couldn't answer non-interactively, and were treated as environmental hangs rather than detection gaps.
- **T1003 (Credential Dumping)** = 7 sub-tests. Only 2 of 7 represented real, observable technique behavior (LSASS/svchost memory access, Credential Manager dumping via `keymgr.dll`/`rundll32`); the rest failed on missing external tooling (Gsecdump, NPPSpy DLL, IIS AppCmd) rather than exercising the technique.
- **T1082 (System Information Discovery)** - 41 sub-tests covering `systeminfo`, hostname, MachineGUID, environment variables, drive enumeration, and OS/BIOS registry reads. A cluster of "WinPwn" and `wmic`-based sub-tests failed outright: Windows Defender flagged the downloaded scripts as malicious before they could run, and `wmic` itself is deprecated/absent on this Windows build.

Full per-technique breakdowns are in the [build log](/Build%20Log.md) and the linked analysis docs per technique.

## Repository Structure

```
.
├── README.md
├── Build Log.md                    # Full step-by-step commands, in order
├── Troubleshooting.md              # Problems hit + how they were fixed
│
├── Docs/
│   ├── T1059.001 analysis.md
│   ├── T1547.001 analysis.md
│   └── T1003 analysis.md
│
├── Screenshots/
│   ├── Host-only network.png
│   ├── Kali connectivity.png
│   ├── docker installation verification.png
│   ├── Winlogbeat running status.png
│   ├── discover-live-log-names.png
│   └── suricata-alert.png
│
└── Logs/
    ├── network-connectivity-test.txt
    ├── docker-install-verified.txt
    ├── docker-ps-output.txt
    ├── cluster-health.txt
    ├── atomic-T1059.001-output.txt
    ├── atomic-T1547.001-output.txt
    ├── atomic-T1003-output.txt
    ├── atomic-T1082-output.txt
    ├── Atomic-tests summary.md
    ├── nmap-scan-output.txt
    └── hydra-output.txt
```

## How It's Built

The lab runs as 4 VMs under VMware Workstation Pro on a host-only network with no route to the home network, so attack traffic stays fully contained rather than relying on firewall rules alone. A second NAT-only adapter on each VM handles updates and downloads.

Elasticsearch and Kibana run as Docker containers on an Ubuntu Server host. The Windows victim ships Sysmon/Security events to Elasticsearch via Winlogbeat; the Linux victim ships Auditd events via Filebeat's `auditd` module. Suricata runs directly on the ELK server and confirms it can see inter-VM traffic (flow events for simple pings, alert events for the Nmap/Hydra runs from Kali).

For attack simulation, Windows-side techniques were run through Atomic Red Team rather than ad hoc commands, because each Atomic test maps to a specific MITRE ATT&CK sub-technique, that mapping is what makes the resulting Sigma rule and Kibana detection reviewable rather than one-off. Kali also ran Nmap and Hydra directly against both victims to generate real network-layer traffic independent of the Atomic Red Team endpoint tests.

Detections were written as Sigma rules first, converted to Elasticsearch Lucene queries with `sigma-cli` against the `ecs_windows` pipeline, then deployed as custom-query rules in Kibana Security on a 5-minute schedule, each connected to a live response action:

- **T1059.001 & T1082** → a Webhook connector posting a JSON payload (rule name, alert count, severity, host, command line) to an external endpoint
- **T1547.001** → a Jira connector, auto-creating a `PER`-project issue per rule execution with the rule name and alert count in the comments

All three connectors were sanity-checked independently of Kibana (a raw `Invoke-RestMethod` POST for the webhook; a manual test issue for Jira) before being wired into rules, and all three were re-triggered end-to-end to confirm the alert → action path actually fires, not just that the query matches in Discover.

Full step-by-step notes (every VM setting, every command, every config file) are in [`Build Log.md`](/Build%20Log.md).

## Challenges & Fixes

- **Hydra's default speed tripped Windows' RDP lockout/throttling almost immediately**, producing `all children were disabled due too many connection errors`. Fixed by running Hydra at `-t 1 -W 10` (one attempt roughly every 10 seconds) to stay under the threshold, rather than trying to work around the lockout after the fact.
- **A chunk of Atomic Red Team sub-tests failed for environmental reasons, not detection reasons** - missing external payloads (Mimikatz, PowerUp, gsecdump, NPPSpy), no AD domain for BloodHound/SOAPHound, Windows Defender flagging downloaded WinPwn/Seatbelt scripts before execution, and a couple of sub-tests hanging on interactive console prompts Atomic Red Team couldn't answer. None of these were treated as detections, they're noted in the per-technique analysis docs so the Sigma rules built on top only cover behavior that actually executed.
- Further environment-specific issues that I faced while working on this project (Elasticsearch/Docker startup, Kibana network binding, Sigma-to-Elastic conversion quirks) are written up in full in [`Troubleshooting.md`](/Troubleshooting.md).

## Lessons Learned / Skills Demonstrated

- Virtual network segmentation and isolated lab design
- Docker-based deployment of production-grade software with security enabled
- Endpoint telemetry pipeline design (Sysmon/Auditd → Beats → Elasticsearch → Kibana)
- Writing detection logic as Sigma rules and converting them to a specific backend (`sigma-cli`, `ecs_windows`)
- Mapping simulated and real attacker behavior to MITRE ATT&CK
- Wiring detections to real response actions (Webhook, Jira) rather than alerting into a void
- Reading raw tool output critically, distinguishing a real detection gap from a missing dependency or an environmental failure
- Network-layer visibility alongside host-based detection (Suricata)
- Documenting findings the way a SOC analyst would, including what didn't work and why


---
N/B
*This project was built as a personal project to gain hands-on detection engineering experience.*
