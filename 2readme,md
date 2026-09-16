# ELK SIEM Homelab — Detection Engineering with Atomic Red Team, Sigma, and Automated Response

A self-contained, isolated home lab where simulated and real attacks are
generated against monitored Windows and Linux endpoints, detected by a
central Elastic (ELK) SIEM, and automatically routed into real incident
response tooling — a Jira ticket or a webhook/REST API call — the same way a
production SOC would forward an alert to a ticketing system or SOAR
platform.

The goal isn't "I installed ELK." It's: **here is a specific attacker
technique, here is the detection logic that catches it, and here is what
happens automatically the moment it fires.**

---

## Architecture

```
┌─────────────┐        ┌──────────────────┐        ┌─────────────────┐
│    Kali     │ attacks│  Victim-Windows   │        │  Victim-Linux    │
│  (attacker) ├───────►│  Sysmon+Winlogbeat│        │  Auditd+Filebeat │
└──────┬──────┘        └─────────┬─────────┘        └────────┬─────────┘
       │                         │ logs shipped                │
       │  traffic mirrored       ▼                              ▼
       │                 ┌───────────────────────────────────────┐
       └────────────────►│         ELK-Server (Elasticsearch      │
                          │      + Kibana + Suricata IDS)          │
                          └───────────────┬─────────────────────────┘
                                          │ Sigma-derived detection rule fires
                                          ▼
                          ┌───────────────────────────────────────┐
                          │   Kibana Security Rule → Action        │
                          │   ┌─────────────┐   ┌────────────────┐ │
                          │   │  Webhook →  │   │  Jira issue     │ │
                          │   │  REST API   │   │  auto-created   │ │
                          │   └─────────────┘   └────────────────┘ │
                          └───────────────────────────────────────┘
```

All VMs sit on a single **host-only** virtual network with no route to the
real internet beyond each VM's own adapter — nothing here touches production
infrastructure.

---

## What's in this lab

| Component | Purpose |
|---|---|
| **Elasticsearch + Kibana** (Docker) | Central log store, search, and detection engine |
| **Sysmon + Winlogbeat** | Deep Windows telemetry (process creation, registry changes, network connections) shipped to Elastic |
| **Auditd + Filebeat** | Linux command execution and file-access auditing shipped to Elastic |
| **Suricata** | Network-level IDS watching inter-VM traffic, output forwarded into the same Elastic index |
| **Atomic Red Team** | Individually-runnable, MITRE-ATT&CK-mapped attack simulations run against the Windows victim |
| **Kali (nmap, Hydra)** | Real (not simulated) attacker-style traffic — scanning and brute force |
| **Sigma** | Vendor-neutral detection rules, converted to Elasticsearch/Lucene queries via `sigma-cli` |
| **Kibana Security Rules** | Scheduled detection rules built from the converted Sigma queries |
| **Webhook + Jira connectors** | Automated response actions — every fired alert either POSTs to a REST endpoint or opens a Jira ticket, without any manual step |

---

## MITRE ATT&CK techniques covered

| Technique ID | Name | Tactic | Simulated via | Automated response |
|---|---|---|---|---|
| **T1547.001** | Registry Run Key Persistence | Persistence | Atomic Red Team | Jira issue auto-created |
| **T1059.001** | PowerShell (Command & Scripting Interpreter) | Execution | Atomic Red Team | Webhook → REST API |
| **T1082** | System Information Discovery | Discovery | Atomic Red Team | *(see detections/ for current status)* |
| **T1046** | Network Service Discovery | Discovery | Nmap from Kali | — |
| **T1110** | Brute Force | Credential Access | Hydra (RDP) from Kali | — |

See `detections/` for the full write-up of each confirmed detection,
including the Sigma rule, why it catches the behavior, evidence, and analyst
notes.

---

## Repository layout

```
.
├── README.md                  ← you are here
├── BUILD-LOG.md                ← full step-by-step build log, as actually run
├── TROUBLESHOOTING.md           ← real problems hit and how each was fixed
├── docker-compose.yml          ← Elastic stack definition
├── .env.example                ← placeholder env vars (real .env is git-ignored)
├── detection-rules/            ← Sigma YAML rules + their converted Lucene queries
│   ├── t1059_001_powershell.yml
│   ├── t1547_001_registry.yml
│   ├── t1003_credential_dumping.yml
│   └── t1082_systeminfo.yml
├── detections/                 ← one analyst-style report per confirmed detection
│   ├── T1059.001.md
│   ├── T1547.001.md
│   └── T1082.md
├── screenshots/                ← numbered visual checkpoints referenced in BUILD-LOG.md
└── logs/                       ← raw terminal output saved as .txt for verifiability
```

---

## Why Sigma instead of writing Kibana queries directly

Every detection rule started life as a
[Sigma](https://github.com/SigmaHQ/sigma) rule — a generic, YAML-based way
of expressing detection logic that isn't tied to Elastic specifically. It's
then converted to a Lucene query with `sigma-cli`:

```bash
sigma convert -t lucene -p ecs_windows detection-rules/t1547_001_registry.yml
```

The point of doing it this way rather than just writing Kibana queries by
hand: the underlying logic is portable to Splunk, Sentinel, or any other
backend `sigma-cli` supports, which is closer to how detection engineering
actually works in most SOCs.

---

## Why automated response, not just an alert

A dashboard full of unactioned alerts isn't a finished detection — it's half
of one. Each rule here is wired to a real downstream action:

- **T1059.001** fires a **Webhook** with a JSON payload (rule name, alert
  count) to a REST endpoint — simulating how a SOC would forward an alert
  into a SOAR platform or custom automation pipeline.
- **T1547.001** fires a **Jira** action that opens a real issue in a
  dedicated project, with a templated summary and description pulling from
  the actual alert context (`{{context.rule.name}}`,
  `{{context.alerts.length}}`) — simulating how a SOC would auto-ticket a
  confirmed detection for an analyst to pick up.

This is deliberately not the same integration repeated three times — it's
meant to show comfort configuring more than one type of downstream
integration from the same detection engine.

---

## Notable problems solved along the way

Documented in full in `BUILD-LOG.md`, but the short version, because these
are the kind of debugging stories worth mentioning in an interview:

- **Hydra vs. Windows RDP lockout:** running Hydra at default speed
  instantly triggers Windows' account lockout and network throttling,
  killing the RDP listener. Fixed by throttling Hydra itself
  (`-t 1 -W 10`) rather than fighting the lockout after the fact.
- **A "working" atomic test that didn't produce a matching alert:**
  `Invoke-AtomicTest T1059.001` run unscoped executes 20+ different
  sub-tests, most of which need elevation this session didn't have. The one
  sub-test that did succeed used a COM-object download method whose Sysmon
  event didn't contain the command-line pattern the Sigma rule was built to
  catch — confirmed by searching Kibana Discover and finding that the
  matching events actually belonged to a *different* technique (T1547.001),
  whose own atomic happens to use `DownloadString` internally to stage its
  payload. Root-caused via Discover rather than assumed, then resolved by
  scoping to a specific, low-friction, non-elevated atomic test (T1082
  System Information Discovery) instead.

---

## Running it yourself

Full step-by-step instructions, including every command actually run and
every value used, are in [`BUILD-LOG.md`](./BUILD-LOG.md). Broad strokes:

1. Stand up 4 VMs (ELK server, Windows victim, Linux victim, Kali attacker)
   on an isolated host-only network.
2. Deploy Elasticsearch + Kibana via Docker Compose on the ELK server.
3. Install Sysmon + Winlogbeat on the Windows victim, Auditd + Filebeat on
   the Linux victim, and confirm both are shipping logs into Kibana Discover.
4. Deploy Suricata on the ELK server for network-level visibility.
5. Run Atomic Red Team tests on the Windows victim and real attacks (Nmap,
   Hydra) from Kali.
6. Convert Sigma rules to Elasticsearch queries with `sigma-cli` and wire
   them into scheduled Kibana Security Rules.
7. Attach a Webhook or Jira action to each rule so a confirmed detection
   automatically produces a ticket or API call — no manual triage step.
8. Re-trigger each attack and confirm the full chain: attack → log →
   alert → automated action.

---

## Demo video

*(link to be added once recorded — see BUILD-LOG.md open items)*

A 3–5 minute walkthrough of one attack going from `Invoke-AtomicTest` on the
Windows VM, through the raw Sysmon event in Kibana Discover, to the fired
Security alert, to the resulting Jira ticket / webhook payload.

---

## Disclaimer

This lab runs entirely on an isolated, host-only virtual network with no
route to production systems or the wider internet. All "attacks" (Hydra
brute force, Nmap scans, Atomic Red Team tests) are run only against victim
VMs owned and controlled by the lab operator. Nothing here should be run
against systems you don't own or have explicit authorization to test.