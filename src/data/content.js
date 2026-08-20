// -----------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for all visible copy.
// Both the Win98 OS (desktop) and the mobile scroll page read from here.
// House style: NO em dashes anywhere. Use commas, periods, or ( ).
// Content is vetted. Edit here and it updates everywhere.
// -----------------------------------------------------------------------------

export const profile = {
  name: 'Ronit Lad',
  tagline: 'Building and defending systems. Seeking a paid co-op in Canada.',
  role: 'Cybersecurity Master’s student, University of Windsor',
  email: 'ronitlad.ca@gmail.com',
  github: 'https://github.com/ronitlxd',
  githubHandle: 'github.com/ronitlxd',
  linkedin: 'https://linkedin.com/in/ronit-lad',
  linkedinHandle: 'linkedin.com/in/ronit-lad',
  location: 'Brampton, ON (Greater Toronto Area)',
  locationShort: 'Brampton, ON · GTA',
  openTo: 'Open to work anywhere in Canada.',
}

// Full About page copy, supplied directly by Ronit (about.txt upload) -
// structured as heading + intro + two labeled subsections + a closing
// paragraph, rendered by ShowcaseWindow.jsx's AboutPage. Keeping the
// original short `about` array below too (still used nowhere else right
// now, but cheap to keep as a fallback/short-form version rather than
// deleting it outright).
export const aboutPage = {
  heading: 'Welcome',
  intro:
    "I'm a cybersecurity enthusiast pursuing my Master of Applied Computing at the University of Windsor. I build and break things to learn how to defend them, mostly around SOC operations, detection, and log analysis. Now I'm looking to do it for real, in a live IT security environment.",
  // Henry-style inline photo: a real (if very old) photo dropped into the
  // text with a bold "Figure N:" caption underneath, plain rectangle, no
  // border/shadow/rotation. Placed right after the intro, before the "About"
  // section, same spot Henry drops his first figure.
  figures: [
    { src: `${import.meta.env.BASE_URL}media/fig1.jpeg`, caption: 'Figure 1: taking my first incident report call' },
  ],
  sections: [
    {
      heading: 'About',
      // Rewritten (Ronit's request): the original version read too
      // "speechy" - narrative-arc phrasing ("that curiosity pushed me...",
      // "made security personal") rather than plainspoken. This version
      // keeps the same facts, shorter sentences, less reflective-essay
      // cadence. The Jarvis/AI-assistant motivation line was cut entirely
      // per a later follow-up request.
      paragraphs: [
        "I started messing with computers because I wanted to know how a bunch of 1s and 0s turns into an actual game. I built calculators, small games, websites, whatever got me closer to understanding it. That's what got me into computer engineering, where I picked up Python, JavaScript, HTML, and CSS.",
        "Then AI showed up and changed the math. Anyone can build a website in an afternoon now, and break one just as fast. That's the part I got interested in: if building and breaking are both easy, defending is the harder, more useful skill.",
        "Instead of trusting random cloud tools with my data, I built a Linux home lab: my own private cloud, my own VPN, a Tor proxy. Once I had a real server to protect, I went further and built a multi-agent SOC on top of it, Splunk pulling logs, an ML layer flagging anomalies, agents doing detection and triage. Basically I taught myself the job before anyone gave it to me.",
      ],
      // Figure 2 lives here (not the closing paragraph anymore) - floated
      // right at half the section's width, dropped in right before
      // paragraph index 1 ("Then AI changed everything...") so that
      // paragraph and the one after it wrap around it on the left, matching
      // the screenshot Ronit sent of exactly those two paragraphs.
      figure: {
        src: `${import.meta.env.BASE_URL}media/fig2.jpeg`,
        caption: 'Figure 2: Me, 2026.',
        beforeParagraph: 1,
      },
    },
    {
      heading: 'Side quests',
      // Rewritten alongside the About section above, same reasoning.
      paragraphs: [
        'Outside of security, I trade stocks and crypto. A friend got me into it during my internship and I started paper trading to learn the basics. Turns out it rewards the same things security does: patience, research, telling signal from noise.',
        "Off the terminal, I'm usually gaming, at the gym, or cooking. Gaming's what got me into computers in the first place, the gym's where I reset, and cooking's the one hobby where I build something and get to enjoy it same day.",
      ],
    },
  ],
  closing:
    'Thanks for checking out my portfolio. I had fun building this, hope you have fun breaking into it. Questions or comments, hit the contact page or email me at ronitlad.ca@gmail.com.',
}

export const about = [
  "I'm a first-year Master of Applied Computing student at the University of Windsor, specializing in cybersecurity, with a background in Computer Science and Engineering.",
  "Most of what I know I picked up hands-on: a home SOC lab with live detection rules, a packet sniffer written from raw sockets, and an ML layer on top of Splunk to flag anomalies. I care about the practical side of security, seeing the traffic, writing the rule, understanding the alert.",
  "I'm looking for a paid co-op role in Canada where I can do real security work and keep learning fast. Open to Toronto, Ottawa, and Waterloo.",
]

export const skills = [
  {
    group: 'Security',
    items: [
      'Splunk SIEM',
      'Splunk SOAR',
      'Suricata IDS',
      'Nmap',
      'Wireshark',
      'Log Analysis',
      'Access Control',
      'NIST CSF',
      'VPN Config',
      'TryHackMe SOC L1',
    ],
  },
  {
    group: 'Cloud & Infrastructure',
    items: ['AWS', 'Azure', 'Docker', 'Linux', 'VirtualBox'],
  },
  {
    group: 'Languages',
    items: ['Python', 'C', 'SQL', 'SPL', 'Bash / Shell'],
  },
  {
    group: 'Data & Tools',
    items: ['MSSQL', 'MongoDB', 'PostgreSQL', 'Git / GitHub', 'Jira', 'Jupyter'],
  },
]

// Old flat list - superseded by the Henry-style split below (Security Ops /
// Dev Projects, picked from a two-category landing page instead of one
// scrolling list). Left here unused rather than deleted, same convention as
// the rest of this project.
export const projects = [
  {
    title: 'Home SOC Lab',
    description:
      'A Linux security lab run on a laptop. Splunk SIEM ingests logs from every device with real-time detection rules, extended by a custom ML layer (Logistic Regression / SVM) to classify anomalies. Adds Suricata IDS and a Flask dashboard aggregating Suricata, auth, and Tor logs with live service controls. Network assessments via Nmap and Wireshark.',
    tech: ['Splunk', 'Suricata', 'Python', 'Flask', 'Nmap', 'ML', 'Linux'],
    code: 'https://github.com/ronitlxd',
  },
  {
    title: 'Network Packet Sniffer',
    description:
      'Python sniffer built on raw sockets to capture and analyze live traffic across Ethernet, IPv4, TCP, UDP, and ICMP. Parses headers to pull IPs, ports, and TCP flags for real-time monitoring and forensics practice.',
    tech: ['Python', 'Raw Sockets', 'TCP/IP'],
    code: 'https://github.com/ronitlxd',
  },
  {
    title: 'Adaptive RAG Pipeline',
    description:
      'Next.js / TypeScript frontend for a RAG system applying five vector-pruning strategies (cosine, k-means, MMR) to shrink index size while preserving answer quality. FastAPI backend with sentence-transformers and pgvector.',
    tech: ['Next.js', 'TypeScript', 'FastAPI', 'pgvector'],
    code: 'https://github.com/ronitlxd',
  },
  {
    title: 'Educompare',
    description:
      'Automated course comparison across Coursera, Udemy, and edX using Selenium and Jsoup. Spring Boot backend, React frontend, deployed with Docker and a GitHub Actions CI/CD pipeline.',
    tech: ['Java', 'Selenium', 'React', 'Docker', 'CI/CD'],
    code: 'https://github.com/ronitlxd',
  },
]

// Projects page intro copy, same voice/format as Henry's "Click on one of
// the areas below..." line under his Projects heading.
export const projectsIntro =
  "Click on one of the two areas below to see what I've built there. I split it the same way I think about my own work: things I built to defend systems, and things I built to ship products."

export const projectCategories = [
  { id: 'security', label: 'Security Ops', sub: 'PROJECTS', icon: `${import.meta.env.BASE_URL}media/play_13862274.png` },
  { id: 'dev', label: 'Dev Projects', sub: 'PROJECTS', icon: `${import.meta.env.BASE_URL}media/web.png` },
]

// `detail` bullets below are pulled from each project's actual GitHub
// README (fetched directly), condensed into points for the "More" detail
// page (ProjectDetailPage in ShowcaseWindow.jsx) - `description` stays the
// short list-view blurb, `detail` is the expanded read. Projects without a
// real repo yet (Attacks, Food Redistribution, Educompare - "leave that for
// now" per Ronit) keep the generic profile link and no `detail` array, so
// their detail page just falls back to `description`.
export const securityProjects = [
  {
    title: 'Home Lab',
    description:
      "Started as a personal need, not a school assignment. I wanted a private alternative to cloud drives I couldn't see inside of, my own VPN instead of trusting a third party, and a Tor proxy because I was curious how the dark web actually worked. An old laptop turned into a full Linux home lab, and it's the base every other security project here runs on top of.",
    tech: ['Linux', 'VPN', 'Tor', 'Self-hosted'],
    code: 'https://github.com/ronitlxd/Home_SOC_Lab',
    // Detail page (More button) renders this project differently from the
    // rest, per Ronit's request: flowing paragraphs instead of bullets, plus
    // real screenshots. `detail` (the bullet list) is intentionally removed
    // here - ProjectDetailPage checks for `detailParagraphs` first and only
    // falls back to bullets when that's absent, so every other project keeps
    // its existing bullet-point "More" page untouched.
    // Condensed to short, punchy paragraphs (Ronit's request) - same facts
    // as before, no filler.
    detailParagraphs: [
      "A personal need, not a school assignment: a private alternative to cloud tools I couldn't see inside of. Runs 24/7 on a spare laptop (Ubuntu Server 24.04, 16GB RAM), not a cloud VM, because understanding a SOC meant actually living inside one.",
      "Splunk Free and Suricata IDS (65,000+ Emerging Threats rules) watch real traffic, including live Tor evasion routed through Proxychains, not staged data.",
      "The centerpiece: a dashboard built from scratch with Flask, psutil, and Chart.js, one real-time view of service health, system resources, and live Suricata/Splunk activity.",
      "Around that core: self-hosted Nextcloud, a WireGuard VPN, and Tailscale for zero-trust access. Every layer configured by hand.",
    ],
    detailImages: [
      { src: `${import.meta.env.BASE_URL}media/homelab1.png`, caption: "The dashboard's live view of service health and system resources." },
      { src: `${import.meta.env.BASE_URL}media/homelab3.png`, caption: 'The lab itself, a single laptop running everything 24/7.' },
    ],
  },
  {
    title: 'Agentic SOC',
    description:
      'Built specifically to defend the home lab above. Splunk SIEM pulls logs from every device, a custom ML layer (Logistic Regression / SVM) flags anomalies, and Suricata IDS plus a Flask dashboard tie it together with live service controls. The goal was replacing manual log-watching with agents that handle detection and triage the way a real SOC team would.',
    tech: ['Splunk', 'Suricata', 'Python', 'Flask', 'ML', 'Linux'],
    code: 'https://github.com/ronitlxd/agentic-soc',
    // Detail page ("More") is entirely agent-focused, per Ronit's request:
    // the full architecture diagram, then each of the six agents in 1-2
    // lines. `detail` (the old bullet list) is dropped - `detailImages`
    // reuses the same full-width figure treatment as Home Lab's screenshots,
    // and `detailAgents` is a new agent-name + short-description list
    // (see ProjectDetailPage in ShowcaseWindow.jsx).
    detailImages: [
      { src: `${import.meta.env.BASE_URL}media/agenticsoc1.png`, caption: 'The six-agent pipeline, watcher through shift lead.' },
    ],
    detailAgents: [
      {
        name: 'Watcher',
        description: 'Continuously ingests incoming Splunk and Suricata events, the first agent to see raw activity and flag anything worth escalating.',
      },
      {
        name: 'Analyst',
        description: 'Runs the two-stage detection logic, 21 deterministic correlation rules first, then an optional local LLM only on what the rules missed, to triage and score each alert.',
      },
      {
        name: 'Researcher',
        description: 'Enriches flagged events with context and maps them against MITRE ATT&CK, so every alert arrives with a chain, not just a raw log line.',
      },
      {
        name: 'Operator',
        description: 'Handles containment. Defaults to dry-run, refuses to touch protected ranges or users, and only acts after explicit human approval from the web console.',
      },
      {
        name: 'Scribe',
        description: 'Documents everything as it happens, building the timeline and evidence trail that becomes the final incident report.',
      },
      {
        name: 'Shift Lead',
        description: 'Oversees the other five agents end to end, coordinating handoffs across all seven pipeline stages and making the final call on escalation.',
      },
    ],
  },
  {
    title: 'Argus - Server Ops Agent',
    description:
      "A local AI agent that runs on my home server and lets me manage it in plain English, ask it about failed logins or tell it to restart a service, and it actually goes and checks. It never changes anything without asking me first, since letting a language model run raw shell commands is exactly how you wreck a server or hand an attacker a way in.",
    tech: ['Python', 'Ollama', 'Local LLM', 'Textual', 'systemd'],
    code: 'https://github.com/ronitlxd',
    // Same convention as Home Lab/Packet Sniffer above: short paragraphs
    // instead of bullets.
    detailParagraphs: [
      "I wanted an AI that could actually operate my server, not just tell me how to. The obvious way to build that is to let the model spit out shell commands and run them, that's also how you wreck a server or hand an attacker a way in, so the whole project became an exercise in giving an AI real power without letting it hold the keys.",
      "A local language model, running entirely on my own hardware through Ollama, reads what I type and picks from a fixed menu of tools instead of running raw shell. Read-only tools, checking service status, tailing logs, counting failed logins, run automatically since they can't break anything. Anything that changes the system stops, shows me exactly what it wants to do, and waits for my approval. Every action, approved or not, lands in an append-only audit log.",
      "The part I think is actually interesting is that I stopped trusting the model to read. Small models running on modest hardware confabulate, mine looked at three real failed logins in the data and confidently told me there were none, another time it invented a whole table of fake stats for tools it never even ran. The fix was to stop asking the model to parse or count anything. If a fact can be computed in code, it gets computed in Python, and the model only gets handed the finished number to phrase into a sentence.",
      "The model turned out to be the weak link, not the architecture. No amount of prompt tweaking made it reliably pick the right tool, so the fragile questions get routed in code before the model even sees them, and it runs no matter what the model would have picked on its own. Correctness lives in the code, not the model, which means I can swap in a bigger model later and it gets nicer to talk to, but it doesn't get safer, because the safety was never the model's job.",
      "It runs as a terminal dashboard, live server vitals down one side, a plain English prompt at the bottom, and an approval popup any time it wants to touch the system. Fifteen tools total, thirteen read-only and two that require my sign-off, running entirely on 4GB of VRAM with nothing leaving the machine.",
    ],
    detailImages: [
      { src: `${import.meta.env.BASE_URL}media/argus.png`, caption: 'Live vitals on the left, a plain English question and answer on the right.' },
    ],
  },
  {
    title: 'Packet Sniffer',
    description:
      "My own Wireshark, built from raw sockets in Python to capture and analyze live traffic across Ethernet, IPv4, TCP, UDP, and ICMP. Parses headers to pull IPs, ports, and TCP flags for real-time monitoring, mostly so I'd actually understand what a packet capture tool is doing instead of just clicking around one.",
    tech: ['Python', 'Raw Sockets', 'TCP/IP'],
    code: 'https://github.com/ronitlxd/Packet_sniffer',
    // Bullets replaced with short paragraphs (Ronit's request), same
    // convention as Home Lab/Athlete Injury Dashboard above.
    detailParagraphs: [
      "Most people who want to see packet-level traffic just open Wireshark. I built my own instead, from raw sockets in Python with zero third-party dependencies, just the standard library, because I wanted to actually understand what a packet capture tool does under the hood, not just click around one someone else wrote.",
      "It parses Ethernet frames, IPv4 headers, and TCP/UDP/ICMP payloads in real time, pulling IPs, ports, and TCP flags straight off the wire. No framework is doing the heavy lifting here, every layer of the stack gets decoded by hand, which is exactly the kind of low-level understanding that separates using a security tool from actually being able to build one.",
    ],
  },
  {
    title: 'AWS Security Scanner',
    description:
      'Checks an AWS account against common misconfiguration patterns, open S3 buckets, overly permissive IAM policies, security groups left wide open, the kind of small mistakes behind most real cloud breaches. Built to catch what a manual checklist would catch, automatically.',
    tech: ['AWS', 'Python', 'IAM', 'Cloud Security'],
    code: 'https://github.com/ronitlxd/aws-security-scanner',
    // Bullets replaced with short paragraphs (Ronit's request), same
    // convention as Home Lab/Athlete Injury Dashboard above.
    detailParagraphs: [
      "Most cloud security tools tell you what's wrong after someone else already found it. I built mine backwards: I deliberately misconfigured a real AWS account first, public S3 buckets, open security groups, unrotated keys, then wrote a scanner from scratch to catch every mistake I'd made.",
      "It runs 15 checks across S3, IAM, EC2 security groups, and EBS, and every finding maps to a specific CIS AWS Foundations Benchmark v1.5 control, so the output never just says something is wrong, it says exactly which standard it violates and why. It's entirely read-only, runs against a locked-down IAM policy, and outputs a CI-friendly exit code plus JSON and Markdown reports, built to slot directly into a real pipeline, not just sit as a personal script.",
    ],
  },
  {
    title: 'Attacks',
    description:
      "A collection of classic attacks I performed myself specifically to learn how they work: buffer overflow exploitation, TLS interception, man-in-the-middle attacks, ARP poisoning, and social-engineering techniques in the style of Kevin Mitnick. Breaking things on purpose, in a lab I control, is how I actually understand what I'm defending against.",
    tech: ['Buffer Overflow', 'TLS', 'MITM', 'ARP Poisoning', 'Social Engineering'],
    code: 'https://github.com/ronitlxd',
  },
]

export const devProjects = [
  {
    title: 'Athlete Injury Dashboard',
    description:
      "Built for a real client, University of Windsor Human Kinetics, as part of my Master's program. A dashboard that tracks athlete injury data so coaches and staff can actually see patterns instead of digging through spreadsheets. First project where I had to answer to someone outside a classroom for what I shipped.",
    tech: ['Django', 'Bootstrap', 'Chart.js', 'PostgreSQL'],
    code: 'https://github.com/Uwindsor-Human-Kinetics/HK-S26-COMP8967-Team12',
    // Detail page ("More"), same treatment as Home Lab: short paragraphs
    // instead of bullets, dashboard highlighted, real screenshots dropped
    // in. `detail` (bullet list) removed in favor of `detailParagraphs`.
    detailParagraphs: [
      'Built for a real client, University of Windsor Human Kinetics, as the Lancer Athlete Injury Tracking System, the first project where I had to answer to someone outside a classroom for what I shipped, and hand it off cleanly to the next development team.',
      "Django-based with role-based access for admins, coaches, doctors, and players, each one only sees what's relevant to their job.",
      "The core of it is a full analytics dashboard: injury type, body part, and severity distribution, monthly trends, and academic-year filtering, giving coaches and staff a way to actually see patterns instead of digging through spreadsheets.",
      'Deliberately preserves every injury record, including recovered ones, since the whole point is accurate end-of-year trend analysis, not just a live status board.',
    ],
    detailImages: [
      { src: `${import.meta.env.BASE_URL}media/athleatinjurydashboard1.png`, caption: 'The dashboard: injury trends across the roster at a glance.' },
      { src: `${import.meta.env.BASE_URL}media/athleatinjurydashboard2.png`, caption: 'Filtering by injury type, body part, and severity.' },
      { src: `${import.meta.env.BASE_URL}media/athleatinjurydsahboard3.png`, caption: 'Role-based views, each user sees only what applies to them.' },
    ],
  },
  {
    title: 'Food Redistribution',
    description:
      'A software engineering project with a professor as the real client, connecting surplus food to the people who need it. This is the project that taught me how to build software systematically instead of just hacking something together, requirements gathering, design docs, and a real development process from start to finish.',
    tech: ['Software Engineering', 'Full-Stack', 'Requirements & Design'],
    code: 'https://github.com/ronitlxd',
  },
  {
    title: 'Educompare',
    description:
      'Automated course comparison across Coursera, Udemy, and edX using Selenium and Jsoup. Spring Boot backend, React frontend, deployed with Docker and a GitHub Actions CI/CD pipeline.',
    tech: ['Java', 'Selenium', 'React', 'Docker', 'CI/CD'],
    code: 'https://github.com/ronitlxd',
  },
  {
    title: 'Adaptive RAG Pipeline',
    description:
      'Next.js / TypeScript frontend for a RAG system applying five vector-pruning strategies (cosine, k-means, MMR) to shrink index size while preserving answer quality. FastAPI backend with sentence-transformers and pgvector. This is where I actually got my hands on training and configuring LLM models instead of just calling an API.',
    tech: ['Next.js', 'TypeScript', 'FastAPI', 'pgvector'],
    code: 'https://github.com/ronitlxd/Adaptive_Rag_With_Frontend',
    // Bullets replaced with short paragraphs (Ronit's request), same
    // convention as Home Lab/Athlete Injury Dashboard above.
    detailParagraphs: [
      'Most people building with LLMs just call an API and move on. This project is where I went past that, a full Next.js/TypeScript frontend over a FastAPI backend, and actually got my hands on training and configuring the models underneath instead of treating them as a black box.',
      'It applies one of five vector-pruning strategies, cosine, cosine-whitened, k-means, MMR, or none, before storage, shrinking the index size while keeping answer quality intact. A Dev Mode inspector exposes the entire pipeline live: ingestion, chunking, embedding, pruning, and retrieval, complete with per-chunk scores and an embedding heatmap most RAG demos never show. Every answer comes back with page-level source citations, so nothing is ever a black-box response.',
    ],
  },
]

export const education = [
  {
    degree: 'Master of Applied Computing',
    school: 'University of Windsor',
    when: '2025 to 2027 (expected)',
    detail: 'GPA 3.3 / 4.0, cybersecurity specialization.',
  },
  {
    degree: 'B.Tech Computer Science & Engineering',
    school: 'Uka Tarsadia University, India',
    when: '2021 to 2025',
    detail: 'GPA 3.48 / 4.0.',
  },
]

// EducationPage copy. Same voice as aboutPage above (first person, direct,
// no em dashes) - each entry is degree+institute as the (h1), CGPA as the
// (h2), then bullets on what that degree actually covered/taught (was a
// single paragraph, broken out into points per Ronit's request).
export const educationPage = [
  {
    degree: 'Master of Applied Computing, University of Windsor',
    cgpa: 'CGPA 3.3 / 4.0',
    bullets: [
      'Core coursework in software engineering, advanced algorithms, and advanced databases, the kind that pushes past syntax into how systems are actually designed to scale and hold up under load.',
      'Advanced computer programming meant living inside Linux day to day instead of just using it, which lines up well with the home lab I already run.',
      "A hands-on project for a real client, Human Kinetics, building an athlete injury dashboard, the first time I've had to answer to someone outside a classroom for what I build.",
      'Outside the classroom I\'ve been to Sterling cybersecurity workshops and jumped into Capture The Flag competitions and bug bounty hunting, chasing the same hands-on itch that got me building a home SOC lab in the first place.',
    ],
  },
  {
    degree: 'B.Tech Computer Science & Engineering, Uka Tarsadia University',
    cgpa: 'CGPA 3.48 / 4.0',
    bullets: [
      'Databases, object-oriented programming, networking, and algorithms, the fundamentals everything else stands on.',
      "Picked up Python here and went deep enough into compiler-level programming to understand what's actually happening beneath the code I write, not just trust that it works.",
      "Spent time on UI/UX across Android, iOS, and web, which taught me that a secure system nobody can use isn't really secure, someone still has to want to use it right.",
    ],
  },
]

// Source: user-uploaded experience.txt - "Cad Consultant(h1) / assistant web
// engineer(h2) / Feb to Jun 2024 India(h2)" plus the 4 bullets, verbatim.
// `company` is the (h1), `role` + `when` are the two (h2) lines from that
// file - kept as separate fields so ExperiencePage can render the same
// heading-level structure the file specified, instead of the old single
// "role - org" line.
export const experience = [
  {
    company: 'CAD Consultant',
    role: 'Assistant Web Engineer',
    when: 'Feb to Jun 2024, India',
    bullets: [
      'Contributed to full-stack development across 3+ client projects, applying secure coding practices (input validation, sanitized queries, least-privilege API access) to reduce common web vulnerabilities.',
      'Translated business requirements into technical specs and documentation, flagging authentication, data-handling, and access-control needs early in the design phase.',
      'Maintained repository hygiene in Git/GitHub within an Agile team - enforced branch protections, reviewed commits for exposed secrets/credentials, and kept dependencies patched.',
      'Worked cross-functionally to catch and fix configuration risks (default credentials, overly permissive CORS, verbose error output) before client handoff.',
    ],
  },
]

export const certifications = [
  'CompTIA Security+ (SY0-701), in progress',
  'TryHackMe SOC Level 1 path, in progress',
  'Sterling Cybersecurity Workshop',
]

// BIOS boot sequence lines. Rendered one block at a time with a slight delay.
// The RAM value ticks up to 14000 then prints OK (handled in the Boot component).
export const bootLines = [
  'Ronit Inc. RLBIOS (C)2026 Ronit Lad Inc.',
  'RLBIOS (686-P) Rev 2.7  -  07/30/2026',
  '',
  'Main Processor  : Intel(R) Core Detection Engine',
  'Memory Testing  : {RAM} K',
  '',
  'Detecting Primary Master   ... SOC_LAB_DISK',
  'Detecting IDE Devices      ... SPLUNK_VOL, SURICATA_VOL',
  '',
  'Initializing security modules ...',
  '  loading firewall.sys        [ OK ]',
  '  loading splunk.dll          [ OK ]',
  '  loading suricata.sys        [ OK ]',
  '  loading wireshark.drv       [ OK ]',
  '  mounting /home/ronit        [ OK ]',
  '',
  'FINISHED LOADING RESOURCES',
  '  keyboardKeydown ............ 100%',
  '  mouseUp .................... 100%',
  '  windowManager .............. 100%',
  '',
  "All Content Loaded, launching 'Ronit Lad Portfolio Showcase' V1.0",
  'Press DEL to enter SETUP,  ESC to skip memory test',
]

export const RAM_TARGET = 14000

// SOC_Lab live terminal. A new line is appended every ~1.5s, cycling these.
// These are realistic but sanitized samples. Swap in real lines if desired:
// each entry is { src, msg } and gets a timestamp prepended at render time.
export const socEvents = [
  { src: 'suricata', msg: 'ET SCAN Nmap TCP SYN scan detected from 10.0.0.24 -> 10.0.0.5' },
  { src: 'splunk', msg: 'alert: 5 failed SSH logins for user "root" from 10.0.0.24 in 60s' },
  { src: 'ml-layer', msg: 'anomaly score 0.94 flagged on host WORKSTATION-03, class=exfil' },
  { src: 'suricata', msg: 'ET TOR Known Tor Exit Node traffic to 185.220.101.47' },
  { src: 'firewall', msg: 'DROP reverse shell attempt 10.0.0.24:4444 -> 10.0.0.5:51092' },
  { src: 'firewall', msg: 'BLOCK outbound C2 beacon to 91.219.236.18:8080 (known bad)' },
  { src: 'splunk', msg: 'notable: privilege escalation via sudo misconfig on WEB-01' },
  { src: 'ml-layer', msg: 'model retrained on 42k events, precision 0.97 recall 0.93' },
  { src: 'suricata', msg: 'ET MALWARE Cobalt Strike beacon signature match, GID 1 SID 2029000' },
  { src: 'splunk', msg: 'alert: new admin account "svc_backup" created outside change window' },
  { src: 'firewall', msg: 'DROP inbound SMB exploit attempt (EternalBlue) from 10.0.0.24' },
  { src: 'ml-layer', msg: 'anomaly score 0.71 on DNS traffic, possible tunneling, host=DEV-02' },
]

export const socHeader = [
  'SOC_Lab detection stream  ::  tail -f /var/log/detections',
  'Splunk SIEM  |  Suricata IDS  |  ML anomaly layer  |  host firewall',
  '',
]

export const firewallEasterEgg = {
  title: 'firewall.sys',
  heading: 'Protected System File',
  body: 'This is a protected system file. The good ones always look. Curiosity is half of security, keep poking.',
}

// Desktop / Start menu external links.
export const links = {
  email: 'mailto:ronitlad.ca@gmail.com',
  github: 'https://github.com/ronitlxd',
  linkedin: 'https://linkedin.com/in/ronit-lad',
}
