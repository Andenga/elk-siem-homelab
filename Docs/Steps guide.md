# ELK SIEM Homelab — Complete Build Guide

This guide assumes no prior VM or SIEM experience and explains every term and click. It's organized into phases — get each phase fully working before moving to the next. A finished, simple lab you can explain end-to-end beats an ambitious half-finished one, so don't rush ahead to Phase 5 with a shaky Phase 2.

**What you're building:** an isolated lab where a Windows machine and a Linux machine are monitored by a central SIEM (Elasticsearch + Kibana), while a Kali Linux machine generates real and simulated attacks against them — and Suricata watches the network traffic between everything. Every attack you run gets mapped to a MITRE ATT&CK technique and a Sigma detection rule, so the end result isn't just "logs exist" but "here's what I can detect and how."

### 📌 Documentation callouts

Boxes like these mark moments worth capturing for your portfolio repo. Capture as you go, not after the fact:
> 📸 **Screenshot** — a visual checkpoint
> 📝 **Log/output file** — raw terminal text saved as `.txt`, more verifiable than a screenshot alone
> 🎥 **Record this** — worth a video clip

---

## Part 0 — Concepts

**Virtual Machine (VM):** software pretending to be a physical computer, running inside your real one.

**Hypervisor:** the software that creates/runs VMs — VMware Workstation Pro here (free for personal use; VirtualBox or Proxmox are valid free alternatives if you'd rather use those).

**Host-only network:** a virtual network only your VMs (and optionally your host) can see — no route to your real router or the internet.

**Elasticsearch / Kibana:** the database that stores and searches your logs, and the web dashboard on top of it.

**Sysmon:** a free Microsoft Sysinternals tool that logs far more detailed Windows activity (process creation, network connections, registry changes) than default Windows auditing. Almost every Windows-based SOC detection is built on Sysmon data.

**Winlogbeat / Filebeat:** lightweight log shippers from the Elastic "Beats" family. Winlogbeat forwards Windows Event Logs (including Sysmon's); Filebeat forwards Linux log files.

**Auditd:** the Linux kernel's built-in auditing subsystem — logs things like file access, command execution, and privilege escalation attempts.

**Atomic Red Team:** a library of small, individually-runnable test scripts, each one mapped to a specific MITRE ATT&CK technique ID. Instead of improvising an "attack," you run a documented test and know exactly which technique you just simulated.

**MITRE ATT&CK:** a public, standardized catalog of real-world attacker techniques (each with an ID like T1110), used across the security industry as a common vocabulary for describing attacker behavior.

**Sigma rule:** a generic, YAML-based way of writing detection logic that isn't tied to any one SIEM. You write the rule once, then convert it to your specific backend (Elasticsearch, Splunk, etc.) with a converter tool.

**Suricata:** an open-source network intrusion detection engine — it inspects network traffic directly (not host logs) and can catch things like port scans or credentials sent in plaintext.

---

## Phase 1 — Lab Infrastructure

### 1a. Check your host machine can handle this
- **16 GB RAM minimum** on your host (24–32 GB more comfortable) — you'll eventually run 4+ VMs.
- **200+ GB free disk space**, SSD preferred.
- **Virtualization enabled in BIOS/UEFI** (Intel VT-x / AMD-V). Check via Task Manager → Performance → CPU → "Virtualization" on Windows; enable in BIOS if disabled.

### 1b. Install VMware Workstation Pro
1. Go to Broadcom/VMware's official site, create a free Broadcom account.
2. Download and install **VMware Workstation Pro** for your OS.
3. On first launch, choose **"Use VMware Workstation Pro for personal use"** — free, no key needed.

*(If you'd rather use VirtualBox or Proxmox instead — both are also free and valid choices for this project — the same network/VM concepts apply, just with different menus.)*

### 1c. Build the isolated lab network
1. **Edit → Virtual Network Editor → Change Settings** (approve the admin prompt).
2. **Add Network** → pick an unused one, e.g. `VMnet2`.
3. Set type to **Host-only** (not Bridged, not NAT).
4. Keep **"Use local DHCP service"** checked.
5. Note the subnet shown (e.g. `192.168.75.0/24`) — every VM on this network gets an address in that range.
6. **Apply → OK**.

> 📸 Screenshot the Virtual Network Editor showing VMnet2 as host-only → `screenshots/01-network-editor.png`.

### 1d. Provision the VMs

| VM | OS | RAM | vCPU | Disk | Role |
|---|---|---|---|---|---|
| ELK-Server | Ubuntu Server 24.04 LTS | 8–16 GB | 4 | 60 GB | Runs Elasticsearch + Kibana |
| Victim-Windows | Windows 10/11 | 4 GB | 2 | 60 GB | Monitored Windows endpoint |
| Victim-Linux | Ubuntu Server 24.04 LTS | 2 GB | 2 | 40 GB | Monitored Linux endpoint |
| Kali | Kali Linux (prebuilt VMware image) | 4 GB | 2 | 40 GB | Attacker box |

For each: **File → New Virtual Machine → Custom (advanced)** → point to the right ISO → set the specs above → **critically, set Network to "Use a custom network connection" → VMnet2** for every single one → Finish → install.

- Ubuntu VMs: standard install, enable OpenSSH server when prompted so you can SSH in later instead of using the console window.
- Windows VM: standard install, then **VM → Install VMware Tools** once at the desktop.
- Kali: extract the downloaded `.7z`, **File → Open** the `.vmx` inside, set its network adapter to VMnet2 before powering on. Default login `kali`/`kali` — change the password with `passwd`.

> 📸 Screenshot one VM's creation screen showing the network set to VMnet2 → `screenshots/02-vm-settings.png`.

### 1e. Confirm connectivity
From each VM, check its IP (`ip a` on Linux, `ipconfig` on Windows) and confirm it's in the VMnet2 subnet. Then from Kali, ping the others:
```bash
ping -c 4 192.168.75.130   # ELK server
ping -c 4 192.168.75.140   # Windows victim
ping -c 4 192.168.75.150   # Linux victim
```


```python
Notes
I configured the VM ware to Host only
![Host only configuration](/Images/image.png)


Windows ipv4 address : 192.168.218.128   # Windows victim
Elk server : 192.168.57.133
Kali linux : 192.168.218.129
Ubuntu server : 192.168.218.131

ping -c 4 192.168.218.131 #Ubuntu server
ping -c 4 192.168.218.132 #Elk server
ping -c 4 192.168.218.128 #Windows victim
```



> 📝 Save this output → `logs/network-connectivity-test.txt`.

If pings to Windows fail: Windows Firewall blocks ICMP by default — enable "File and Printer Sharing (Echo Request - ICMPv4-In)" for the Private profile.

---

## Phase 2 — Deploy the Elastic Stack

All commands in this phase run **on ELK-Server** (SSH in: `ssh yourusername@192.168.75.130`).

### 2a. Install Docker
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
docker run hello-world
```
> 📝 Optionally save the `hello-world` output → `logs/docker-install-verified.txt`.

### 2b. Fix Elasticsearch's memory setting
```bash
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```
This is the single most common first-run crash — Elasticsearch refuses to start without it.

### 2c. Deploy via Docker Compose
```bash
mkdir ~/elk-lab && cd ~/elk-lab
nano docker-compose.yml
```
Paste in:
```yaml
version: "2.2"
services:
  es01:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    container_name: es01
    environment:
      - node.name=es01
      - cluster.name=siem-lab
      - discovery.type=single-node
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - esdata:/usr/share/elasticsearch/data
    ports:
      - 9200:9200
    networks:
      - elk

  kibana:
    image: docker.elastic.co/kibana/kibana:8.15.0
    container_name: kibana
    depends_on:
      - es01
    environment:
      - ELASTICSEARCH_HOSTS=http://es01:9200
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=${KIBANA_PASSWORD}
    ports:
      - 5601:5601
    networks:
      - elk

networks:
  elk:
    driver: bridge

volumes:
  esdata:
```
Save (`Ctrl+O`, Enter, `Ctrl+X`). Create a `.env` file alongside it (never commit this one) with real passwords:
```bash
echo "ELASTIC_PASSWORD=YourRealPasswordHere" > .env
echo "KIBANA_PASSWORD=YourRealPasswordHere" >> .env
```
Start it:
```bash
docker compose up -d
docker exec -it es01 bin/elasticsearch-reset-password -u elastic
docker exec -it es01 bin/elasticsearch-reset-password -u kibana_system
```
Match the `kibana_system` password to your `.env`, then `docker compose up -d` again.

> 📝 Commit `docker-compose.yml` and a placeholder `.env.example` to your repo. Never commit the real `.env`.

### 2d. Verify
```bash
docker ps
curl -u elastic:YourPassword http://localhost:9200/_cluster/health?pretty
```
`"status": "green"` or `"yellow"` are both fine on a single node.

> 📝 Save both outputs → `logs/docker-ps-output.txt`, `logs/cluster-health.txt`.

Open Kibana at `http://192.168.75.130:5601` (from your host, or from inside Kali if your host can't reach VMnet2 directly) and log in as `elastic`.

---

## Phase 3 — Ingest Logs

Don't build detections on top of ingestion you haven't verified — confirm logs are flowing before Phase 4.

### 3a. Windows victim — Sysmon + Winlogbeat
1. Download **Sysmon** from Microsoft Sysinternals and the **SwiftOnSecurity Sysmon config** (a well-regarded, widely-used baseline config — search "SwiftOnSecurity sysmon-config" on GitHub) onto the Windows VM.
2. In an Administrator PowerShell/cmd:
```
sysmon64.exe -accepteula -i sysmonconfig-export.xml
```
3. Download **Winlogbeat** (matching your Elastic stack version, e.g. 8.15.0) from elastic.co.
4. Edit `winlogbeat.yml` to point at your ELK server, enabling the Sysmon and Security event log channels, and pointing `output.elasticsearch.hosts` at `["192.168.75.130:9200"]` with your `elastic` credentials.
5. Install and start it as a service:
```powershell
.\install-service-winlogbeat.ps1
Start-Service winlogbeat
```

> 📸 Once running, screenshot Kibana Discover showing Sysmon/Winlogbeat events → `screenshots/05-sysmon-events-flowing.png`.

### 3b. Linux victim — Auditd + Filebeat
On **Victim-Linux**:
```bash
sudo apt update && sudo apt install -y auditd audispd-plugins
sudo systemctl enable --now auditd
```
Install Filebeat (matching version):
```bash
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.15.0-amd64.deb
sudo dpkg -i filebeat-8.15.0-amd64.deb
```
Edit `/etc/filebeat/filebeat.yml` to point `output.elasticsearch.hosts` at `["192.168.75.130:9200"]` with your credentials, and enable the `audit` module:
```bash
sudo filebeat modules enable auditd
sudo systemctl enable --now filebeat
```

### 3c. Verify ingestion
In Kibana → **Discover**, select the relevant data view (`logs-*` or the Winlogbeat/Filebeat-specific index) and confirm both Windows and Linux events are arriving with recent timestamps.

> 📸 `screenshots/06-discover-live-logs.png`
> 📝 Export a few raw events → `logs/sample-events.ndjson`

---

## Phase 4 — Generate Attack Data

### 4a. Atomic Red Team on the Windows victim
1. On **Victim-Windows** (Administrator PowerShell):
```powershell
IEX (IWR 'https://raw.githubusercontent.com/redcanaryco/invoke-atomicredteam/master/install-atomicredteam.ps1' -UseBasicParsing)
Install-AtomicRedTeam -getAtomics
```
2. Run a small, deliberate set of techniques rather than everything — quality over quantity:

| Technique | ID | Command |
|---|---|---|
| Command and Scripting Interpreter | T1059 | `Invoke-AtomicTest T1059.001` |
| Boot/Logon Autostart Execution | T1547 | `Invoke-AtomicTest T1547.001` |
| OS Credential Dumping (stretch) | T1003 | `Invoke-AtomicTest T1003` |
 
> 📝 Save the PowerShell output for each run → `logs/atomic-<technique-id>-output.txt`.

### 4b. Real attack traffic from Kali
Against both victims:
```bash
nmap -sV 192.168.75.140 192.168.75.150      # T1046 — network service discovery
hydra -l administrator -P rockyou.txt rdp://192.168.75.140   # T1110 — brute force (your own lab only)
```
> 📝 `logs/nmap-scan-output.txt`, `logs/hydra-output.txt`

This gives you both Atomic Red Team's precisely-labeled simulations and genuine attacker-style traffic — useful because they exercise different parts of your detection stack (endpoint vs. network).

---

## Phase 4.5 — Network Monitoring (Suricata)

Do this once Phases 1–4 are solid — it's the standout-tier addition, not the minimum viable core.

1. Deploy **Suricata** (or **Security Onion**, which bundles Suricata + Zeek) on a VM positioned to see inter-VM traffic. In VMware, this means configuring a mirrored/promiscuous setup on VMnet2, or simplest: run Suricata directly on the ELK-Server VM in promiscuous mode if your setup allows it to see the relevant traffic.
2. Point Suricata's EVE JSON output at Filebeat, which forwards it into Elasticsearch alongside your endpoint logs:
```yaml
outputs:
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
```
3. Re-run the Nmap scan and Hydra attempt from Phase 4b and confirm Suricata flags them.

> 📸 `screenshots/07-suricata-alert.png`

This gives you a detection that spans both network and endpoint telemetry — a stronger story than endpoint-only visibility.

---

## Phase 5 — Build Detections (Sigma → Elastic)

This phase is what separates the project from a plain "I installed ELK" repo.

1. Install `sigma-cli`:
```bash
pip install sigma-cli
sigma plugin install elasticsearch
```
2. For each technique from Phase 4, find or write a **Sigma rule** (search the public [SigmaHQ rules repo](https://github.com/SigmaHQ/sigma) first — many common techniques already have a maintained rule) matching the relevant log field (e.g., repeated Event ID 4625 for T1110 brute force).
3. Convert it to an Elasticsearch query:
```bash
sigma convert -t lucene -p elasticsearch detection-rules/t1110-brute-force.yml
```
4. Paste the converted query into a new Kibana rule: **Security → Rules → Manage rules → Create new rule**, set it to run on a schedule and generate an alert.
5. Re-trigger the technique and confirm the alert fires.

Do this for at least 3 techniques for the minimum viable version, 5+ for the standout version.

> 📝 Save each Sigma rule in `detection-rules/`.
> 📸 Screenshot each fired alert → `screenshots/08-alert-triggered.png` (and similarly numbered for additional ones).
> 🎥 **Record at least one of these end-to-end** — running the attack through the alert appearing — as your demo video clip.

---

## Phase 6 — Document Like an Analyst

For each detection built in Phase 5, write a short incident-style report in `detections/<technique-id>.md`:

- **Scenario** — what technique was simulated and how (Atomic Red Team test, Hydra, Nmap, etc.)
- **Detection logic** — the Sigma rule and why it catches this specific behavior
- **Evidence** — screenshot of the raw log + the triggered alert
- **MITRE mapping** — technique ID and tactic
- **Analyst notes** — severity, what a real analyst would do next (escalate, contain, isolate the host, etc.)

This is the single biggest thing that separates the project from most "I set up ELK" repos on GitHub — it demonstrates analysis, not just installation.

---

## Phase 7 — Package It for Recruiters

1. Finalize the **GitHub repo**: architecture diagram, README, `/detections`, `/detection-rules`, `/screenshots`, `/logs`.
2. Write a short **LinkedIn post or blog** walking through your favorite detection end-to-end — this typically gets seen by more people than the repo link alone.
3. Record a **3–5 minute demo video** (OBS or Loom) showing one attack → detection flow live, upload it **unlisted on YouTube**, and link it in the README.

---

## Snapshot everything

Before moving between phases, snapshot every VM (**VM → Snapshot → Take Snapshot**) so a bad experiment (especially anything touching Auditd rules, Sysmon config, or Suricata) can be instantly reverted rather than requiring a rebuild.

---

## Troubleshooting quick reference

| Symptom | Likely cause / fix |
|---|---|
| VMs can't ping each other | All must be on the same custom network (VMnet2), not different vmnets or NAT/Bridged |
| Docker `permission denied` | Missed `newgrp docker` or a required logout/login after `usermod -aG docker` |
| Elasticsearch container exits immediately | `vm.max_map_count` not set — redo Phase 2b |
| Can't reach Kibana from host browser | Use the VM's VMnet2 IP, not `localhost`; or browse from inside Kali instead |
| Winlogbeat/Filebeat shows no data in Discover | Check `output.elasticsearch` credentials/host in the beat's config, and that the relevant index pattern is selected in Discover |
| Sigma conversion errors | Confirm the `elasticsearch` sigma-cli backend plugin is installed and the rule's `logsource` matches your actual field names |
| Suricata sees nothing | It's likely not actually receiving the mirrored traffic — check the network/span-port configuration, not just Suricata's own logs |

---

## Suggested time budget

1. Phase 1–2 (infra + ELK) — 1 evening
2. Phase 3 (log ingestion, both endpoints) — 1 evening
3. Phase 4–5 (first attack + first working detection) — 1 weekend
4. Remaining detections + write-ups (Phase 5–6) — spread over 1–2 weeks
5. Phase 4.5 (Suricata) if time allows
6. Phase 7 (README, diagram, video) — 1 evening

Each phase is independently demoable — if you need to show progress in an interview before the whole thing is finished, "here's my working ELK deployment and first detection" is a perfectly good answer.
