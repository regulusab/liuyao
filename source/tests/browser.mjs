import { chromium, devices } from 'playwright'; import fs from 'fs';
import { pillars } from '../src/calendar.js'; import { buildChart, analyze } from '../src/engine.js';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const base = 'http://127.0.0.1:18931/';
const errs = [];
// 範例盤：2026-11-21 12:44 台北，求財，山風蠱之火山旅
const q = 'l=897687&t=202611211244&lon=121.5654&p=%E5%8F%B0%E5%8C%97&c=cai&g=m&m=manual&q=%E9%80%99%E7%AD%86%E6%8A%95%E8%B3%87%E8%83%BD%E5%90%A6%E7%8D%B2%E5%88%A9';
for (const [name, opt] of [['desktop', { viewport: { width: 1280, height: 900 } }], ['phone', { ...devices['iPhone 13'] }]]) {
  const ctx = await b.newContext({ ...opt, acceptDownloads: true }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
  await p.goto(base + '?' + q, { waitUntil: 'networkidle' }); await p.waitForSelector('#sheet');
  await p.waitForTimeout(500); { const tx = await p.$eval('#result', e => e.innerText); if (/undefined|NaN|null/.test(tx)) errs.push(name + ': result has undefined/NaN'); }
  await p.screenshot({ path: `shots/${name}-chart.png`, fullPage: false, clip: undefined });
  const el = await p.$('#result'); await el.screenshot({ path: `shots/${name}-full.png` });
  if (name === 'desktop') {
    // 下載 PDF
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#pdfBtn')]);
    await dl.saveAs('shots/example.pdf'); console.log('pdf', fs.statSync('shots/example.pdf').size);
    // 與 node 結果比對
    const bt = await p.$$eval('.rules .t', xs => xs.map(x => x.textContent));
    const A = analyze(buildChart([8, 9, 7, 6, 8, 7], pillars(Date.UTC(2026, 10, 21, 12, 44), 121.5654)), { cat: 'cai', gender: 'm' });
    console.log('browser==node', JSON.stringify(bt) === JSON.stringify(A.rules.map(r => r.title)));
    // 搖卦流程
    await p.goto(base, { waitUntil: 'networkidle' });
    await p.selectOption('#cat', 'hun'); await p.check('input[name=g][value=f]');
    for (let i = 0; i < 6; i++) await p.click('#toss');
    await p.click('#go'); await p.waitForSelector('#sheet');
    console.log('coin flow url', p.url().slice(base.length, base.length + 120));
    // 其他起卦法
    for (const m of ['time', 'num', 'manual']) { await p.goto(base, { waitUntil: 'networkidle' }); await p.click(`.tabs button[data-m=${m}]`); await p.check('input[name=tm][value=set]'); await p.fill('#date', '2026-10-07'); await p.fill('#time', '22:10'); await p.selectOption('#city', 'custom'); await p.fill('#lon', '-122.68'); if (m === 'num') await p.fill('#num', '388'); await p.click('#go'); await p.waitForSelector('#sheet'); { const tx = await p.$eval('#result', e => e.innerText); if (/undefined|NaN/.test(tx)) errs.push(m + ': undefined/NaN'); } const t = await p.$eval('.meta', e => e.innerText); console.log(m, t.replace(/\n/g, ' | ').slice(0, 400)); }
  }
  await ctx.close();
}
await b.close(); console.log('errors', errs);
