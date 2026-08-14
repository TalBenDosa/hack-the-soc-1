# Hack The SOC — Promo Video

> **A rendered cut of this video now exists.** It was produced entirely from the real
> application UI — see [`pipeline/`](./pipeline/) to reproduce or edit it. The delivered
> cut runs 68 s with burned-in captions and no voiceover; the shot list below is the
> original plan and remains the reference for a fuller screen-recorded version.


**Narration:** English
**Footage policy:** real product screens only — no generated/invented UI
**Format:** 1920×1080 primary, 1080×1920 vertical cut
**Look:** the product's own dark palette — `slate-950` surfaces, teal-400/500 primary, purple-500 secondary

---

## 1. Narration script

Total ≈ 120 words ≈ 55 s at a 130 wpm delivery, leaving room to breathe on the visual beats.

| # | Time | Narration (VO) |
|---|------|----------------|
| 1 | 0:00–0:06 | "Thousands of alerts. Most of them noise. A few of them — a real breach." |
| 2 | 0:06–0:12 | "Hack The SOC turns that pressure into practice." |
| 3 | 0:12–0:20 | "Pick a scenario. Investigate real vendor telemetry — Entra ID, CloudTrail, CrowdStrike, Defender." |
| 4 | 0:20–0:30 | "Open the log. Spot the hash. Check it — and watch forty engines return their verdict." |
| 5 | 0:30–0:38 | "Then do what an analyst actually does. Write the narrative. Tag your indicators. Make the call." |
| 6 | 0:38–0:46 | "True positive. False positive. Escalate to tier two. Our AI grades your reasoning, not just your answer." |
| 7 | 0:46–0:53 | "You get a weighted score, expert reasoning, and exactly where you went wrong." |
| 8 | 0:53–1:00 | "Score eighty-five, earn the certificate. Hack The SOC — train like the incident is real." |

### Optional B2B tag (extends to ~1:15)

> "For teams: paste your existing syllabus, and AI builds the entire course. Per-organization environments, seat management, and per-student progress tracking — built in."

---

## 2. Shot list

Every shot maps to a screen that already exists. The **Source** column is where to capture it.

| # | Time | Shot | Source screen | Capture notes |
|---|------|------|---------------|---------------|
| 1 | 0:00–0:06 | Live feed streaming, rows appearing | `Dashboard` → `LiveEventFeed` | Record ≥60 s of real runtime so new events actually append. Slow push-in on the pulsing activity icon. |
| 2 | 0:06–0:12 | KPI tiles, then logo | `Dashboard` — Active Investigations / Threat Level / Scenarios Completed / Average Score | Stagger the four tiles in. Land on the teal shield mark. |
| 3 | 0:12–0:20 | Scenario grid, cursor selects one | `Scenarios` | Show the Easy/Medium/Hard/Advanced badges and Learning Topics tags. End on "Start Scenario". |
| 4 | 0:20–0:30 | Log row expands → SHA256 → "Check Hash" → 40 AV engines | `Investigation` → `InvestigationLogs` → `HashLookupPanel` | **The hero shot — give it the most time.** Capture the "File Hash Detected" banner, then the engine list resolving. Consider holding an extra beat here. |
| 5 | 0:30–0:38 | Tab sweep: Narrative → Findings → IOCs | `Investigation` → "Scenario Investigation Report" | Type live into Narrative (real text, not lorem). Show `IOCTracker` adding an IP and a SHA256 with confidence levels. |
| 6 | 0:38–0:46 | Three verdict buttons → Finalize → "Analyzing…" | `Investigation` → Verdict tab → `CompleteInvestigationModal` | The purple→teal gradient on "Finalize & Evaluate Investigation" is the strongest brand moment in the app. Hold on it. |
| 7 | 0:46–0:53 | Score, Score Breakdown, Detailed Feedback | `CompleteInvestigationModal` results / `InvestigationReport` | Show a **passing** score (≥85). Let "Expert Reasoning" be legible for ~1.5 s. |
| 8 | 0:53–1:00 | Certificate renders, then skill radar | `Certificate`, `Progress` → `SkillRadar` | End card: teal shield + "Hack The SOC" on `slate-950`. |
| 9 | tag | Syllabus paste → lessons generate; tenant dashboard | `Admin` → `AISyllabusGenerator`, `TenantAdminDashboard` | Only for the B2B cut. |

### Capture requirements

- **1920×1080, 60 fps, no browser chrome.** Use a clean profile — no bookmarks bar, no extensions, no personal avatar.
- **Scrub all real data.** Use seeded demo tenant data; no real customer names, emails, domains, or internal hostnames on screen.
- The UI is **English and LTR** throughout, which matches the English VO. The only Hebrew in the product is the accessibility widget and legal pages — **keep those out of frame** unless you specifically want the IS-5568 compliance beat.
- Prefer **screen recording over stills** for shots 1, 4, 5, and 6 — they have real motion (streaming feed, engines resolving, typing, the analyzing spinner) that sells better than a pan over a static image.

---

## 3. Production chronology

### Phase 0 — Prerequisites (local machine, not the cloud container)

```bash
higgsfield auth login          # OAuth in a real browser
higgsfield account             # confirm credits
higgsfield voices list         # pick the narrator voice id
```

### Phase 1 — Lock the script
Read the VO aloud against a stopwatch. If any line runs long, cut words — do **not** speed up delivery. Lock timings before capturing a single frame.

### Phase 2 — Capture
Work through the shot list in order. Record 2–3 takes per shot, generously padded on both ends. Log the best take per shot in a simple sheet.

### Phase 3 — Voiceover
```bash
higgsfield voices list
higgsfield generate create <tts_model> --prompt "<line>" --voice <voice_id>
higgsfield generate wait <job_id>
```
Render **per line, not as one block** — per-line audio lets you retime individual shots without re-rendering everything.

### Phase 4 — Assemble
Lay VO first, cut picture to it. Add a low bed of tension-ambient music at roughly −22 LUFS under the VO. Keep transitions to hard cuts and short cross-dissolves; the UI is dense, so flashy transitions hurt legibility.

### Phase 5 — Finish
Burn subtitles (accessibility, and most social views are muted). Export the 1080p master, then reframe for vertical.

---

## 4. Important recommendation on generative footage

You asked for **real system screens only** — that is the right call, and it shapes which parts of Higgsfield to use.

**Do not run screenshots of this UI through image-to-video.** Generative motion models warp small text, invent plausible-looking interface elements, and re-render logos. On a dense SIEM table full of timestamps, hashes, and IPs, the result reads as fake and undermines exactly the credibility a product demo needs.

Recommended split:

| Task | Tool |
|------|------|
| All footage | Screen recording of the real app |
| Motion (push-ins, pans, reveals) | Editor keyframes — After Effects, Premiere, Resolve, or Final Cut |
| English narration | **Higgsfield TTS** (`higgsfield voices` + `generate create`) |
| Music bed | Higgsfield audio, or a licensed track |
| End-card / title graphics | Static, built to the product's palette |

Higgsfield earns its place here on **voice**, not on picture. That keeps every frame of UI truthful while still giving you a professional English narrator without booking a session.
