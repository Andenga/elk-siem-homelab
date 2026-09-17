
# ELK SIEM Homelab

An isolated security monitoring lab for practicing detection engineering from
end to end: generate attacker behavior, collect endpoint and network
telemetry, investigate it in Kibana, and route selected detections to an
automated response destination.

The project combines an Elastic Stack server with Windows and Linux victims,
a Kali attacker, Sysmon, Winlogbeat, Auditd, Filebeat, Suricata, Atomic Red
Team, Sigma, Nmap, Hydra, a webhook connector, and a Jira connector. The
central question is deliberately practical:

> Can a specific ATT&CK technique be generated, observed, detected, and
> handed to an incident-response workflow?

## What This Project Demonstrates

- Designing a four-VM security lab on an isolated VMware host-only network.
- Deploying Elasticsearch and Kibana on Ubuntu Server with Docker.
- Collecting Windows telemetry with Sysmon and Winlogbeat.
- Collecting Linux audit telemetry with Auditd and Filebeat.
- Inspecting inter-VM traffic with Suricata.
- Running controlled Atomic Red Team tests mapped to MITRE ATT&CK.
- Generating network activity with Nmap and Hydra in an authorized lab.
- Writing detection logic as Sigma and converting it to Elastic/Lucene syntax.
- Connecting Kibana detection rules to a webhook and Jira workflow.
- Separating a test failure, a successful test, a detection, and a prevention
	event instead of treating them as the same result.

## Architecture

```text
												 Isolated host-only VMware network
																			|
						 +------------------------+------------------------+
						 |                        |                        |
				Kali Linux              Windows victim             Linux victim
		 Nmap, Hydra, ART          Sysmon + Winlogbeat         Auditd + Filebeat
						 |                        |                        |
						 +------------------------+------------------------+
																			v
												 ELK Server: Elasticsearch + Kibana
																			|
												 Suricata network telemetry
																			|
												 Kibana detection rules and actions
															|                    |
												 Webhook / REST             Jira issue
```

All attack activity is intended to remain inside the lab. The build notes
describe using a host-only adapter for private VM-to-VM traffic and, when
needed during installation, a separate NAT adapter for updates and downloads.
Do not expose the services or run the attack commands against systems you do
not own or have explicit permission to test.

## Lab Components

| Component | Role |
| --- | --- |
| VMware Workstation Pro | Hypervisor and virtual networking |
| ELK-Server, Ubuntu Server 24.04 | Elasticsearch, Kibana, and Suricata |
| Elasticsearch and Kibana 8.15.0 | Log storage, search, and detection UI |
| Victim-Windows, Windows 10/11 | Sysmon and Winlogbeat endpoint telemetry |
| Victim-Linux, Ubuntu Server 24.04 | Auditd and Filebeat endpoint telemetry |
| Kali Linux | Authorized attack simulation and network traffic generation |
| Atomic Red Team | Repeatable ATT&CK-mapped host simulations |
| Sigma and sigma-cli | Portable detection logic and Elastic conversion |
| Webhook and Jira connectors | Automated response destinations |

## ATT&CK Coverage

| ID | Technique | Activity | Evidence or status |
| --- | --- | --- | --- |
| T1059.001 | PowerShell | Atomic Red Team | Tests produced mixed results; the documented rule targets specific PowerShell download/command-line patterns. |
| T1547.001 | Registry Run Keys / Startup Folder | Atomic Red Team | Broad test coverage; Kibana alerts and Jira issue `PER-1` were confirmed in the build log. |
| T1082 | System Information Discovery | Atomic Red Team | Low-friction `systeminfo` test produced Sysmon process telemetry and was used to validate the detection path. |
| T1003 | OS Credential Dumping | Atomic Red Team | Several tests require missing tools or components; results are documented for further validation. |
| T1046 | Network Service Discovery | Nmap from Kali | Scan output is saved in `Logs/nmap-scan-output.txtb`; Suricata visibility was also tested. |
| T1110 | Brute Force | Hydra against RDP | Attempt was recorded; Windows RDP throttling and lockout behavior are documented. |

### Automated Response

Two response paths were documented and tested in Kibana:

- **T1059.001:** a webhook action posts a JSON payload containing rule and
	alert context to a REST endpoint such as webhook.site.
- **T1547.001:** a Jira action creates a task in the `PER` project, using
	templated rule name and alert-count fields. The build log records a
	successful test issue and the end-to-end `PER-1` result.

## Verified Build Evidence

The repository keeps raw outputs and screenshots alongside the narrative
documentation:

| Check | Result | Reference |
| --- | --- | --- |
| VM connectivity | Kali reached the documented lab hosts with 0% packet loss | [network-connectivity-test.txt](Logs/network-connectivity-test.txt) |
| Docker installation | Docker hello-world completed successfully | [docker-install-verified.txt](Logs/docker-install-verified.txt) |
| Elastic health | Single-node cluster reported `green`, 100% active shards | [cluster-health.txt](Logs/cluster-health.txt) |
| Elastic containers | Elasticsearch and Kibana 8.15.0 were running | [docker-ps-output.txt](Logs/docker-ps-output.txt) |
| Windows ingestion | Winlogbeat service and live Kibana data were confirmed | [Winlogbeat running status.png](Screenshots/Winlogbeat%20running%20status.png), [discover-live-log-names.png](Screenshots/discover-live-log-names.png) |
| Network monitoring | Suricata was validated and traffic appeared in `eve.json` | [suricata-alert.png](Screenshots/suricata-alert.png) |

## Recreate the Lab

The authoritative step-by-step record is [Docs/Steps guide.md](Docs/Steps%20guide.md).
The chronological record of commands and observed outcomes is [Build Log.md](Build%20Log.md).

### 1. Prepare the VMs

Recommended resources from the build guide are 16 GB or more of host RAM,
200 GB or more of free SSD space, and hardware virtualization enabled. Create
these VMs and attach each to the same custom host-only network:

| VM | Suggested resources | Purpose |
| --- | --- | --- |
| ELK-Server | 8-16 GB RAM, 4 vCPU, 60 GB disk | Elastic Stack server |
| Victim-Windows | 4 GB RAM, 2 vCPU, 60 GB disk | Windows telemetry source |
| Victim-Linux | 2 GB RAM, 2 vCPU, 40 GB disk | Linux telemetry source |
| Kali | 4 GB RAM, 2 vCPU, 40 GB disk | Attack source |

Use the IP addresses assigned by your own host-only network. The addresses in
the saved logs are examples from one run and should not be copied blindly.

### 2. Deploy Elastic

On the ELK server, install Docker and Docker Compose, create a local `.env`
file containing secrets, then start the stack:

```bash
docker compose up -d
curl -u elastic:<password> http://localhost:9200/_cluster/health?pretty
```

Open Kibana at `http://<elk-server-ip>:5601` and verify that the cluster is
healthy before configuring the Beats clients. Never commit `.env`, passwords,
API tokens, or webhook URLs.

### 3. Ingest Endpoint Logs

On the Windows victim, verify reachability and start Winlogbeat:

```powershell
Test-NetConnection -ComputerName <elk-server-ip> -Port 9200
Start-Service winlogbeat
Get-Service winlogbeat
```

On the Linux victim, configure Filebeat to ship the intended Auditd logs.
Then confirm recent Windows Security/Sysmon and Linux audit events in Kibana
Discover.

### 4. Generate Controlled Activity

From an elevated PowerShell session on the Windows victim, inspect and run
individual Atomic tests rather than assuming the entire technique collection
will work in every environment:

```powershell
Invoke-AtomicTest T1059.001 -ShowDetailsBrief
Invoke-AtomicTest T1547.001
Invoke-AtomicTest T1003
Invoke-AtomicTest T1082 -TestNumbers 1
```

From Kali, use only your lab addresses:

```bash
nmap -sV <windows-ip> <linux-ip>
hydra -l administrator -P /usr/share/wordlists/rockyou.txt -t 1 -W 10 rdp://<windows-ip>
```

The slow Hydra settings matter. The build log records that default-speed
RDP attempts triggered Windows throttling and caused Hydra children to be
disabled.

### 5. Add Network and Detection Coverage

Validate and start Suricata on the ELK server, then confirm that traffic is
appearing in `/var/log/suricata/eve.json`. Convert Sigma logic in an isolated
Python environment:

```bash
source ~/sigma-venv/bin/activate
sigma version
sigma convert -t lucene -p ecs_windows <rule-file>.yml
```

Create Kibana custom-query rules using the resulting query, select an
appropriate schedule and severity, and attach the webhook or Jira action.
Test connectors in Kibana before enabling an alerting workflow.

## What the Results Mean

The saved Atomic summaries show that many T1547.001 tests completed, while
T1059.001 and T1003 include dependency, privilege, Active Directory, missing
binary, and timeout limitations. An exit code of `0` means the Atomic test
reported completion; it does not prove that the intended behavior was
detected. Likewise, an error may indicate a missing dependency rather than a
successful security block. Detection claims should be confirmed in Kibana
telemetry and alert records.

The T1059.001 investigation is a useful example: the broad technique command
ran many sub-tests, but the successful COM-based test did not emit the literal
command-line pattern targeted by the Sigma query. The build therefore used
the focused T1082 test to produce a straightforward Sysmon process event.

## Troubleshooting

Common issues and their documented fixes are collected in
[Docs/Troubleshooting.md](Docs/Troubleshooting.md):

- Use SSH to avoid typing long commands into an Ubuntu VM console.
- Put every lab adapter on the same host-only subnet and verify credentials.
- Use `winlogbeat.exe test output` to separate network problems from Kibana problems.
- Wait for Kibana Security to initialize and use an account with detection privileges.
- Expect Windows Defender/AMSI, missing dependencies, and absent AD features to affect Atomic tests.
- Fix Suricata interface visibility and validate its configuration before testing alerts.

## Repository Guide

```text
.
├── README.md                 This overview
├── 0README.md               Earlier project outline
├── 2readme.md               Expanded project summary
├── Build Log.md             Chronological build record
├── Del Recreating steps.md  Working recreation notes
├── docker-compose.yml       Compose file placeholder in this checkout
├── Diagrams/                Network architecture image
├── Docs/                    Build, troubleshooting, and ATT&CK analyses
├── Logs/                    Raw command output and sample events
└── Screenshots/             Visual checkpoints from the lab
```

The current checkout does not contain the `detection-rules/` or `detections/`
directories described in the earlier readmes. The ATT&CK analyses and
conversion examples remain available in `Docs/Steps guide.md`, the build log,
and the saved logs.

## Safety

This is an authorized training environment. Keep victim and attacker systems
on an isolated network, use test credentials, protect connector secrets, and
run Nmap, Hydra, and Atomic Red Team only against systems you own or are
explicitly authorized to test.

## Project Status

The documented lab demonstrated Elastic health, Windows log ingestion,
Suricata traffic visibility, Atomic Red Team execution, Sigma conversion, and
automated Jira/webhook response testing. The checked-in repository is still a
build record rather than a complete deployable package: the compose
definition, Sigma rule files, and dedicated detection write-up directory need
to be added before a fresh clone can reproduce the entire environment without
the original VM-side configuration.
