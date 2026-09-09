# Analysis of MITRE ATT&CK T1003 OS Credential Dumping Using Atomic Red Team

## Abstract

This report analyses the execution of the MITRE ATT&CK T1003, **OS Credential Dumping**, Atomic Red Team test suite on a Windows system using the PowerShell command `Invoke-AtomicTest T1003`. The objective of the exercise was to simulate multiple credential-access techniques and evaluate their execution within the test environment.

The execution produced seven individual Atomic Red Team tests covering Gsecdump, NPPSpy, extraction of credentials from an `svchost.exe` memory dump, Microsoft IIS AppCmd credential retrieval, Windows Credential Manager, and NTLM authentication through RPC. The results show that the test suite itself was successfully invoked, but the individual tests did not all execute successfully. Several tests encountered missing dependencies, including `gsecdump.exe`, `NPPSPY.dll`, and `appcmd.exe`. Other tests returned an exit code of `0`, but the console output alone is insufficient to establish that the intended credential-access behavior was successfully achieved.

The exercise demonstrates an important principle of cybersecurity testing: **test execution, attack-behavior execution, detection, and prevention are separate outcomes and must not be treated as interchangeable**. The findings also demonstrate the importance of Windows credential protection, endpoint telemetry, Active Directory security, least privilege, and security monitoring.

---

## 1. Introduction

Credential theft is a major component of modern cyberattacks because authentication information can provide attackers with access to systems, applications, networks and privileged resources.

In Windows environments, credentials and authentication-related secrets can exist in several locations, including process memory, operating-system databases, security configuration, authentication subsystems and application configuration. Microsoft documents, for example, that authentication-related information can be associated with LSASS sessions and that LSA secrets may include credentials for Windows services, scheduled tasks and IIS application pools.

The MITRE ATT&CK framework categorises OS Credential Dumping as **T1003**, under the Credential Access tactic. The technique encompasses multiple forms of credential extraction rather than one specific tool or attack.

Atomic Red Team provides repeatable security tests mapped to MITRE ATT&CK techniques. The purpose of such testing is not simply to demonstrate that an attack can be performed, but to allow defenders to evaluate whether preventive controls, endpoint security products, logging, detection rules and incident-response processes identify the simulated behavior.

This report analyses the following command executed in PowerShell:

```text
Invoke-AtomicTest T1003
```

The analysis focuses on what the output demonstrates, what it does not demonstrate, why several tests failed, and the security significance of the behaviors being simulated.

---

# 2. Objectives

The objectives of the exercise were to:

1. Execute the Atomic Red Team tests associated with T1003.
2. Observe whether individual credential-access tests could execute in the Windows environment.
3. Identify execution errors and missing dependencies.
4. Interpret the reported exit codes.
5. Determine whether the supplied output demonstrates successful credential extraction.
6. Relate the simulated techniques to real-world Windows security risks.
7. Identify the defensive controls and monitoring capabilities relevant to T1003.

---

# 3. Background

## 3.1 MITRE ATT&CK

MITRE ATT&CK is a knowledge base describing adversary tactics and techniques observed in real-world cyber operations.

T1003 is named:

**OS Credential Dumping**

Credential dumping refers broadly to attempts to obtain authentication material from an operating system or its associated credential stores.

The important distinction is that T1003 does not represent a single attack.

Credential material may be targeted through:

* process memory;
* Windows security databases;
* Local Security Authority secrets;
* Active Directory databases;
* cached credentials;
* authentication mechanisms; and
* other credential-storage mechanisms.

The security significance of credential dumping arises because stolen credential material can subsequently enable activities such as privilege escalation, lateral movement, access to sensitive information and deployment of malware.

---

# 4. Experimental Environment

The supplied PowerShell output identifies the Atomic Red Team test directory as:

```text
C:\AtomicRedTeam\atomics
```

The command was executed from:

```text
PS C:\WINDOWS\system32>
```

The test command was:

```text
Invoke-AtomicTest T1003
```

The test runner subsequently attempted seven tests.

The experiment therefore consisted of:

| Component                             | Observed value                      |
| ------------------------------------- | ----------------------------------- |
| Operating environment                 | Microsoft Windows                   |
| Shell                                 | PowerShell                          |
| Test framework                        | Atomic Red Team / Invoke-AtomicTest |
| ATT&CK technique                      | T1003 — OS Credential Dumping       |
| Atomic test directory                 | `C:\AtomicRedTeam\atomics`          |
| Number of tests shown                 | 7                                   |
| Tests with explicit dependency errors | 4                                   |
| Tests reporting exit code 0           | 6                                   |
| Tests reporting exit code 1           | 1                                   |

The last two figures require an important qualification: an Atomic test reporting `Exit code: 0` does **not by itself establish that the simulated attack objective was achieved**.

---

# 5. Methodology

The methodology used for this analysis was based on the following stages.

### Stage 1 — Test invocation

The T1003 Atomic Red Team test collection was invoked through PowerShell:

```text
Invoke-AtomicTest T1003
```

### Stage 2 — Individual test execution

The framework sequentially attempted the seven T1003-related tests.

### Stage 3 — Output analysis

The console output was examined for:

* successful execution messages;
* errors;
* missing files;
* missing Windows components;
* exit codes; and
* indications of expected artifacts.

### Stage 4 — Result classification

Each test was classified as one of:

* confirmed failure;
* incomplete/not demonstrated;
* framework-level completion requiring validation.

### Stage 5 — Security interpretation

The observed behavior was then considered in relation to:

* Windows authentication;
* credential protection;
* Active Directory;
* endpoint detection;
* lateral movement; and
* real-world credential theft.

An important methodological limitation is that the supplied evidence consists of console output only. No Event Viewer logs, Sysmon records, EDR alerts, generated files, hashes, process telemetry or screenshots were provided. Consequently, the report does not claim that credential material was actually obtained where the output does not prove this.

---

# 6. Results

## 6.1 Overall Results

The following table summarises the supplied output.

| Test    | Description                                              | Observed result                       | Assessment          |
| ------- | -------------------------------------------------------- | ------------------------------------- | ------------------- |
| T1003-1 | Gsecdump                                                 | `gsecdump.exe` not found; exit code 1 | Failed              |
| T1003-2 | NPPSpy                                                   | `NPPSPY.dll` not found; exit code 0   | Not demonstrated    |
| T1003-3 | Dump `svchost.exe` for RDP credentials                   | Exit code 0; no visible error         | Requires validation |
| T1003-4 | IIS AppCmd credential retrieval using list               | `appcmd.exe` not found                | Not demonstrated    |
| T1003-5 | IIS AppCmd credential retrieval using config             | `appcmd.exe` not found                | Not demonstrated    |
| T1003-6 | Credential Manager using `keymgr.dll` and `rundll32.exe` | Exit code 0                           | Requires validation |
| T1003-7 | Send NTLM hash with RPC test connection                  | Exit code 0                           | Requires validation |

The most significant overall finding is therefore:

> **The supplied output demonstrates execution of the T1003 test suite, but it does not demonstrate successful execution of all seven credential-access behaviors.**

---

# 7. Test-by-Test Analysis

## 7.1 T1003-1 — Gsecdump

The first test produced:

```text
Executing test: T1003-1 Gsecdump
'C:\AtomicRedTeam\atomics\..\ExternalPayloads\gsecdump.exe'
is not recognized as an internal or external command,
operable program or batch file.
Exit code: 1
```

The path resolves conceptually to:

```text
C:\AtomicRedTeam\ExternalPayloads\gsecdump.exe
```

The system could not locate or execute the required executable.

### Result

This test should be classified as:

**Failed due to missing dependency.**

There is no evidence in the supplied output that Gsecdump executed or that credential material was obtained.

### Security significance

Gsecdump represents the broader concept of extracting credential information from Windows security-related stores.

The significance of such behavior is that an attacker who obtains password hashes or other authentication material may be able to use it in subsequent attacks.

---

## 7.2 T1003-2 — Credential Dumping with NPPSpy

The second test produced:

```text
[!] Please, logout and log back in.
Cleartext password for this account is going to be located in C:\NPPSpy.txt
```

The test then produced:

```text
Copy-Item :
Cannot find path
'C:\AtomicRedTeam\ExternalPayloads\NPPSPY.dll'
because it does not exist.
```

Despite this error, the test reported:

```text
Exit code: 0
```

### Result

This test should **not** be classified as a successful credential-dumping demonstration.

The required `NPPSPY.dll` was unavailable, and therefore the supplied output does not demonstrate that the intended mechanism was installed or that credentials were captured.

### Why the exit code is misleading

PowerShell distinguishes its own error handling from the exit status of native programs. Microsoft documents that PowerShell can generate non-terminating errors, display them and continue execution; native applications separately report failure through exit codes.

Consequently:

```text
Exit code: 0
```

cannot safely be interpreted as:

```text
Credential theft succeeded.
```

It only indicates that the relevant execution path ultimately reported a zero exit status.

### Security significance

The test is significant because it illustrates that credentials can potentially be targeted through authentication mechanisms rather than only through direct memory dumping.

---

# 8. T1003-3 — Dump `svchost.exe` to Gather RDP Credentials

The third test produced:

```text
Executing test: T1003-3 Dump svchost.exe to gather RDP credentials
Exit code: 0
Done executing test...
```

No explicit error appears in the supplied output.

### Result

This test should be classified as:

**Framework-level completion; successful behavior not independently verified.**

The output provides evidence that the Atomic test runner completed the test without reporting an error, but it does not provide sufficient evidence to establish that:

* a memory dump was actually created;
* the dump contained credential material;
* credentials were successfully extracted; or
* a defensive product detected the behavior.

### Security significance

Process memory is an important credential-protection concern in Windows.

Microsoft explains that authentication-related information can be associated with LSASS logon sessions and that Windows has introduced additional protections specifically to prevent unauthorized access to LSA credentials.

This makes process-memory protection and monitoring important elements of Windows endpoint security.

---

# 9. T1003-4 — IIS AppCmd Credential Retrieval

The fourth test attempted to execute:

```text
C:\Windows\System32\inetsrv\appcmd.exe
```

The system responded:

```text
The term
'C:\Windows\System32\inetsrv\appcmd.exe'
is not recognized
```

### Result

The test did not execute the intended AppCmd operation.

The most direct interpretation is that the expected IIS management executable was unavailable at the specified path.

This may indicate that IIS was not installed, the expected IIS components were absent, or the environment differed from the prerequisites assumed by the Atomic test.

### Security significance

This test is important because web servers and application pools can involve service identities and credentials.

Microsoft documents that LSA secrets may include passwords associated with IIS application pools and websites.

Thus, compromising an IIS server can potentially expose credentials that are valuable beyond the web server itself.

---

# 10. T1003-5 — IIS AppCmd Credential Retrieval Using Configuration

The fifth test again attempted to execute:

```text
C:\Windows\System32\inetsrv\appcmd.exe
```

The same command-not-found error occurred.

### Result

The intended test was not demonstrated.

The output shows a missing dependency rather than successful credential retrieval.

### Interpretation

Tests 4 and 5 demonstrate the importance of **test prerequisites**.

An Atomic Red Team test is not automatically applicable to every Windows system. A test involving IIS requires an environment in which the relevant IIS components exist.

Therefore, the appropriate conclusion is not:

> "IIS credential dumping was blocked."

Nor is it:

> "IIS credential dumping succeeded."

The correct conclusion is:

> **The IIS credential-access tests could not be evaluated because the required IIS executable was unavailable.**

---

# 11. T1003-6 — Credential Manager

The sixth test produced:

```text
Executing test: T1003-6 Dump Credential Manager using keymgr.dll and rundll32.exe
Exit code: 0
```

No explicit error was shown.

### Result

The framework reported completion.

However, the supplied output does not demonstrate the extraction of a credential.

The appropriate classification is therefore:

**Completed at the test-runner level; behavior requires independent validation.**

### Security significance

Credential Manager is important because applications and Windows components can maintain stored authentication information.

Microsoft's Credential Guard documentation explains that modern Windows can use virtualization-based security to isolate protected credentials and reduce credential theft, including protection for NTLM-derived credentials, Kerberos ticket-granting tickets and certain application-stored domain credentials.

---

# 12. T1003-7 — Send NTLM Hash With RPC Test Connection

The seventh test produced:

```text
Executing test: T1003-7 Send NTLM Hash with RPC Test Connection
Exit code: 0
```

No error was shown.

### Result

As with tests 3 and 6, the framework reports completion, but the console output alone does not establish the complete security outcome.

The result should therefore be classified as:

**Framework-level completion requiring telemetry validation.**

### Security significance

NTLM remains an important component of Windows authentication security.

From a defensive perspective, NTLM-related activity matters because authentication material can potentially be exposed, replayed or abused in broader credential attacks.

Microsoft's modern credential-protection architecture specifically includes protections for NTLM-derived credentials. Credential Guard uses virtualization-based security to isolate protected credential material from the ordinary operating-system environment.

---

# 13. Discussion

## 13.1 The Most Important Finding

The most important conclusion from this experiment is that **exit codes must not be interpreted in isolation**.

The output contains a particularly useful example:

```text
Cannot find path
'C:\AtomicRedTeam\ExternalPayloads\NPPSPY.dll'
because it does not exist.

Exit code: 0
```

A superficial analysis might report:

> "The NPPSpy test succeeded because the exit code was zero."

That conclusion is not supported by the evidence.

The output explicitly states that a required DLL could not be found.

PowerShell's documented error model explains why an error can be displayed while execution continues.

Therefore, security testing should evaluate several independent dimensions.

---

# 14. Test Execution Versus Attack Success

A useful framework is:

```text
Atomic test invoked
        |
        v
Test command executes
        |
        v
Simulated behavior occurs
        |
        v
Expected artifact generated
        |
        v
Windows produces telemetry
        |
        v
EDR detects behavior
        |
        v
SIEM receives alert
        |
        v
SOC investigates/responds
```

These are different stages.

A test may succeed at stage one while failing at stage three.

Alternatively, the simulated behavior may occur successfully while the security control fails to detect it.

Consequently, the experiment should ideally evaluate:

| Question                         | Meaning               |
| -------------------------------- | --------------------- |
| Did the Atomic test launch?      | Test execution        |
| Did the intended behavior occur? | Behavioral execution  |
| Was an artifact generated?       | Evidence of activity  |
| Was Windows telemetry generated? | Visibility            |
| Did EDR detect it?               | Endpoint detection    |
| Did SIEM receive it?             | Monitoring            |
| Did an alert fire?               | Detection engineering |
| Did analysts respond?            | Operational readiness |

---

# 15. Defensive Significance

Credential dumping is particularly dangerous because credential theft can become a bridge between an initial compromise and broader network compromise.

A simplified attack chain is:

```text
Initial compromise
       |
       v
Credential access
       |
       v
Credential theft
       |
       v
Valid account / credential reuse
       |
       v
Lateral movement
       |
       v
Privilege escalation
       |
       v
Domain compromise
       |
       +------------+
       |            |
       v            v
 Data theft     Ransomware
```

The attacker therefore does not necessarily need to remain on the original compromised computer.

---

# 16. Windows Credential Protection

Modern Windows includes several mechanisms designed to reduce credential theft.

## 16.1 LSA Protection

Microsoft describes LSA protection as a mechanism designed to prevent untrusted code from injecting into or improperly accessing the LSA environment. It is intended to protect sensitive credential information.

## 16.2 Credential Guard

Credential Guard uses virtualization-based security to isolate credential secrets.

Microsoft states that Credential Guard protects NTLM password hashes, Kerberos TGTs and certain application credentials, placing protected secrets in an isolated environment that is not accessible to the ordinary operating system.

Microsoft also states that Credential Guard is enabled by default on eligible domain-joined Windows 11 22H2-or-later systems and Windows Server 2025 systems that meet the relevant requirements, unless it has been explicitly disabled.

This is directly relevant to T1003 because one of the principal goals is to make credential material harder to extract from a compromised operating system.

---

# 17. Limitations of Credential Guard

Credential Guard should not be treated as a complete solution.

Microsoft explicitly notes that Credential Guard does not eliminate every identity attack. Attackers may still abuse credentials through privileges available on a compromised device, weak application configurations, management tools and other mechanisms.

Therefore, an effective security architecture requires defense in depth:

```text
Credential Guard
       +
LSA Protection
       +
Least Privilege
       +
MFA
       +
EDR
       +
SIEM
       +
Network Segmentation
       +
Active Directory Security
```

---

# 18. Importance of Least Privilege

The impact of credential theft depends heavily on the privileges associated with the compromised account.

For example:

```text
Low-privilege account
        |
        +-- limited file access
        +-- limited administrative capability
```

is substantially different from:

```text
Privileged account
        |
        +-- server administration
        +-- Active Directory administration
        +-- security-control modification
        +-- access to sensitive information
```

Consequently, credential protection and access control must be considered together.

Microsoft's credential-protection guidance specifically recommends limiting access according to the principle of least privilege.

---

# 19. Relationship to Active Directory

T1003 should also be understood in the context of Active Directory.

An attacker who obtains credentials from an endpoint may attempt to use them against:

* file servers;
* application servers;
* databases;
* domain resources;
* remote administration services;
* cloud-connected systems.

The security implications become considerably greater when privileged accounts or domain credentials are compromised.

For this reason, further study should include:

* NTDS;
* Kerberos;
* NTLM;
* DCSync;
* Pass the Hash;
* Pass the Ticket;
* Valid Accounts;
* Remote Services;
* service accounts.

---

# 20. Importance to Ransomware

Credential theft can be particularly important in ransomware operations.

A ransomware operator may need to move from an initially compromised machine to multiple servers before deploying encryption or stealing data.

Credential access can facilitate this process:

```text
Compromised endpoint
        |
        v
Credential theft
        |
        v
Privileged account
        |
        v
Lateral movement
        |
        v
Multiple systems compromised
        |
        v
Ransomware deployment
```

This makes T1003 relevant not only to traditional credential theft but also to broader organizational resilience against ransomware.

---

# 21. Detection and Monitoring

A mature defensive environment should collect telemetry capable of identifying suspicious credential-access behavior.

Relevant categories include:

### Process creation

Monitor unusual execution of:

* PowerShell;
* `rundll32.exe`;
* memory-dump utilities;
* administrative tools;
* credential-related utilities.

### Process access

Particular attention should be given to suspicious access to sensitive authentication processes.

### File creation

Unexpected:

* memory dumps;
* credential-output files;
* suspicious DLLs;
* configuration extracts.

### Registry activity

Especially relevant where credential-access techniques modify authentication-related configuration.

### Authentication activity

Monitor unusual:

* NTLM authentication;
* privileged logons;
* remote logons;
* service-account use;
* lateral authentication.

### EDR telemetry

Endpoint detection platforms should ideally correlate process, memory, file, registry and identity activity.

---

# 22. Reliability of the Experimental Results

The experiment has several limitations.

## 22.1 Missing dependencies

The output demonstrates missing:

```text
gsecdump.exe
NPPSPY.dll
appcmd.exe
```

Therefore, several tests could not be meaningfully evaluated.

## 22.2 No endpoint telemetry supplied

No EDR alerts, Sysmon logs, Windows Security events or PowerShell logs were included.

Therefore, detection effectiveness cannot be evaluated.

## 22.3 No artifacts supplied

The output does not show whether expected dump or credential-related files were created.

Therefore, actual behavioral success cannot be established for the tests returning exit code 0.

## 22.4 No environmental information

The output does not specify:

* Windows version;
* Windows edition;
* whether the machine is domain joined;
* whether IIS is installed;
* whether Credential Guard is enabled;
* whether LSA protection is enabled;
* whether an EDR product is installed;
* whether the shell was elevated.

These variables can materially affect test behavior.

---

# 23. Evaluation of the Experiment

Based strictly on the supplied evidence, the experiment can be assessed as follows:

### Test-suite execution

**Successful.**

The T1003 collection was successfully invoked and individual tests were attempted.

### Dependency readiness

**Incomplete.**

Several required executables or DLLs were unavailable.

### Demonstration of credential dumping

**Not conclusively demonstrated.**

The output does not establish successful credential extraction.

### Detection effectiveness

**Cannot be determined.**

No security-product telemetry was supplied.

### Prevention effectiveness

**Cannot be determined.**

No evidence establishes whether Windows or security controls prevented the intended behaviors.

### Overall laboratory result

**Incomplete credential-access validation.**

This is the most defensible academic conclusion.

---

# 24. Recommended Improvements to the Experiment

For a subsequent controlled laboratory experiment, the test environment should be documented before execution.

The following should be recorded:

| Category                | Information             |
| ----------------------- | ----------------------- |
| Operating system        | Version/build           |
| Architecture            | x64/x86                 |
| Privileges              | Standard/elevated       |
| Domain membership       | Yes/No                  |
| IIS                     | Installed/not installed |
| EDR                     | Product/configuration   |
| Antivirus               | Product/configuration   |
| Credential Guard        | Enabled/disabled        |
| LSA protection          | Enabled/disabled        |
| Sysmon                  | Installed/not installed |
| Logging                 | Relevant audit policies |
| Atomic Red Team version | Version                 |
| Test dependencies       | Available/missing       |

The experiment should then record not merely exit codes, but:

* exact test;
* expected behavior;
* actual behavior;
* generated artifacts;
* Windows telemetry;
* EDR detection;
* SIEM detection;
* response;
* cleanup status.

---

# 25. Recommended Results Matrix for Future Testing

A stronger experimental record would use a matrix such as:

| ATT&CK | Test               | Prerequisite            | Execution        | Artifact       | Detection      | Result     |
| ------ | ------------------ | ----------------------- | ---------------- | -------------- | -------------- | ---------- |
| T1003  | Gsecdump           | Binary                  | Failed           | None           | N/A            | Incomplete |
| T1003  | NPPSpy             | DLL                     | Failed           | None confirmed | N/A            | Incomplete |
| T1003  | svchost dump       | Appropriate environment | Completed/verify | To be verified | To be verified | Pending    |
| T1003  | IIS AppCmd         | IIS/AppCmd              | Failed           | None           | N/A            | Incomplete |
| T1003  | IIS AppCmd config  | IIS/AppCmd              | Failed           | None           | N/A            | Incomplete |
| T1003  | Credential Manager | Appropriate environment | Completed/verify | To be verified | To be verified | Pending    |
| T1003  | NTLM/RPC           | Appropriate environment | Completed/verify | To be verified | To be verified | Pending    |

This structure separates **execution evidence** from **security conclusions**.

---

# 26. Conclusion

The execution of:

```text
Invoke-AtomicTest T1003
```

successfully initiated the Atomic Red Team T1003 test collection, but the supplied results do not demonstrate successful execution of all credential-dumping behaviors.

The first test, Gsecdump, failed because `gsecdump.exe` was unavailable. The second test, NPPSpy, encountered a missing `NPPSPY.dll`, despite subsequently reporting an exit code of `0`. The fourth and fifth tests failed to execute because the expected IIS `appcmd.exe` executable was unavailable. Tests three, six and seven returned exit code `0` without visible errors, but additional evidence is required before concluding that their intended credential-access behaviors were successfully performed.

The experiment therefore demonstrates an important principle of cybersecurity assessment: **exit codes alone are insufficient evidence of attack success**. PowerShell's error-handling model allows errors to be displayed while execution continues, meaning that a zero exit status does not necessarily establish successful execution of every underlying operation.

From a security perspective, T1003 is important because credential material can provide attackers with an avenue from an initially compromised endpoint to broader access, lateral movement and privilege escalation. Microsoft's current credential-protection architecture includes LSA protection and Credential Guard specifically to reduce the ability of malicious processes to access sensitive authentication material.

The exercise should therefore be considered an **initial or incomplete validation of T1003**, rather than a conclusive demonstration of successful credential dumping or successful defensive prevention.

A complete assessment would require the missing test prerequisites to be resolved in an authorized laboratory, followed by collection and analysis of endpoint, Windows and security-product telemetry. The ultimate objective should not merely be to determine whether an Atomic test can run, but whether the organization can **prevent, detect, investigate and respond to credential-access behavior**.

---

# References

1. MITRE ATT&CK. *OS Credential Dumping — T1003*. MITRE ATT&CK Knowledge Base.
   https://attack.mitre.org/techniques/T1003/

2. Microsoft. *Advanced credential protection*. Microsoft Learn.
   https://learn.microsoft.com/en-us/windows/security/book/identity-protection-advanced-credential-protection

3. Microsoft. *Credential Guard overview*. Microsoft Learn.
   https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/

4. Microsoft. *How Credential Guard works*. Microsoft Learn.
   https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/how-it-works

5. Microsoft. *Configure added LSA protection*. Microsoft Learn.
   https://learn.microsoft.com/en-us/windows-server/security/credentials-protection-and-management/configuring-additional-lsa-protection

6. Microsoft. *Credentials Processes in Windows Authentication*. Microsoft Learn.
   https://learn.microsoft.com/en-us/windows-server/security/windows-authentication/credentials-processes-in-windows-authentication

7. Microsoft. *about_Error_Handling*. Microsoft Learn.
   https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_error_handling

8. Microsoft. *Additional mitigations for Credential Guard*. Microsoft Learn.
   https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/additional-mitigations

9. Red Canary. *Atomic Red Team*. GitHub.
   https://github.com/redcanaryco/atomic-red-team

10. Red Canary. *Invoke-AtomicRedTeam*. GitHub.
    https://github.com/redcanaryco/invoke-atomicredteam

---

## Appendix A — Original Experimental Output

The following is the original console output supplied for analysis:

```text
PS C:\WINDOWS\system32> Invoke-AtomicTest T1003
PathToAtomicsFolder = C:\AtomicRedTeam\atomics

Executing test: T1003-1 Gsecdump
'C:\AtomicRedTeam\atomics\..\ExternalPayloads\gsecdump.exe' is not recognized as an internal or external command,
operable program or batch file.
Exit code: 1
Done executing test: T1003-1 Gsecdump

Executing test: T1003-2 Credential Dumping with NPPSpy
[!] Please, logout and log back in. Cleartext password for this account is going to be located in C:\NPPSpy.txt

Copy-Item : Cannot find path 'C:\AtomicRedTeam\ExternalPayloads\NPPSPY.dll' because it does not exist.
At line:1 char:4
+ & {Copy-Item "C:\AtomicRedTeam\atomics\..\ExternalPayloads\NPPSPY.dll ...
+    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\AtomicRedTea...oads\NPPSPY.dll:String) [Copy-Item], ItemNotFoundExce
    ption
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.CopyItemCommand

Exit code: 0
Done executing test: T1003-2 Credential Dumping with NPPSpy

Executing test: T1003-3 Dump svchost.exe to gather RDP credentials
Exit code: 0
Done executing test: T1003-3 Dump svchost.exe to gather RDP credentials

Executing test: T1003-4 Retrieve Microsoft IIS Service Account Credentials Using AppCmd (using list)
C:\Windows\System32\inetsrv\appcmd.exe : The term 'C:\Windows\System32\inetsrv\appcmd.exe' is not recognized as the
name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was
included, verify that the path is correct and try again.

C:\Windows\System32\inetsrv\appcmd.exe : The term 'C:\Windows\System32\inetsrv\appcmd.exe' is not recognized...
C:\Windows\System32\inetsrv\appcmd.exe : The term 'C:\Windows\System32\inetsrv\appcmd.exe' is not recognized...

Exit code: 0
Done executing test: T1003-4 Retrieve Microsoft IIS Service Account Credentials Using AppCmd (using list)

Executing test: T1003-5 Retrieve Microsoft IIS Service Account Credentials Using AppCmd (using config)
C:\Windows\System32\inetsrv\appcmd.exe : The term 'C:\Windows\System32\inetsrv\appcmd.exe' is not recognized as the
name of a cmdlet, function, script file, or operable program.

Exit code: 0
Done executing test: T1003-5 Retrieve Microsoft IIS Service Account Credentials Using AppCmd (using config)

Executing test: T1003-6 Dump Credential Manager using keymgr.dll and rundll32.exe
Exit code: 0
Done executing test: T1003-6 Dump Credential Manager using keymgr.dll and rundll32.exe

Executing test: T1003-7 Send NTLM Hash with RPC Test Connection
Exit code: 0
Done executing test: T1003-7 Send NTLM Hash with RPC Test Connection

PS C:\WINDOWS\system32>
```

**Final assessment:** The evidence supports a conclusion of **partial/incomplete T1003 test execution**, not successful credential dumping across the seven tests.
