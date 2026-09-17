# ELK SIEM Homelab — Build Log

This is a running log of the steps I executed, in order, including the
real values, commands, and problems I hit along the way. Screenshots and raw
log files referenced here live in `screenshots/` and `logs/`.

All tools used in this project are free or have a free trial.

> **Note on secrets:** For security reasons I removes passwords, API keys and any PII infomation.

> Problems hit along the way, and how each was actually resolved, are
> written up in full in [`TROUBLESHOOTING.md`](Docs\Troubleshooting.md) 
---

## Phase 1 — My Infrastructure

### 1.1 Hypervisor and network
- Installed VMware Workstation Pro.
- The VMware and all the operating systems in it will have two networks configured.
  -  Custom isolated **host-only** virtual network (VMnet) for comminicating privately between the OS's
  - NAT for accessing the internet, this is for updating, downloading and accessing anything I needed from the
- 📸 [`Screenshots\Host-only network.png`](./Screenshots/Host-only%20network.png) — host-only configuration.

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
The output logs should have 0% packet loss.

📝 [`Logs/network connectivity test file`](./Logs/network-connectivity-test.txt) - a text file showing the outputs of the above tests
 
📸 [`Screenshots/Kali connectivity.png`](./Screenshots/Kali%20connectivity.png)

---

## Phase 2 — Deploy the Elastic Stack

All commands below run on **ELK-Server**.

### 2.1 Connect ubuntu server into your local machine terminal for easier control.


```bash
ssh elk@192.168.218.134
```

>   - Install docker
> 
>   - Install docker compose

📝 [`docker-install-verified.txt`](./Logs/docker-install-verified.txt)

📸 [`Screenshots/docker installation verification.png`](./Screenshots/docker%20installation%20verification.png)

### 2.2 Set elastic and Kibana password in the Environment file
```bash
echo "ELASTIC_PASSWORD=<REDACTED>" > .env
echo "KIBANA_PASSWORD=<REDACTED>" >> .env
```
`.env` is git-ignored and never committed.

### 2.3 Start docker compose  
```bash
docker ps -a
docker compose up -d
```

📝 [`Logs/docker-ps-output.txt`](./Logs/docker-ps-output.txt)

### 2.4 Verify elastic is up and running 
```bash
curl -u elastic:<Elastic-password> http://localhost:9200/_cluster/health?pretty
```
Expected: `"status": "green"` or `"yellow"` — both are fine on a single node.
This takes a little while on first boot.

📝 [`Logs/cluster-health.txt`](./Logs/cluster-health.txt)

### 2.5 Log into Kibana
Opened `http://192.168.218.134:5601` and logged in as `elastic`.

---

## Phase 3 — Log Ingestion (Windows)

Run **PowerShell as Administrator** on Victim-Windows.

### 3.1 Confirm outbound connectivity to ELK-Server

If Kibana  fails start by checking connection using powershell.

```powershell
Test-NetConnection -ComputerName 192.168.218.134 -Port 9200
```
`TcpTestSucceeded` must read `True`.

=> Make sure this is true before continuing.

### 3.2 Start Winlogbeat
```powershell
Start-Service winlogbeat
Get-Service winlogbeat   # confirm status = Running
```

📸 [`Screenshots/Winlogbeat running status.png`](./Screenshots/Winlogbeat%20running%20status.png)

### 3.3 Confirm data is flowing
Back in Kibana Discover, selected the Winlogbeat data view and confirmed
recent Sysmon/Security events were arriving. 

Even without running any commands, there should be data logs being displayed regardless. 

📸 [`discover-live-log-names.png`](./Screenshots/discover-live-log-names.png)

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

These are the attacks I am going to tinker with
| Technique | ID | Command |
|---|---|---|
| Command and Scripting Interpreter | T1059.001 | `Invoke-AtomicTest T1059.001` |
| Boot/Logon Autostart Execution | T1547.001 | `Invoke-AtomicTest T1547.001` |
| OS Credential Dumping (stretch) | T1003 | `Invoke-AtomicTest T1003` |
| System Information Discovery | T1082 | `Invoke-AtomicTest T1082` |


### 4.2 Generate attack data
```powershell
Invoke-AtomicTest T1059.001
Invoke-AtomicTest T1547.001
Invoke-AtomicTest T1003
Invoke-AtomicTest T1082
``` 
 
📝 You can view the outputs here

| Atomic Test | Output| Analysis|
|---|---|---|
| T1059.001 | [`Logs/atomic-T1059.001-output.txt`](./Logs/atomic-T1059.001-output.txt) | [Docs/T1059.001 analysis](./Docs/T1059.001%20analysis.md)|
| T1547.001 | [`Logs/atomic-T1547.001-output.txt`](./Logs/atomic-T1547.001-output.txt) | [Docs/T1547.001 analysis.md](./Docs/T1547.001%20analysis.md) |
| T1003 | [`Logs/atomic-T1003-output.txt`](./Logs/atomic-T1003-output.txt) | [Docs/T1003 analysis.md](./Docs/T1003%20analysis.md) |
| T1082 | [`Logs/atomic-T1082-output.txt`](./Logs/atomic-T1082-output.txt) | []() |


You can view the summary of my outputs in tables here [Atomic Tests Output summary](./Logs/Atomic-tests%20summary.md)


### 4.3 Real attack traffic from Kali
Ran this commands on Kali Linux machine.

```bash
# T1046 — network service discovery
nmap -sV 192.168.218.135 192.168.218.136

# fallback if ports are filtered by Windows Defender / Linux firewall
sudo nmap -Pn -p 3389 192.168.218.135 192.168.218.136

# T1110 — brute force
hydra -l administrator -P /usr/share/wordlists/rockyou.txt -t 1 -W 10 rdp://192.168.218.135
```
You can check my outputs here 

- 📝 [`logs/nmap-scan-output.txt`](./Logs/nmap-scan-output.txtb)

- 📝 [`logs/hydra-output.txt`](./Logs/hydra-output.txt)

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
📸 [`Screenshots/suricata-alert.png`](./Screenshots/suricata-alert.png)

```bash
sudo systemctl enable suricata
sudo systemctl start suricata
sudo systemctl status suricata
```

Suricata may take some time to start.

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

**T1082-system-information-discovery**
```bash
sigma convert -t lucene -p ecs_windows t1082-system-information-discovery.yml
```
```
process.command_line:(*systeminfo* OR *Get\-ComputerInfo* OR *Get\-CimInstance\ Win32_OperatingSystem* OR *Get\-CimInstance\ Win32_ComputerSystem* OR *Get\-WmiObject\ Win32_OperatingSystem* OR *Get\-WmiObject\ Win32_ComputerSystem*)
``` 

### 5.3 Set up response-integration connectors in Kibana for two Mitre attacks.

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

**Result — T1059.001:** re-running the unscoped technique produced a  problem — most sub-tests fail on `Access is denied`, and the one
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
I connected it using Jira and I was able to capture the logs.

```powershell
Invoke-AtomicTest T1082 -TestNumbers 1
```


---