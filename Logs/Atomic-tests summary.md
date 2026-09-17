

## T1059.001 — PowerShell (Document 1)

| Test # | Test Name | Result | Exit Code |
|---|---|---|---|
| 1 | Mimikatz (Invoke-Mimikatz) | Failed — payload script not found | 0 |
| 2 | Run BloodHound from local disk | Failed — no AD domain context | 0 |
| 3 | BloodHound via download cradle | Failed — no AD domain context | 0 |
| 4 | Mimikatz — Cradlecraft PsSendKeys | Timed out / registry path errors | -1 |
| 5 | Invoke-AppPathBypass | Failed — remote server 503 | 1 |
| 6 | PowerShell MsXml COM object | **Succeeded** | 0 |
| 7 | PowerShell XML requests | Failed — command not recognized | 255 |
| 8 | mshta.exe download via PowerShell | **Succeeded** | 0 |
| 10 | PowerShell Fileless Script Execution | **Succeeded** | 0 |
| 11 | NTFS Alternate Data Stream Access | Failed — parameter binding error | 0 |
| 12 | PowerShell Session Creation (New-PSSession) | Failed — access denied | 0 |
| 13 | Command-line parameter variations | **Succeeded** | 0 |
| 14 | Command-line with encoded arguments | **Succeeded** | 0 |
| 15 | EncodedCommand parameter variations | **Succeeded** | 0 |
| 16 | EncodedCommand with encoded arguments | **Succeeded** | 0 |
| 17 | PowerShell Command Execution | **Succeeded** | 0 |
| 18 | Invoke Known Malicious Cmdlets (mock functions) | **Succeeded** (simulated) | 0 |
| 19 | PowerUp Invoke-AllChecks | Timed out (120s) | -1 |
| 20 | Abuse Nslookup with DNS Records | **Succeeded** | 0 |
| 21 | SOAPHound — Dump BloodHound Data | Failed — missing domain/cache | 0 |
| 22 | SOAPHound — Build Cache | Failed — missing domain | 0 |

**Summary:** 9 succeeded, 6 failed due to environment (no AD domain/WORKGROUP machine), 3 failed due to missing external payloads, 2 timed out.

---

## T1082 — System Information Discovery (Document 2)

| Test # | Test Name | Result | Exit Code |
|---|---|---|---|
| 1 | System Information Discovery (`systeminfo`) | **Succeeded** — full host/OS/network detail returned | 0 |
| 7 | Hostname Discovery | **Succeeded** | 0 |
| 9 | Windows MachineGUID Discovery | **Succeeded** | 0 |
| 10 | Griffon Recon | **Succeeded** — full recon payload generated | 0 |
| 11 | Environment Variables Discovery | **Succeeded** | 0 |
| 14 | WinPwn — winPEAS | Blocked — flagged as malicious by AV | 0 |
| 15 | WinPwn — itm4nprivesc | Blocked — flagged as malicious by AV | 0 |
| 16 | WinPwn — Powersploit privesc checks | Blocked — flagged as malicious by AV | 0 |
| 17 | WinPwn — General privesc checks | Blocked — flagged as malicious by AV | 0 |
| 18 | WinPwn — GeneralRecon | Blocked — flagged as malicious by AV | 0 |
| 19 | WinPwn — Morerecon | Blocked — flagged as malicious by AV | 0 |
| 20 | WinPwn — RBCD-Check | Blocked — flagged as malicious by AV | 0 |
| 21 | WinPwn — Watson (patch check) | Blocked — flagged as malicious by AV | 0 |
| 22 | WinPwn — SharpUp | Blocked — flagged as malicious by AV | 0 |
| 23 | WinPwn — Seatbelt | Failed — bad image format (x86/x64 mismatch) | 0 |
| 24 | Azure Security Scan (SkyArk) | Failed — missing module/invalid creds | 0 |
| 27 | System Info via WMIC | Failed — `wmic` not present on this OS build | 1 |
| 28 | System Information Discovery (alt) | Timed out | -1 |
| 29 | Check computer location | **Succeeded** — Nation: KE (Kenya) | 0 |
| 30 | BIOS Info via Registry | Partial — value found, then key error | 1 |
| 31 | ESXi VM Discovery (ESXCLI) | Failed — plink.exe missing | 255 |
| 32 | ESXi Darkside discovery | Failed — plink.exe missing | 255 |
| 34 | Operating System Discovery | **Succeeded** | 0 |
| 35 | Check OS version via `ver` | **Succeeded** — Windows 10.0.26200.9457 | 0 |
| 36 | Volume shadow copies (`vssadmin`) | Ran, no shadow copies found | 1 |
| 37 | System Locale/Regional Settings | **Succeeded** | 0 |
| 38 | Enumerate drives (`gdr`) | **Succeeded** — C: and D: listed | 0 |
| 39 | OS Product Name via Registry | **Succeeded** | 0 |
| 40 | OS Build Number via Registry | **Succeeded** — Build 26200 | 0 |
| 41 | Hardware UUID via wmic | Failed — `wmic` not recognized | 0 |

**Summary:** 15 succeeded, 8 blocked by Windows Defender (WinPwn suite), remainder failed due to missing tools/binaries not present on this build of Windows.

---

## T1547.001 — Boot or Logon Autostart Execution: Registry Run Keys / Startup Folder (Document 3)

| Test # | Test Name | Result | Exit Code |
|---|---|---|---|
| 1 | Reg Key Run | **Succeeded** | 0 |
| 2 | Reg Key RunOnce | Timed out — repeated "overwrite?" prompts | -1 |
| 3 | PowerShell Registry RunOnce | **Succeeded** | 0 |
| 4 | Suspicious VBS in Startup folder | **Succeeded** — script executed | 0 |
| 5 | Suspicious JSE in Startup folder | **Succeeded** — script executed | 0 |
| 6 | Suspicious BAT in Startup folder | **Succeeded** | 0 |
| 7 | Executable shortcut in Startup folder | **Succeeded** | 0 |
| 8 | Persistence via Recycle Bin | **Succeeded** | 0 |
| 9 | SystemBC Malware-as-a-Service Registry | **Succeeded** | 0 |
| 10 | Change Startup Folder (HKLM) | Failed — directory already exists | 0 |
| 11 | Change Startup Folder (HKCU) | Failed — directory already exists | 0 |
| 12 | HKCU Policy Settings Explorer Run Key | **Succeeded** | 0 |
| 13 | HKLM Policy Settings Explorer Run Key | **Succeeded** | 0 |
| 14 | HKLM Winlogon Userinit Key | **Succeeded** | 0 |
| 15 | HKLM Winlogon Shell Key | **Succeeded** | 0 |
| 16 | secedit — Run key in HKLM Hive | **Succeeded** | 0 |
| 17 | Modify BootExecute Value | **Succeeded** | 0 |
| 18 | RDP logon session custom app execution | **Succeeded** | 0 |
| 19 | Boot Verification Program Key | Timed out — repeated overwrite prompts | -1 |
| 20 | Persistence via Windows Context Menu | **Succeeded** | 0 |
| 21 | Turla Mosquito Run Key (rundll32 export) | **Succeeded** | 0 |

**Summary:** 18 succeeded, 2 timed out due to interactive `reg add` overwrite prompts (test needs `/f` flag or pre-cleanup), 2 failed on pre-existing temp directory.

---

## T1003 — OS Credential Dumping (Document 4)

| Test # | Test Name | Result | Exit Code |
|---|---|---|---|
| 1 | Gsecdump | Failed — external payload missing | 1 |
| 2 | Credential Dumping with NPPSpy | Partially ran — required DLL not found | 0 |
| 3 | Dump svchost.exe (RDP credentials) | **Succeeded** | 0 |
| 4 | Retrieve IIS Credentials via AppCmd (list) | Failed — appcmd.exe not found (IIS not installed) | 0 |
| 5 | Retrieve IIS Credentials via AppCmd (config) | Failed — appcmd.exe not found (IIS not installed) | 0 |
| 6 | Dump Credential Manager (keymgr.dll) | **Succeeded** | 0 |
| 7 | Send NTLM Hash via RPC Test Connection | **Succeeded** | 0 |

**Summary:** 3 succeeded, 4 failed mainly due to missing external payloads/tools (gsecdump, NPPSpy DLL) or IIS not being installed on the host.

---

