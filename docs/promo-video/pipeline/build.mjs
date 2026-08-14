import { execFileSync } from 'child_process';
import fs from 'fs';
import ffmpeg from 'ffmpeg-static';
import { CAPS } from './caps.mjs';

const SP = '/tmp/claude-0/-home-user-hack-the-soc-1/034d7982-4a70-581d-ada5-9cfc31d7a4b6/scratchpad';
const F = `${SP}/frames`, P = `${SP}/caps_png`, C = `${SP}/clips`;
fs.mkdirSync(C, { recursive: true });

const FPS = 30, W = 1920, H = 1080;
const run = a => execFileSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...a], { stdio: 'inherit' });

CAPS.forEach((s, i) => {
  const n = String(i).padStart(2, '0');
  const frames = s.dur * FPS;
  // Alternate drift direction so consecutive shots don't feel mechanical.
  const inZoom = i % 2 === 0;
  const z = inZoom ? `min(1.0+0.00055*on,1.05)` : `max(1.05-0.00055*on,1.0)`;
  const zoom = `zoompan=z='${z}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS}`;
  const capFade = `fade=t=in:st=0.25:d=0.5:alpha=1,fade=t=out:st=${s.dur - 0.7}:d=0.5:alpha=1`;

  run([
    '-loop', '1', '-i', `${F}/${s.img}`,
    '-loop', '1', '-i', `${P}/${n}.png`,
    '-t', String(s.dur),
    '-filter_complex',
    `[0:v]scale=${W * 2}:${H * 2}:flags=lanczos,${zoom},format=yuv420p[bg];` +
    `[1:v]format=rgba,${capFade}[cap];` +
    `[bg][cap]overlay=0:0:format=auto,` +
    `fade=t=in:st=0:d=0.45,fade=t=out:st=${s.dur - 0.45}:d=0.45,format=yuv420p[v]`,
    '-map', '[v]', '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    `${C}/${n}.mp4`,
  ]);
  console.log('clip', n, s.img);
});

fs.writeFileSync(`${SP}/concat.txt`,
  CAPS.map((_, i) => `file '${C}/${String(i).padStart(2, '0')}.mp4'`).join('\n'));

const total = CAPS.reduce((a, s) => a + s.dur, 0);
const OUT = `${SP}/hack-the-soc-promo.mp4`;
run(['-f', 'concat', '-safe', '0', '-i', `${SP}/concat.txt`,
  '-f', 'lavfi', '-t', String(total), '-i', 'anullsrc=r=48000:cl=stereo',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', OUT]);

console.log('\nWROTE', OUT, '| duration', total, 's');
