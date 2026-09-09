1. **Unable to copy/paste commands into ubuntu server**

    Typing long commands into ubuntu server is a very tedious job and you are prone to making mistakes as you type, it is better to paste the long commands to save on time otherwise spent on debugging.

    I am therefore going to use my local terminal on my host machine by connecting it to the ubuntu server in my VM ware through ssh.

    I am going to get my ubuntu server's ip address while it is connected to the internet using NAT by using the command 
    ip a

    then on my local machine's terminal, I will ssh into it and accept the security prompt.

    Once connected, you can use your local terminal to copy commands and they will get implemented in your VM ware ubuntu's server.

2. Kibana not displaying logs
    - Make sure all the machines in VM ware are on the same subnet. If they are not, reconfigure your       network to ensure they are in the same Host-only network and if you are using two networks, make sure the added one is in customized to the right VMnet network.

    - After checking the internet configurations and making sure that you are using the right password accross all the VM servers, you can check to see if winlog can reach the network pipelin
    .\winlogbeat.exe test output

    The output should look something like this
    

```python
            elasticsearch: http://192.168.218.134:9200...
            parse url... OK
            connection...
                parse host... OK
                dns lookup... OK
                addresses: 192.168.218.134
                dial up... OK
            TLS... WARN secure connection disabled
            talk to server... OK
            version: 8.15.0
```

*****************************************8

    192.168.57.133

    ssh username@ip_address



Elastic search password : E0Xv1ALLwvBQaWJIWCdF
Kibana search password : c3VTBsatoIamIEnzjPlU
 
 curl -u elastic:E0Xv1ALLwvBQaWJIWCdF http://localhost:9200/_cluster/health?pretty

**Major Steps**

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
    docker run hello-world

4. Start docker compose
    docker compose up -d

5. Verify elastic is up and running 
     curl -u elastic:E0Xv1ALLwvBQaWJIWCdF http://localhost:9200/_cluster/health?pretty

    "status": "green" or "yellow" are both fine on a single node.

6. Open Kibana at http://192.168.218.134:5601 and log in as elastic.

**In the Windows Machine**

7.  Equally connect windows to the internet and add another netword for the selected Host-only option earlier.
    - Run powershell as administrator

8. Start winlogbeat 
    - Start-Service winlogbeat

9. Verify winlogbeat is working
    - Get-Service winlogbeat

10. Open Kibana at http://192.168.218.134:5601 and log in as elastic.
    - You can view the winlogbeat logs here.

    - If it fails start by checking connection
    Test-NetConnection -ComputerName 192.168.218.134 -Port 9200


11. Load atomic redteam.
     Import-Module "C:\AtomicRedTeam\invoke-atomicredteam\Invoke-AtomicRedTeam.psd1" -Force

12. Test that the ID's are identified.
    Invoke-AtomicTest T1059.001 -ShowDetailsBrief

13. 
    Endpoint Protection Block (Tests 1, 3, 4, 5): Windows Defender or another Anti-Malware solution (AMSI) actively blocked the execution of known hacking tools (like Mimikatz).
    
    Missing Dependencies (Test 2): The required hacking tool (BloodHound/SharpHound) was not downloaded or installed on the system prior to running the test.


    Test 1 (Mimikatz): Still throws Exception calling "Start" with "0" argument(s): "Access is denied".Why? Mimikatz is one of the most heavily signature-blocked tools in existence. Even if you turned off Real-Time protection, Windows Defender has a hardcoded, un-bypassable engine feature called AMSI (Antimalware Scan Interface) or Tamper Protection that blocks any memory string containing the word "Mimikatz".
    
    Test 12 (PSRemoting): Says PSRemoting must be enabled.Why? This test simulates remote execution, which requires Windows PowerShell Remoting to be turned on locally.


    Turn off Tamper Protection




14. Generate attack data
    Invoke-AtomicTest T1059.001
    Invoke-AtomicTest T1547.001
    Invoke-AtomicTest T1003


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

16. COnfirm suricata is installed and check it's version
    suricata --build-info | head -20
    suricata -V
    
17. Back up the config first
    sudo cp /etc/suricata/suricata.yaml /etc/suricata/suricata.yaml.bak


18. Test the config for syntax errors before running for real
    sudo suricata -T -c /etc/suricata/suricata.yaml -v

19. Start Suricata      
    sudo systemctl enable suricata
    sudo systemctl start suricata
    sudo systemctl status suricata

20. 
    From Kali, generate some traffic:

    
    ping 192.168.75.140 -c 4

    Back on ELK-Server, watch the log grow live:

    
    sudo tail -f /var/log/suricata/eve.json

    You should see JSON lines streaming in (likely event_type":"flow" or similar for the ping). If you see nothing at all, that's the promiscuous-mode / network-visibility issue

21. It's best practice to use a virtual environment so this doesn't clash with your system Python packages:

    
    python3 -m venv ~/sigma-venv
    source ~/sigma-venv/bin/activate

You'll need to run that source command again every time you open a new terminal and want to use sigma-cli.

The below commands happen in the virtual env

22. COnfirm sigma-cli is installed
    sigma version

23. 
    


24. 


25. 






