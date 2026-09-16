# ELK SIEM Homelab — Build Log

This is a running log of the steps I actually executed, in order, including the
real values, commands, and problems I hit along the way. Screenshots and raw
log files referenced here live in `screenshots/` and `logs/`.

> **Note on secrets:** passwords and API tokens below are shown as placeholders
> (`<REDACTED>`). The real values live only in my local `.env` file and my
> Atlassian account settings, never in this repo.

> Problems hit along the way, and how each was actually resolved, are
> written up in full in [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — this
> log links to it inline wherever relevant rather than repeating the detail.

---

## Phase 1 — Infrastructure

### 1.1 Hypervisor and network
- Installed VMware Workstation Pro.
- Created an isolated **host-only** virtual network (VMnet) for the lab —
  no route to the real router or internet beyond what each VM's own adapter
  allows.
- 📸 `screenshots/01-network-editor.png` — host-only configuration.

### 1.2 VMs provisioned

| VM | OS | RAM | vCPU | Disk | Role | IP |
|---|---|---|---|---|---|---|
| ELK-Server | Ubuntu Server 24.04 LTS | 8–16 GB | 4 | 60 GB | Elasticsearch + Kibana | 192.168.218.134 |
| Victim-Windows | Windows 10/11 | 4 GB | 2 | 60 GB | Monitored Windows endpoint | 192.168.218.135 |
| Victim-Linux | Ubuntu Server 24.04 LTS | 2 GB | 2 | 40 GB | Monitored Linux endpoint | 192.168.218.136 |
| Kali | Kali Linux (prebuilt VMware image) | 4 GB | 2 | 40 GB | Attacker box | 192.168.218.137 |

### 1.3 Connectivity test

```bash
ping -c 4 192.168.218.134   # ELK server
ping -c 4 192.168.218.135   # Windows victim
ping -c 4 192.168.218.136   # Linux victim / Ubuntu Server
ping -c 4 192.168.218.137   # Kali Linux
```

📝 `logs/network-connectivity-test.txt`

---

## Phase 2 — Deploy the Elastic Stack

All commands below run on **ELK-Server**.

### 2.1 Connect
```bash
ssh elk@192.168.218.134
```

### 2.2 Environment file
```bash
echo "ELASTIC_PASSWORD=<REDACTED>" > .env
echo "KIBANA_PASSWORD=<REDACTED>" >> .env
```
`.env` is git-ignored and never committed.

### 2.3 Bring up the stack
```bash
docker ps -a
docker compose up -d
```

### 2.4 Verify Elasticsearch health
```bash
curl -u elastic:<REDACTED> http://localhost:9200/_cluster/health?pretty
```
Expected: `"status": "green"` or `"yellow"` — both are fine on a single node.
This took a little while to settle on first boot.

### 2.5 Log into Kibana
Opened `http://192.168.218.134:5601` and logged in as `elastic`.

---

## Phase 3 — Log Ingestion (Windows)

Run as **Administrator PowerShell** on Victim-Windows.

### 3.1 Confirm outbound connectivity to ELK-Server
```powershell
Test-NetConnection -ComputerName 192.168.218.134 -Port 9200
```
`TcpTestSucceeded` must read `True`.

### 3.2 Start Winlogbeat
```powershell
Start-Service winlogbeat
Get-Service winlogbeat   # confirm status = Running
```

### 3.3 Confirm data is flowing
Back in Kibana Discover, selected the Winlogbeat data view and confirmed
recent Sysmon/Security events were arriving.

---

## Phase 4 — Atomic Red Team Setup and Recon

### 4.1 Confirm the Atomic Red Team test catalog is installed
```powershell
Invoke-AtomicTest T1059.001 -ShowDetailsBrief
```

Output listed 20+ individual sub-tests under T1059.001 (Mimikatz, BloodHound
variants, PowerShell download cradles, encoded-command variants, session
creation, etc.) — confirming the atomics library was correctly installed and
that T1059.001 alone covers many different behavior patterns, not just one.

### 4.2 Generate attack data (initial pass)
```powershell
Invoke-AtomicTest T1059.001
Invoke-AtomicTest T1547.001
Invoke-AtomicTest T1003
```

📝 Saved full console output → `logs/atomic-T1059.001-output.txt`, etc.

**Result of the unscoped `T1059.001` run:** most sub-tests failed with
`Access is denied` (they require elevation beyond what the session had, or
have broken prerequisites), one failed on a path-quoting bug in the atomic
itself, and only **Test #6 — "Powershell MsXml COM object"** actually
succeeded (`Download Cradle test success!`). Several other sub-tests
succeeded but exercise different behavior entirely (plain command execution,
encoded commands, PS remoting) — not the download-cradle pattern the
detection rule targets. This matters later in Phase 5 when the rule doesn't
fire as expected.

### 4.3 Real attack traffic from Kali

```bash
# T1046 — network service discovery
nmap -sV 192.168.218.135 192.168.218.136

# fallback if ports are filtered by Windows Defender / Linux firewall
sudo nmap -Pn -p 3389 192.168.218.135 192.168.218.136

# T1110 — brute force (lab only)
hydra -l administrator -P /usr/share/wordlists/rockyou.txt -t 1 -W 10 rdp://192.168.218.135
```

📝 `logs/nmap-scan-output.txt`, `logs/hydra-output.txt`

**Note:** running Hydra at default speed against Windows RDP triggers the
built-in Account Lockout Policy / network throttling almost immediately,
producing `[ERROR] all children were disabled due too many connection
errors`. Once that happens, the RDP service stops accepting new connections
until reset — the fix isn't a Hydra flag, it's clearing the lockout state on
the Windows side. `-t 1 -W 10` (one attempt every ~10 seconds) avoids
triggering it in the first place.

---

## Phase 4.5 — Network Monitoring (Suricata)

All on **ELK-Server**.

```bash
# Confirm install + build options
suricata --build-info | head -20

# Back up default config before touching it
sudo cp /etc/suricata/suricata.yaml /etc/suricata/suricata.yaml.bak

# Validate config syntax before running for real
sudo suricata -T -c /etc/suricata/suricata.yaml -v
```

Expected clean output ends with something like:
```
Info: detect: 1 rule files processed. 52741 rules successfully loaded, 0 rules failed, 0 rules skipped
Notice: suricata: Configuration provided was successfully loaded. Exiting.
```

```bash
sudo systemctl enable suricata
sudo systemctl start suricata
sudo systemctl status suricata
```

Expected: `Active: active (running)`.

### Verify Suricata sees traffic
From Kali:
```bash
ping 192.168.218.135 -c 4
```
On ELK-Server, watch the log grow live:
```bash
sudo tail -f /var/log/suricata/eve.json
```
Confirmed JSON events streaming in (`event_type: flow` for the ping). If
nothing appears, it's a promiscuous-mode / network-visibility problem, not a
Suricata config problem — worth debugging before moving on, since a Suricata
that can't see traffic will silently produce nothing later.

---

## Phase 5 — Build Detections (Sigma → Elastic)

### 5.1 Activate the sigma-cli virtual environment
```bash
cd ~/detection-lab
source ~/sigma-venv/bin/activate
sigma version
```
(Needs to be re-activated in every new terminal session.)

### 5.2 Convert Sigma rules to Elasticsearch Lucene queries

**T1059.001 — PowerShell download cradle**
```bash
sigma convert -t lucene -p ecs_windows t1059_001_powershell.yml
```
```
process.executable.caseless:*\\powershell.exe AND (process.command_line:(*.DownloadString* OR *.DownloadFile* OR *Invoke\-WebRequest*))
```

**T1547.001 — Registry Run key persistence**
```bash
sigma convert -t lucene -p ecs_windows t1547_001_registry.yml
```
```
registry.path:(*\\Microsoft\\Windows\\CurrentVersion\\Run\\* OR *\\Microsoft\\Windows\\CurrentVersion\\RunOnce\\*)
```

**T1003 — Credential dumping (LSASS access)**
```bash
sigma convert -t lucene -p ecs_windows t1003_credential_dumping.yml
```
```
winlog.event_data.TargetImage:*\\lsass.exe AND winlog.event_data.GrantedAccess:0x1010
```

### 5.3 Set up response-integration connectors in Kibana

**Stack Management → Connectors → Create connector**

| Technique | Connector type | Purpose |
|---|---|---|
| T1059.001 | Webhook | POSTs a JSON payload to a REST endpoint (webhook.site during testing) |
| T1547.001 | Jira | Auto-creates a Jira issue in the `PER` (Persistence) project |

**Webhook connector — `T1059-PowerShell-Webhook`**
- URL: `https://webhook.site/<my-unique-id>`
- Method: `POST`
- Headers: `Content-Type: application/json`
- Auth: none
- Tested in-UI via the connector's "Test" button before saving.

Also sanity-checked the same endpoint manually from PowerShell on
Victim-Windows to confirm outbound reachability independent of Kibana:
```powershell
Invoke-RestMethod -Method Post -Uri "https://webhook.site/<my-unique-id>" -Body "test data"
```

**Jira connector — `T1547-Persistence-Jira`**
- URL: `https://mitreattack1.atlassian.net`
- Project key: `PER`
- Email: Atlassian account email
- API token: generated at `id.atlassian.com → Security → API tokens`
  (stored only in the connector config, not in this repo)
- Tested in-UI, confirmed a test issue appeared in the `PER` project.

### 5.4 Create the detection rules

**Security → Rules → Manage rules → Create new rule**, for each technique:

- **Rule type:** Custom query rule
- **Index pattern:** `winlogbeat-*`
- **Custom query:** the Lucene query from step 5.2
- **Schedule:** every 5 minutes
- **Severity / risk score:** set per MITRE's own guidance for the technique,
  not maxed out by default
- **Actions:**
  - T1059.001 → Webhook action, JSON body with `{{context.rule.name}}` /
    `{{context.alerts.length}}` template variables
  - T1547.001 → Jira action:
    - Issue type: Task
    - Summary (required field): `SIEM Alert: T1547.001 - Registry Run Key Persistence Detected`
    - Additional comments: rule name + alert count via Mustache variables
    - **Response actions** (Osquery / Elastic Defend) left empty — those
      require Elastic Agent + Defend deployed on the endpoint, which this
      lab doesn't use (Winlogbeat/Sysmon and Filebeat/Auditd instead)
    - **Action frequency:** Summary of alerts → on each rule execution
      (bundles all matches from one run into a single Jira ticket instead of
      one ticket per matching event)

### 5.5 Re-trigger and confirm

```powershell
Invoke-AtomicTest T1547.001
```

**Result — T1547.001:** 10 High-severity alerts fired in Kibana
(`t1547_001 Registry`, host `desktop-0r0eq17`), and a corresponding Jira
issue (`PER-1`) was created successfully. Full detection → alert → ticket
pipeline confirmed working end-to-end.

**Result — T1059.001:** re-running the unscoped technique reproduced the
Phase 4.2 problem — most sub-tests fail on `Access is denied`, and the one
that does succeed (Test #6) uses a COM-object-based download method whose
Sysmon `CommandLine` field doesn't contain the literal strings the Sigma
rule searches for. Searching Kibana Discover for `DownloadString` only
surfaced T1547.001 events — because that atomic's *own* staging script
happens to use `DownloadString` internally to fetch its payload. Root cause
confirmed via Discover: no matching Sysmon event exists for the T1059.001
pattern this rule targets, so zero alerts is the correct (if unhelpful)
behavior — not a broken rule.

**Fix:** rather than fight Test #6's elevation and COM-logging quirks,
switched the third technique to **T1082 — System Information Discovery,
Test #1** (`systeminfo & reg query ...`), which requires no elevation and
produces a plain Sysmon Event ID 1 process-creation log:

```powershell
Invoke-AtomicTest T1082 -TestNumbers 1
```

New Sigma rule for this technique:
```yaml
title: System Information Discovery via systeminfo
id: <generated-guid>
status: test
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    Image|endswith: '\systeminfo.exe'
  condition: selection
level: low
```
```bash
sigma convert -t lucene -p ecs_windows t1082_systeminfo.yml
```
```
process.executable.caseless:*\\systeminfo.exe
```

---

## Open items / next steps

- [ ] Wire the T1082 rule into Kibana (Custom query rule, 5-min schedule,
      pick Webhook or Jira for its action — the slot not yet doubled up)
- [ ] Re-trigger T1082 and confirm alert + downstream action both fire
- [ ] Repeat the "does the alert fire" check for T1003 (credential dumping)
      once tested — not yet confirmed working end-to-end
- [ ] Write up `detections/T1059.001.md`, `detections/T1547.001.md`,
      `detections/T1082.md` (or T1003, whichever ends up confirmed) per the
      analyst-report format in Phase 6
- [ ] Record the end-to-end demo video (attack → alert → Jira/webhook)
- [ ] Revoke and regenerate the Jira API token used during testing before
      considering this "done," since it was pasted in plaintext into working
      notes at one point