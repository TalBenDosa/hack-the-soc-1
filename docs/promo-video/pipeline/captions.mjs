import { chromium } from 'playwright';
import fs from 'fs';
import { CAPS } from './caps.mjs';

const OUT = '/tmp/claude-0/-home-user-hack-the-soc-1/034d7982-4a70-581d-ada5-9cfc31d7a4b6/scratchpad/caps_png';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const html = (text, isEnd) => `
<style>
  @font-face { font-family:'Plex'; src:url('file:///mnt/skills/examples/canvas-design/canvas-fonts/IBMPlexMono-Bold.ttf'); }
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1920px; height:1080px; background:transparent; }
  .wrap {
    position:absolute; left:0; right:0; bottom:0; height:${isEnd ? 1080 : 250}px;
    display:flex; align-items:${isEnd ? 'center' : 'flex-end'}; justify-content:center;
    padding-bottom:${isEnd ? 0 : 74}px;
    background:${isEnd
      ? 'rgba(2,6,23,0.80)'
      : 'linear-gradient(to top, rgba(2,6,23,0.94) 0%, rgba(2,6,23,0.86) 55%, rgba(2,6,23,0) 100%)'};
  }
  .bar { display:flex; align-items:center; gap:22px; max-width:1500px; }
  .tick { width:6px; align-self:stretch; background:#14b8a6; border-radius:3px; flex:none; }
  .txt {
    font-family:'Plex','DejaVu Sans',sans-serif; color:#fff;
    font-size:${isEnd ? 62 : 40}px; line-height:1.34; letter-spacing:-0.3px;
    text-shadow:0 2px 18px rgba(0,0,0,0.75);
    text-align:${isEnd ? 'center' : 'left'};
  }
  .end .tick { display:none; }
  .accent { color:#2dd4bf; }
</style>
<div class="wrap"><div class="bar ${isEnd ? 'end' : ''}">
  <div class="tick"></div>
  <div class="txt">${text}</div>
</div></div>`;

for (let i = 0; i < CAPS.length; i++) {
  const { cap, end } = CAPS[i];
  await page.setContent(html(cap, !!end));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}.png`, omitBackground: true });
  console.log('caption', i);
}
await browser.close();
