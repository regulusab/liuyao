import { chromium } from 'playwright';
import { pillars } from '../src/calendar.js'; import { buildChart } from '../src/engine.js';
const cases = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const cs of cases) {
  const lines = cs.split('').map(Number);
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.goto('https://liuyao.lemontea.xyz/', { waitUntil: 'networkidle', timeout: 45000 });
  await p.getByRole('button', { name: /手动排卦/ }).click(); await p.waitForTimeout(800);
  const ch = p.locator('button.editor-choice');
  for (let i = 0; i < 6; i++) await ch.nth((5 - i) * 4 + { 7: 0, 8: 1, 9: 2, 6: 3 }[lines[i]]).click();
  await p.getByRole('button', { name: /生成排盘/ }).click(); await p.waitForTimeout(2500);
  const now = Date.now();
  const t = await p.innerText('body');
  const a = t.indexOf('年柱'), z = t.indexOf('神煞');
  console.log('==== ' + cs + ' 對方網站 ====\n' + t.slice(a, z).replace(/\n+/g, ' '));
  const P = pillars(now + 8 * 36e5, 120), C = buildChart(lines, P);
  console.log('---- 本站 ----', P.year.gz, P.month.gz, P.day.gz, P.hour.gz, '旬空', C.kong, C.ben.name, C.bian && C.bian.name);
  for (let i = 5; i >= 0; i--) { const x = C.lines[i]; console.log(x.shou, x.fu ? x.fu.lq + x.fu.g + x.fu.zhi : '-', x.lq + x.g + x.zhi, x.shi ? '世' : x.ying ? '應' : '', x.moving ? '→ ' + x.bian.lq + x.bian.g + x.bian.zhi : ''); }
  if (cs === cases[0]) await p.screenshot({ path: 'shots/spot-online.png', fullPage: true });
  await p.close();
}
await b.close();
