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

3. No rules option in Kibana.
    
4. Windows blocking mitre attack tests
    Endpoint Protection Block (Tests 1, 3, 4, 5): Windows Defender or another Anti-Malware solution (AMSI) actively blocked the execution of known hacking tools (like Mimikatz).
    
    Missing Dependencies (Test 2): The required hacking tool (BloodHound/SharpHound) was not downloaded or installed on the system prior to running the test.


    Test 1 (Mimikatz): Still throws Exception calling "Start" with "0" argument(s): "Access is denied".Why? Mimikatz is one of the most heavily signature-blocked tools in existence. Even if you turned off Real-Time protection, Windows Defender has a hardcoded, un-bypassable engine feature called AMSI (Antimalware Scan Interface) or Tamper Protection that blocks any memory string containing the word "Mimikatz".
    
    Test 12 (PSRemoting): Says PSRemoting must be enabled.Why? This test simulates remote execution, which requires Windows PowerShell Remoting to be turned on locally.


    Turn off Tamper Protection


5.       hydra -l administrator -P /usr/share/wordlists/rockyou.txt -t 1 -W 10 rdp://192.168.218.135 # T1110

        -t 1 -W 3: This forces Hydra to try only 1 password every 3 seconds. Since your target is a Windows machine, if you do not use these slow settings, the Windows RDP service will instantly lock up, block you, or crash, giving you the freerdp: The connection failed to establish error again.

        - Windows has an Account Lockout Policy and network throttling mechanisms built into its RDP service.

                The persistent [ERROR] all children were disabled due too many connection errors right at the start of a fresh command means the Windows RDP service has completely locked you out or stopped responding to port 3389.
        When Hydra crashes a service or triggers Windows security protections, the target host stops accepting any new connections on that port until it is reset.
        You must clear the existing corrupted session state and fix the Windows side to get this working.

        ***************


    6. Real attack traffic from Kali against both victims
    - nmap -sV 192.168.218.135 192.168.218.136      # T1046 — network service discovery

        Try this if the ports are blocked by windows defender or linux 
        sudo nmap -Pn -p 3389 192.168.218.135 192.168.218.136

    7. WHen you run this command 

    elk@elk:~/elk-lab$ suricata --build-info | head -20
This is Suricata version 8.0.3 RELEASE
Features: NFQ PCAP_SET_BUFF AF_PACKET HAVE_PACKET_FANOUT LIBCAP_NG LIBNET1.1 HAVE_HTP_URI_NORMALIZE_HOOK PCRE_JIT HAVE_NSS HTTP2_DECOMPRESSION HAVE_LUA HAVE_JA3 HAVE_JA4 HAVE_LIBJANSSON TLS TLS_C11 MAGIC RUST POPCNT64
SIMD support: SSE_4_2 SSE_4_1 SSE_3 SSE_2
Atomic intrinsics: 1 2 4 8 16 byte(s)
64-bits, Little-endian architecture
GCC version 15.2.0, C version 201112
compiled with _FORTIFY_SOURCE=2
L1 cache line size (CLS)=64
thread local storage method: _Thread_local
compiled with LibHTP v8.0.3

Suricata Configuration:
  AF_PACKET support:                       yes
  AF_XDP support:                          yes
  DPDK support:                            yes
  eBPF support:                            yes
  XDP support:                             yes
  PF_RING support:                         no
  NFQueue support:                         yes
  NFLOG support:                           yes
elk@elk:~/elk-lab$
    
    No, you should not be concerned about PF_RING support: no in your Suricata build configuration.For the vast majority of deployments, AF_PACKET is the modern standard for high-performance packet capture on Linux. Because your output shows AF_PACKET support: yes, eBPF support: yes, and XDP support: yes, your system is fully equipped to handle high-speed traffic efficiently without needing PF_RING.

8. Unable to see create rule option
    When pressing manage rules, it redirects you to the alerts page.

9. 