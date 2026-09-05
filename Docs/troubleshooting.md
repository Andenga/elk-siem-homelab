1. **Unable to copy/paste commands into ubuntu server**

    Typing long commands into ubuntu server is a very tedious job and you are prone to making mistakes as you type, it is better to paste the long commands to save on time otherwise spent on debugging.

    I am therefore going to use my local terminal on my host machine by connecting it to the ubuntu server in my VM ware through ssh.

    I am going to get my ubuntu server's ip address while it is connected to the internet using NAT by usingh the command 
    ip a

    then on my local machine's terminal, I will ssh into it and accept the security prompt.

    Once connected, you can use your local terminal to copy commands and they will get implemented in your VM ware ubuntu's server.

    192.168.57.133



Elastic search password : E0Xv1ALLwvBQaWJIWCdF
Kibana search password : c3VTBsatoIamIEnzjPlU
 
 curl -u elastic:E0Xv1ALLwvBQaWJIWCdF http://localhost:9200/_cluster/health?pretty

