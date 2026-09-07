1. **Unable to copy/paste commands into ubuntu server**

    Typing long commands into ubuntu server is a very tedious job and you are prone to making mistakes as you type, it is better to paste the long commands to save on time otherwise spent on debugging.

    I am therefore going to use my local terminal on my host machine by connecting it to the ubuntu server in my VM ware through ssh.

    I am going to get my ubuntu server's ip address while it is connected to the internet using NAT by using the command 
    ip a

    then on my local machine's terminal, I will ssh into it and accept the security prompt.

    Once connected, you can use your local terminal to copy commands and they will get implemented in your VM ware ubuntu's server.

    192.168.57.133

    ssh username@ip_address



Elastic search password : E0Xv1ALLwvBQaWJIWCdF
Kibana search password : c3VTBsatoIamIEnzjPlU
 
 curl -u elastic:E0Xv1ALLwvBQaWJIWCdF http://localhost:9200/_cluster/health?pretty

**Major Steps**

1. COnfirming connectivity
    ping -c 4 192.168.218.134   # ELK server 
    ping -c 4 192.168.218.128   # Windows victim
    ping -c 4 192.168.218.131   # Linux victim/Ubuntu Server

2. Elk server terminal connection (The below tasks are done in ELK server)
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

7. 

8. 

9. 

10. 

11. 

12. 

13. 

14. 

15. 






