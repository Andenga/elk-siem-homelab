# Troubleshooting Log

Real problems hit while building this lab, and how each was actually
resolved — not a generic checklist. Organized in the order they tend to
come up as you work through the phases in `BUILD-LOG.md`.

---

## 1. Copy/pasting long commands into the Ubuntu VM is painful

**Symptom:** typing long `docker compose` / `curl` / config commands
directly into the VMware console window is slow and error-prone — one typo
in a 200-character command means starting over.

**Fix:** don't type into the VM console at all. SSH into the Ubuntu VM from
your host machine's own terminal instead, and copy/paste normally from
there.

1. From inside the VM console (just this once), get its IP while it has
   internet access via NAT:
   ```bash
   ip a
   ```
2. From your **host machine's** terminal:
   ```bash
   ssh <user>@<vm-ip>
   ```
   Accept the host key prompt on first connect.
3. From here on, paste commands into your host terminal as normal — they
   run on the VM over the SSH session.

This applies to any Ubuntu-based VM in the lab (ELK-Server, Victim-Linux),
not just one of them.

---

## 2. Kibana shows no logs from Winlogbeat/Filebeat

Work through these in order — each rules out one layer before moving to the
next.

**a. Confirm every VM is actually on the same network.**
All VMs must sit on the *same* custom host-only network (e.g. the same
VMnet), not a mix of host-only and NAT, and not two different host-only
networks. If you added a second network adapter to any VM (for internet
access during setup), double check its *other* adapter is still pointed at
the correct lab VMnet — it's easy to leave a VM effectively split across two
networks without noticing.

**b. Confirm credentials match across every component.**
The Elastic password used in `.env`, the one Winlogbeat/Filebeat
authenticate with, and the one you log into Kibana with all have to be the
same value. A mismatch here fails silently in some places and loudly in
others — check all of them, not just one.

**c. Test the beat's connection directly, independent of Kibana.**
On the Windows victim:
```powershell
.\winlogbeat.exe test output
```
A healthy result looks like:
```
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
The `TLS... WARN secure connection disabled` line is expected and fine in
this lab (`xpack.security.http.ssl.enabled=false` in the Docker Compose
config) — it is not the problem. If any line above that fails (DNS lookup,
dial up, talk to server), the issue is network/reachability, not Kibana.

---

## 3. No "Rules" option visible in Kibana Security

Seen in early setup before the Security app is fully initialized, or when
the logged-in user doesn't have sufficient privileges. Things to check:
- Confirm you're logged in as the `elastic` superuser (or a role with
  detection-engine privileges), not a lower-privileged account.
- Give Kibana a few minutes after first startup — the Security/Detections
  app needs its own indices initialized before "Rules" fully appears.
- If it's still missing after that, navigate directly to
  **Security → Alerts** once first (this can trigger the Detections app to
  finish initializing) and then check **Manage rules** again.

(See also item 8 below — a related but distinct symptom where "Manage
rules" exists but misbehaves.)

---

## 4. Windows Defender / AMSI blocks Atomic Red Team tests

**Symptom:** several `T1059.001` sub-tests fail immediately with
`Exception calling "Start" with "0" argument(s): "Access is denied"`.

**Root cause — this is not one problem, it's two different ones wearing the
same error message:**

- **Tests 1, 3, 4, 5 (Mimikatz and Mimikatz-adjacent tests):** actively
  blocked by Windows Defender / AMSI (Antimalware Scan Interface). AMSI
  scans in-memory strings and has a hardcoded, effectively un-bypassable
  signature for anything containing `Mimikatz` — this is intentional and
  extremely hard to defeat, by design. Turning off Defender's Real-Time
  Protection **is not enough**; AMSI and Tamper Protection operate somewhat
  independently.
- **Test 2 (BloodHound/SharpHound):** fails for an unrelated reason — the
  tool isn't downloaded/installed on the system yet. This is a missing
  dependency, not a block.
- **Test 12 (PowerShell Session Creation / PSRemoting):** fails with a
  clear, different error (`Access is denied` when trying `New-PSSession`)
  because **PowerShell Remoting isn't enabled locally**. This is a
  Windows configuration prerequisite, not Defender.

**What actually helped:** turning off **Tamper Protection**
(Windows Security → Virus & threat protection → Manage settings → Tamper
Protection → Off) unblocked some of these. Note this is a deliberate
weakening of the endpoint for lab purposes — appropriate here because this
is an isolated, disposable VM with no real data, but not something to do on
a production machine.

**Bigger picture takeaway (see also `BUILD-LOG.md` Phase 4/5):** rather than
fighting AMSI/Defender indefinitely to force through heavily-signatured
tools like Mimikatz, it's often more productive to pick a different, less
heavily-blocked atomic test that still maps to a valid technique — this is
what eventually led to switching the third detection to T1082 (System
Information Discovery) instead of continuing to fight T1059.001's
COM-object test.

---

## 5. Hydra locks itself out of Windows RDP

**Symptom:** `hydra ... rdp://<target>` works for a few attempts, then
fails permanently with:
```
[ERROR] all children were disabled due too many connection errors
```
and the target stops responding to port 3389 entirely — including
legitimate `freerdp` connections.

**Root cause:** Windows' built-in Account Lockout Policy and RDP-specific
network throttling kick in almost immediately against a fast brute-force
attempt. Once triggered, the RDP service refuses *all* new connections,
not just further Hydra attempts, until the lockout state clears.

**Fix — this is a Hydra-speed problem, not a Hydra-syntax problem:**
```bash
hydra -l administrator -P /usr/share/wordlists/rockyou.txt -t 1 -W 10 rdp://192.168.218.135
```
`-t 1` limits Hydra to a single connection thread; `-W 10` adds a wait
between attempts (~1 attempt per 10 seconds). This keeps the attempt rate
under whatever threshold triggers Windows' lockout/throttling, so the
service stays responsive for the duration of the test.

If you've already triggered the lockout before slowing down, slowing Hydra
down alone won't immediately fix it — the existing locked/corrupted session
state on the Windows side needs to clear (or be reset) before new
connection attempts, from Hydra or anything else, will succeed again.

---

## 6. Nmap shows filtered/no results against the victims

**Symptom:** `nmap -sV <target>` against the Windows or Linux victim
returns little or nothing useful — ports appear filtered.

**Fix:** Windows Defender Firewall and/or the Linux host firewall block
ICMP and many scan probes by default. Force a specific-port scan without
relying on host discovery:
```bash
sudo nmap -Pn -p 3389 192.168.218.135 192.168.218.136
```
`-Pn` skips the host-discovery ping (which is often what's actually being
blocked) and scans the specified port(s) directly.

---

## 7. Suricata build shows `PF_RING support: no`

**Symptom:** `suricata --build-info | head -20` shows most features enabled
(`AF_PACKET`, `AF_XDP`, `DPDK`, `eBPF`, `XDP`, `NFQueue`, `NFLOG`) but
`PF_RING support: no`.

**This is not a problem.** PF_RING is one specific high-performance packet
capture method among several, and it requires a separately-installed
kernel module that most Suricata builds don't ship with by default. Since
the build already shows `AF_PACKET support: yes` (the modern standard for
high-performance Linux packet capture) along with `eBPF` and `XDP` support,
the system is fully capable of handling this lab's traffic without PF_RING.
No action needed — move on to config validation and starting the service.

---

## 8. "Manage rules" redirects to the Alerts page instead of showing rule management

**Symptom:** clicking **Manage rules** in Kibana Security doesn't open the
rule list/creation UI — it redirects to **Alerts** instead.

This is a related-but-distinct symptom from item 3 (no Rules option at
all) — here the navigation exists but resolves to the wrong place. Likely
causes to check, in order:
- The Detections engine hasn't been "turned on" yet for this space — some
  Kibana versions require visiting **Security → Alerts** at least once, or
  explicitly enabling detection rules from a first-run prompt, before
  **Manage rules** resolves correctly.
- Insufficient privileges on the logged-in user/role for rule management
  specifically (distinct from general Kibana access) — confirm you're using
  the `elastic` superuser while diagnosing, then narrow down role
  permissions afterward if needed.
- A stale browser session/cache after a Kibana restart — log out, close the
  tab, and log back in fresh before assuming this is a deeper bug.

---

*Cross-reference: the step-by-step context each of these problems came up
in — including which phase, which VM, and what got tried immediately
before/after — is in [`BUILD-LOG.md`](./BUILD-LOG.md).*