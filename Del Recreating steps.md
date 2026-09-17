
1. Install VMware Workstation Pro
2. Build an isolated lab network
3. 
| VM | OS | RAM | vCPU | Disk | Role |
|---|---|---|---|---|---|
| ELK-Server | Ubuntu Server 24.04 LTS | 8–16 GB | 4 | 60 GB | Runs Elasticsearch + Kibana |
| Victim-Windows | Windows 10/11 | 4 GB | 2 | 60 GB | Monitored Windows endpoint |
| Victim-Linux | Ubuntu Server 24.04 LTS | 2 GB | 2 | 40 GB | Monitored Linux endpoint |
| Kali | Kali Linux (prebuilt VMware image) | 4 GB | 2 | 40 GB | Attacker box |


echo "ELASTIC_PASSWORD=Z21GI2WD3Fl7xnejgf3e" > .env
echo "KIBANA_PASSWORD=bo=p00Y-tULgrOQKtXSX" >> .env

Elastic search password : Z21GI2WD3Fl7xnejgf3e
Kibana search password : bo=p00Y-tULgrOQKtXSX


 


1. COnfirming connectivity
    ping -c 4 192.168.218.134   # ELK server 
    ping -c 4 192.168.218.135   # Windows victim
    ping -c 4 192.168.218.136   # Linux victim/Ubuntu Server
    ping -c 4 192.168.218.137   # Kali linux

**The below tasks are done in ELK server
**
2. Elk server terminal connection 
    Connecting ubuntu server to my local terminal using ssh
    ssh elk@192.168.57.133

3. Testing docker 
    docker ps -a

4. Start docker compose
    docker compose up -d

5. Verify elastic is up and running 
     curl -u elastic:Z21GI2WD3Fl7xnejgf3e http://localhost:9200/_cluster/health?pretty

    "status": "green" or "yellow" are both fine on a single node.
    This command taked a while to work correctly.

6. Open Kibana at http://192.168.218.134:5601 and log in as elastic.


 curl -u elastic:Z21GI2WD3Fl7xnejgf3e http://localhost:9200/_cluster/health?pretty


**In the Windows Machine**

7.  Equally connect windows to the internet and add another network for the selected Host-only option earlier.
    - Run powershell as administrator

8. Start winlogbeat 
    - Start-Service winlogbeat

9. Verify winlogbeat is working
    - Get-Service winlogbeat
        The status has to in running mode.

10. Open Kibana at http://192.168.218.134:5601 and log in as elastic.
    - You can view the winlogbeat logs here.

    - If it fails start by checking connection
    Test-NetConnection -ComputerName 192.168.218.134 -Port 9200
        The TcpTestSucceeded should be True

12. Test that the Atomic redteam ID's are identified.
    Invoke-AtomicTest T1059.001 -ShowDetailsBrief


13. 
 

14. Generate attack data

    Invoke-AtomicTest T1059.001

    To confirm Kibana actually logs this filter with 
    process.name : "powershell.exe" AND event.code : "1"
    Expand one of the boxes and search for process.command_line to see if you will see the log.


    Invoke-AtomicTest T1547.001
    To confirm Kibana actually logs this filter with 
    process.name : "powershell.exe" AND event.code : "1"
    Expand one of the boxes and search for process.command_line to see if you will see the log.


    Invoke-AtomicTest T1003


    Invoke-AtomicTest T1082 -TestNumbers 1


15.  Real attack traffic from Kali against both victims
    - nmap -sV 192.168.218.135 192.168.218.136      # T1046 — network service discovery

        Try this if the ports are blocked by windows defender or linux 
        sudo nmap -Pn -p 3389 192.168.218.135 192.168.218.136


    - hydra -l administrator -P rockyou.txt rdp://192.168.218.135   # T1110 — brute force (your own lab only)

        Modified the command 

        hydra -l administrator -P /usr/share/wordlists/rockyou.txt -t 1 -W 10 rdp://192.168.218.135 # T1110

        -t 1 -W 3: This forces Hydra to try only 1 password every 3 seconds. Since your target is a Windows machine, if you do not use these slow settings, the Windows RDP service will instantly lock up, block you, or crash, giving you the freerdp: The connection failed to establish error again.

        - Windows has an Account Lockout Policy and network throttling mechanisms built into its RDP service.

            **********************

        The persistent [ERROR] all children were disabled due too many connection errors right at the start of a fresh command means the Windows RDP service has completely locked you out or stopped responding to port 3389.
        When Hydra crashes a service or triggers Windows security protections, the target host stops accepting any new connections on that port until it is reset.
        You must clear the existing corrupted session state and fix the Windows side to get this working.

        ***************

**        Elk Machine
**
16. COnfirm suricata is installed and check it's version
    suricata --build-info | head -20

    Output should look something like this 
    Suricata Configuration:
  AF_PACKET support:                       yes
  AF_XDP support:                          yes
  DPDK support:                            yes
  eBPF support:                            yes
  XDP support:                             yes
  PF_RING support:                         yes
  NFQueue support:                         yes
  NFLOG support:                           yes
    
    If you get a no at (Check troubleshooting doc for more info)


17. Back up the config first
    sudo cp /etc/suricata/suricata.yaml /etc/suricata/suricata.yaml.bak


18. Test the config for syntax errors before running for real
    sudo suricata -T -c /etc/suricata/suricata.yaml -v

    Your output should look something like this,
    
    Notice: suricata: This is Suricata version 8.0.3 RELEASE running in SYSTEM mode
        Info: cpu: CPUs/cores online: 4
        Info: suricata: Running suricata under test mode
        Info: suricata: Setting engine mode to IDS mode by default
        Info: exception-policy: master exception-policy set to: auto
        Info: suricata: Preparing unexpected signal handling
        Info: logopenfile: fast output device (regular) initialized: fast.log
        Info: logopenfile: eve-log output device (regular) initialized: eve.json
        Info: logopenfile: stats output device (regular) initialized: stats.log
        Info: detect: 1 rule files processed. 52741 rules successfully loaded, 0 rules failed, 0 rules skipped
        Info: threshold-config: Threshold config parsed: 0 rule(s) found
        Info: detect: 52746 signatures processed. 1228 are IP-only rules, 4520 are inspecting packet payload, 46762 inspect application layer, 110 are decoder event only
        Notice: mpm-hs: Rule group caching - loaded: 117 newly cached: 0 total cacheable: 117
        Notice: suricata: Configuration provided was successfully loaded. Exiting.
    
     if you see red lines or something is not running, kindly debug the errors before continuing because it will be a problem later on in this project.

19. Start Suricata      
    sudo systemctl enable suricata
    sudo systemctl start suricata
    sudo systemctl status suricata

    The status should read like this 

    ● suricata.service - Suricata IDS/IDP daemon
     Loaded: loaded (/usr/lib/systemd/system/suricata.service; enabled; preset: enabled)
     Active: active (running) since Mon 2026-09-14 11:42:01 UTC; 22min ago

     If it is not active, that Suricata did not start successfully.


20. 
    From Kali, generate some traffic:

    
    ping 192.168.218.135 -c 4

    Back on ELK-Server, watch the log grow live:

    
    sudo tail -f /var/log/suricata/eve.json

    You should see JSON lines streaming in (likely event_type":"flow" or similar for the ping). If you see nothing at all, that's the promiscuous-mode / network-visibility issue.
    Do not proceed without debugging this step kindly.

21. It's best practice to use a virtual environment so this doesn't clash with your system Python packages:

    cd ~/detection-lab
    source ~/sigma-venv/bin/activate

You'll need to run that source command again every time you open a new terminal and want to use sigma-cli.

The below commands happen in the virtual env

22. COnfirm sigma-cli is installed
    sigma version


Run these commands and save their outputs you will use them later.

sigma convert -t lucene -p ecs_windows t1059_001_powershell.yml

        process.executable.caseless:*\\powershell.exe AND (process.command_line:(*.DownloadString* OR *.DownloadFile* OR *Invoke\-WebRequest*))

sigma convert -t lucene -p ecs_windows t1547_001_registry.yml

        registry.path:(*\\Microsoft\\Windows\\CurrentVersion\\Run\\* OR *\\Microsoft\\Windows\\CurrentVersion\\RunOnce\\*)


sigma convert -t lucene -p ecs_windows t1003_credential_dumping.yml

        winlog.event_data.TargetImage:*\\lsass.exe AND winlog.event_data.GrantedAccess:0x1010



23. Next step : WHile logged into Kibana as elastic and using the password you set above, create rules for each of this mitre attacks.

If you don't see the option to create a rule, kindly check the trouble shooting page for possible solutions

Mitre attacks we are working with:

   AtomicTest T1059.001
   AtomicTest T1547.001
   AtomicTest T1003


24.  
    Technique	Rule action / integration
    T1059.001 (PowerShell)	Webhook connector → generic REST API endpoint
    T1547.001 (Registry Run key persistence)	Jira connector → auto-creates a Jira issue



25.  . Set up the two connectors first (once each, reusable across rules)

Go to Stack Management → Connectors → Create connector.

**************8
Webhook connector (for T1059.001):

Name: T1059-PowerShell-Webhook
URL: your webhook.site unique URL (e.g. https://webhook.site/xxxxxxxx)
Method: POST (default)
Headers: optional, e.g. Content-Type: application/json
Authentication: none (webhook.site doesn't need it)
Test it right there in the UI before saving — Kibana has a built-in "test connector" button, use it and confirm you see the test payload land on webhook.site.

Jira connector (for T1547.001):

Name: T1547-Persistence-Jira
URL: your Jira Cloud instance URL, e.g. https://yourdomain.atlassian.net
Project key: whatever project you create in Jira (e.g. SOC)
Email: the email tied to your Atlassian account
API token: generate this from id.atlassian.com → Security → API tokens, not your account password
Test the connector — it should create a test issue you can see in your Jira project.

**************
 Test if Webhook Kibana Connector is working in your local powershell in windows machine

    Invoke-RestMethod -Method Post -Uri https://webhook.site/9725b194-2d6f-428e-8661-43db12981c05 -Body "test data"

    For POST: Invoke-RestMethod -Method Post -Uri "https://webhook.site" -Body "test data"
    
    For PUT: Invoke-RestMethod -Method Put -Uri "https://webhook.site" -Body "test data"

The default is in POST, so use POST


API token : ATATT3xFfGF0NP_DQf4wjdfFighjMzmmvW1tBkiTnCLPbxGQosS_0AWGOU6anph3KR2_oPoVcJd9a4yThC41be_ZoMGAWBQE9d_9nrhv22XjR30Gk3Y1AQ4rFtOZ7XbZMfGwofhr_UTbVFM9zQ7Cy9IDLCT-tzjzmsBwa_Zx0zLsuQyyGJ7683k=2D006E49

*******************
Create each detection rule

Security → Rules → Manage rules → Create new rule (this path is unchanged in your version).

For each technique:

Rule type: Custom query rule (this is what accepts your Sigma-converted Lucene query)
Index pattern: your Winlogbeat index, e.g. winlogbeat-*
Custom query: paste the Lucene query you already generated with sigma convert
Schedule: run every 5 minutes is reasonable for a homelab (real-time isn't necessary to demonstrate the concept)
Rule name: something explicit, e.g. T1059.001 - Suspicious PowerShell Download Cradle
Severity / Risk score: set these honestly based on MITRE's own severity guidance for the technique — don't just max everything out, it looks more credible to a reviewer if you show judgment here
Actions: add an action, choose your connector (Webhook for T1059.001, Jira for T1547.001), set action frequency to "per rule execution" (not per alert, unless you want one Jira ticket per matching event — usually you don't)
For the Jira action body, fill in Issue type (Bug/Task), Title using the rule name template variable, Description referencing {{context.rule.name}} and {{context.alerts}} or similar Mustache variables so the ticket actually shows what fired
For the Webhook action body, write a small JSON payload with the same template variables, e.g.:
json
{
  "technique": "T1059.001",
  "rule_name": "{{context.rule.name}}",
  "alert_count": "{{context.alerts.length}}"
}

Save. Repeat for the other two techniques.

****************


. Re-trigger each attack and confirm the alert fires
On Victim-Windows: Invoke-AtomicTest T1059.001, then Invoke-AtomicTest T1547.001


Confirm the webhook.site dashboard shows the received POST for T1059.001
Confirm a new Jira issue appeared in your project for T1547.001


******************



VIDEO

10-second intro — face-to-camera or voiceover: "This is a SIEM homelab where I simulate MITRE ATT&CK techniques and route detections into a real ticketing/webhook pipeline." State the technique ID you're about to demo.
Show the Sigma rule in your editor briefly — this proves you wrote/sourced real detection logic, not just clicked around Kibana.
Run the attack live — the actual Invoke-AtomicTest T1547.001 command in the Windows terminal, visible on screen.
Switch to Kibana Discover — show the raw Sysmon/Winlogbeat event landing (proves ingestion is real, not staged).
Switch to Security → Alerts — show the rule firing, with timestamp visible so viewers can see it's the same event.
Switch to Jira (or webhook.site) — show the new issue/payload appearing, ideally with the browser tab already open so there's no dead air waiting for it to refresh.
Close with 15 seconds — one sentence on what a real analyst would do next (ties back to your Analyst Notes section), and mention the GitHub repo link is in the description.





