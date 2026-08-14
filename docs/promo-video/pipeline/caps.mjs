// Shot list: frame + duration + on-screen narration line.
// The `cap` text is identical to the English VO script, so audio can be dropped in later.
export const CAPS = [
  { img: '03_feed.png',          dur: 7, cap: 'Every day, a security operations center sees <span class="accent">thousands of events</span>.' },
  { img: '02_dashboard.png',     dur: 6, cap: 'Hack The SOC turns that firehose into <span class="accent">training</span>.' },
  { img: '04_scenarios.png',     dur: 7, cap: 'Pick a scenario — phishing, ransomware, lateral movement.' },
  { img: '05_invest_brief.png',  dur: 7, cap: 'Every investigation opens with a brief and clear objectives.' },
  { img: '06_invest_log.png',    dur: 8, cap: 'Expand any event: <span class="accent">Defender, CrowdStrike, Entra ID, Wazuh</span>.' },
  { img: '07_invest_report.png', dur: 7, cap: 'Then work like an analyst — narrative, findings, indicators.' },
  { img: '08_verdict.png',       dur: 7, cap: 'Make the call: true positive, false positive, or <span class="accent">escalate</span>.' },
  { img: '09_learning.png',      dur: 6, cap: 'Backed by lessons from fundamentals to forensics.' },
  { img: '10_progress.png',      dur: 6, cap: 'Track skills, streaks, and mastery over time.' },
  { img: '01_welcome.png',       dur: 7, cap: 'Hack The SOC<br><span class="accent">Train like the incident is real.</span>', end: true },
];
