import { chromium } from 'playwright';
import fs from 'fs';
import { fixtureFor } from './fixtures.mjs';

const OUT = '/tmp/claude-0/-home-user-hack-the-soc-1/034d7982-4a70-581d-ada5-9cfc31d7a4b6/scratchpad/frames';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

await ctx.route('**/*', async route => {
  const url = route.request().url();
  if (/\/api\/apps\//.test(url) || /base44\.app/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(fixtureFor(url)) });
  }
  if (!url.startsWith('http://localhost:5173')) return route.abort();
  return route.continue();
});

const HIDE = `(() => { const kill = () => {
  for (const el of document.querySelectorAll('div,section')) {
    const t = (el.innerText || '').trim();
    if (/Failed to Load Data|Network Error/i.test(t) && t.length < 200) el.style.display='none';
  }}; kill(); setInterval(kill, 400); })();`;

const SHOTS = [
  { name: '01_welcome',       route: 'StudentWelcome' },
  { name: '02_dashboard',     route: 'Dashboard' },
  { name: '03_feed',          route: 'Dashboard', scroll: 620 },
  { name: '04_scenarios',     route: 'Scenarios' },
  { name: '05_invest_brief',  route: 'Investigation?scenario=scn-001' },
  { name: '06_invest_log',    route: 'Investigation?scenario=scn-001', scroll: 560 },
  { name: '07_invest_report', route: 'Investigation?scenario=scn-001', scroll: 1500 },
  { name: '08_verdict',       route: 'Investigation?scenario=scn-001', scroll: 1500, click: 'Verdict' },
  { name: '09_learning',      route: 'LearningPath' },
  { name: '10_progress',      route: 'Progress' },
];

for (const s of SHOTS) {
  const page = await ctx.newPage();
  let note = '';
  try {
    await page.goto(`http://localhost:5173/${s.route}`, { waitUntil: 'networkidle', timeout: 40000 });
    await page.waitForTimeout(5000);
    await page.evaluate(HIDE);
    if (s.click) {
      const el = page.getByText(s.click, { exact: true }).first();
      await el.click({ timeout: 5000 }).catch(e => { note = 'click-miss'; });
      await page.waitForTimeout(1200);
    }
    if (s.scroll) {
      // The shell scrolls an inner overflow container, not the window.
      const moved = await page.evaluate(y => {
        const cands = [...document.querySelectorAll('*')].filter(el => {
          const st = getComputedStyle(el);
          return /auto|scroll/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 50;
        });
        const target = cands.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
        if (target) { target.scrollTop = y; return target.scrollTop; }
        window.scrollTo(0, y); return window.scrollY;
      }, s.scroll);
      note += ` scrolled=${moved}`;
      await page.waitForTimeout(1200);
    }
  } catch (e) { note = e.message.slice(0, 70); }
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log(`${s.name} ${note}`);
  await page.close();
}
await browser.close();
console.log('frames written to', OUT);
