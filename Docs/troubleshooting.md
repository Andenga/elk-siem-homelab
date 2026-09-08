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


**Linux victim **

11. 

12. 

13. 

14. 

15. 






