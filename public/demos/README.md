# Project replicas

Static, interactive replicas of my projects' real interfaces, shown in the
"My Projects" folder on the portfolio's XP desktop (src/os/windows/BrowserWindow.jsx,
list in `projectReplicas` in src/data/content.js). Every replica uses sample
data only and never talks to a real system.

| Folder | Source of the UI | How the data is faked |
| --- | --- | --- |
| voltlab | Live VoltLAB dashboard HTML (home lab, port 5000) | `demo-data.js` answers its `/api/*` calls; internal IP replaced |
| privaroute | PrivaRoute driver screen (`jlr-driver-ui/server/static`) | `demo-data.js` scripts the `/api/v2/*` requests; start location moved to the University of Windsor; YouTube, microphone and the engineer view are off |
| argus | Rebuilt from the Argus terminal UI screenshot (it has no web UI) | Scripted answers; restart/stop/run show the real approval gate and change nothing |
| agentic-soc | Pages rendered by the real `agentic-soc/v2/soc_web.py` from four sample tickets (documentation-range IPs and ASNs) | `demo.js` answers the `/respond` button POST |

To re-render agentic-soc after soc_web.py changes: run its Flask app's test
client against sample tickets in a scratch folder, rewrite `/brief/<id>` links
to `brief-<id>.html` and `/briefs` to `index.html`, and inject `demo.js`.
