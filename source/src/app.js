import { pillars, localLunar, fmt, GAN, ZHI } from './calendar.js';
import { buildChart, analyze, CATS, QUOTES, tossCoins, coinValue, timeCast, numberCast, XT_NAME, WX, lineState } from './engine.js';
import { CITIES } from './cities.js';
import { SOURCES } from './sources.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const p2 = n => String(n).padStart(2, '0');
const VNAME = { 6: '老陰（三字・交・動）', 7: '少陽（一背・單）', 8: '少陰（二背・拆）', 9: '老陽（三背・重・動）' };
const GENN = ['八純', '一世', '二世', '三世', '四世', '五世', '遊魂', '歸魂'];
const YN = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
let method = 'coin', tosses = [];

// ---- 表單初始化 ----
$('#cat').innerHTML = Object.entries(CATS).map(([k, v]) => `<option value="${k}">${esc(v.n)}</option>`).join('');
$('#city').innerHTML = CITIES.map(([g, cs]) => `<optgroup label="${esc(g)}">${cs.map(c => `<option value="${c[2]}" data-n="${esc(c[0])}">${esc(c[0])}（${c[2] >= 0 ? '東經' : '西經'} ${Math.abs(c[2]).toFixed(2)}°）</option>`).join('')}</optgroup>`).join('') + '<option value="custom" data-n="自訂經度">自訂經度</option>';
$('#city').value = '121.5654'; $('#lon').value = '121.5654';
$('#city').onchange = () => { if ($('#city').value !== 'custom') $('#lon').value = $('#city').value; };
$('#lon').oninput = () => { const o = [...$('#city').options].find(o => o.value === $('#lon').value); $('#city').value = o ? o.value : 'custom'; };
$('#cat').onchange = () => { $('#genderRow').hidden = $('#cat').value !== 'hun'; };
$$('input[name=tm]').forEach(r => r.onchange = syncTime);
function syncTime() { const set = $$('input[name=tm]').find(r => r.checked).value === 'set'; $('#setTime').hidden = !set; if (set && !$('#date').value) { const w = nowLmt(); $('#date').value = fmt(w).slice(0, 10); $('#time').value = fmt(w).slice(11, 16); } }
$$('.tabs button').forEach(b => b.onclick = () => { method = b.dataset.m; $$('.tabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.pane').forEach(p => p.hidden = p.dataset.p !== method); });
$('#manualRows').innerHTML = YN.map((n, i) => `<div class="mrow"><span>${n}</span><select data-i="${i}">${[7, 8, 9, 6].map(v => `<option value="${v}">${VNAME[v]}</option>`).join('')}</select></div>`).reverse().join('');

// ---- 三錢 ----
const rnd = () => { const a = new Uint32Array(1); (self.crypto || window.crypto).getRandomValues(a); return a[0] / 4294967296; };
function drawCoins(c, anim) { $('#coins').innerHTML = (c || [null, null, null]).map(x => `<div class="coin ${x ? 'bei' : ''} ${anim ? 'spin' : ''}">${x == null ? '' : x ? '背' : '字'}</div>`).join(''); }
function renderToss() {
  $('#tossLog').innerHTML = tosses.map((t, i) => `<li value="${i + 1}">${YN[i]}：${t.coins.map(x => x ? '背' : '字').join('')}　${t.backs ? t.backs + '背' : '三字'} → ${VNAME[t.v]}</li>`).reverse().join('');
  $('#toss').disabled = tosses.length >= 6; $('#tossAll').disabled = tosses.length >= 6;
  $('#toss').textContent = tosses.length >= 6 ? '六爻已成' : `擲一次（第 ${tosses.length + 1} 爻）`;
}
$('#toss').onclick = () => { if (tosses.length >= 6) return; const t = tossCoins(rnd); tosses.push(t); drawCoins(t.coins, true); renderToss(); };
$('#tossAll').onclick = () => { while (tosses.length < 6) tosses.push(tossCoins(rnd)); drawCoins(tosses[5].coins, true); renderToss(); };
$('#tossReset').onclick = () => { tosses = []; drawCoins(null); renderToss(); };
drawCoins(null); renderToss();

// ---- 時間 ----
function nowLmt(lon = +$('#lon').value || 121.5654) { const ut = Date.now(); return Math.floor((ut + lon * 4 * 6e4) / 6e4) * 6e4; }
function readWall(lon) {
  if ($$('input[name=tm]').find(r => r.checked).value !== 'set') return { wall: nowLmt(lon), mode: 'now' };
  const d = $('#date').value, t = $('#time').value || '12:00', m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(d), n = /^(\d\d):(\d\d)/.exec(t);
  if (!m || !n) return { wall: nowLmt(lon), mode: 'now', warn: '日期或時間格式不完整，改用現在時間' };
  return { wall: Date.UTC(+m[1], +m[2] - 1, +m[3], +n[1], +n[2]), mode: 'set' };
}

// ---- 排盤 ----
$('#go').onclick = () => {
  let lon = parseFloat($('#lon').value); const warn = [];
  if (!isFinite(lon) || lon < -180 || lon > 180) { lon = 121.5654; warn.push('經度無效，改用台北（東經 121.5654°）'); }
  const T = readWall(lon); if (T.warn) warn.push(T.warn);
  const P = pillars(T.wall, lon); let lines, how;
  if (method === 'coin') {
    if (tosses.length < 6) { warn.push(`只擲了 ${tosses.length} 爻，其餘由系統代擲`); while (tosses.length < 6) tosses.push(tossCoins(rnd)); renderToss(); }
    lines = tosses.map(t => t.v); how = 'coin:' + tosses.map(t => t.coins.join('')).join('.');
  } else if (method === 'manual') { lines = $$('#manualRows select').sort((a, b) => a.dataset.i - b.dataset.i).map(s => +s.value); how = 'manual'; }
  else if (method === 'time') { const LL = localLunar(T.wall, lon), r = timeCast(LL.yearBr, LL.month, LL.day, P.hour.br); lines = r.lines; how = 'time'; }
  else { let n = parseInt($('#num').value, 10); if (!(n > 0)) { n = Math.floor(rnd() * 999) + 1; warn.push(`未輸入數字，系統取 ${n}`); $('#num').value = n; } lines = numberCast(n, P.hour.br).lines; how = 'num:' + n; }
  const st = { l: lines.join(''), t: fmt(T.wall).replace(/\D/g, ''), lon: String(lon), p: ($('#city').selectedOptions[0] || {}).dataset?.n || '', c: $('#cat').value, g: ($$('input[name=g]').find(r => r.checked) || {}).value || 'm', m: how, q: $('#q').value.trim().slice(0, 60) };
  history.replaceState(null, '', '?' + new URLSearchParams(st).toString());
  show(st, warn);
};

function stateFromUrl() {
  const u = new URLSearchParams(location.search); if (!u.get('l')) return null;
  return { l: u.get('l'), t: u.get('t') || '', lon: u.get('lon') || '121.5654', p: u.get('p') || '', c: u.get('c') || 'self', g: u.get('g') || 'm', m: u.get('m') || 'manual', q: u.get('q') || '' };
}
function wallFromT(t) { const m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)$/.exec(t || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null; }

function show(st, warn = []) {
  let lon = parseFloat(st.lon); if (!isFinite(lon) || lon < -180 || lon > 180) { lon = 121.5654; warn.push('經度無效，改用台北'); }
  let wall = wallFromT(st.t); if (wall == null) { wall = nowLmt(lon); warn.push('時間無效，改用現在'); }
  let lines = String(st.l || '').split('').map(Number); if (lines.length !== 6 || lines.some(v => ![6, 7, 8, 9].includes(v))) { lines = (lines.concat([7, 7, 7, 7, 7, 7])).slice(0, 6).map(v => [6, 7, 8, 9].includes(v) ? v : 7); warn.push('卦象參數不完整，缺漏處以少陽補上'); }
  const P = pillars(wall, lon), C = buildChart(lines, P), A = analyze(C, { cat: st.c, gender: st.g });
  const LL = localLunar(wall, lon);
  $('#result').innerHTML = renderResult(st, P, C, A, LL, lon, warn);
  $('#result').hidden = false;
  $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#copyLink').onclick = copyLink; $('#printBtn').onclick = () => window.print(); $('#pdfBtn').onclick = downloadPdf;
  $('#again').onclick = () => { tosses = []; drawCoins(null); renderToss(); history.replaceState(null, '', location.pathname); $('#result').hidden = true; $('#form').scrollIntoView({ behavior: 'smooth' }); };
}

function q(id) { const x = QUOTES[id]; if (!x) return ''; return `<blockquote>${esc(x.t)}<cite>${esc(x.book)}・${esc(x.ch)}（<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.site)}</a>）</cite></blockquote>`; }
function yaoBar(yang, mv) { return `<span class="yao ${yang ? 'yang' : 'yin'} ${mv ? 'mv' : ''}"></span>`; }

function methodText(st, P, wall, lon) {
  const m = st.m || '';
  if (m.startsWith('coin:')) return '三錢搖卦（' + m.slice(5).split('.').map((s, i) => YN[i] + ' ' + s.split('').map(x => x === '1' ? '背' : '字').join('')).join('；') + '）';
  if (m === 'time') { const LL = localLunar(wall, lon), r = timeCast(LL.yearBr, LL.month, LL.day, P.hour.br); return `時間起卦：${ZHI[LL.yearBr]}年 ${r.nums.y}＋農曆${LL.leap ? '閏' : ''}${LL.month}月 ${r.nums.m}＋${LL.day}日 ${r.nums.d}＝${r.nums.s1}，除八餘 ${r.up}（${XT_NAME[r.up]}）為上卦；加${ZHI[P.hour.br]}時 ${r.nums.h}＝${r.nums.s2}，除八餘 ${r.lo}（${XT_NAME[r.lo]}）為下卦；除六餘 ${r.mv}，第 ${r.mv} 爻動`; }
  if (m.startsWith('num:')) { const r = numberCast(+m.slice(4), P.hour.br); return `數字起卦：${r.nums.n} 除八餘 ${r.up}（${XT_NAME[r.up]}）為上卦；${ZHI[P.hour.br]}時 ${r.nums.h} 除八餘 ${r.lo}（${XT_NAME[r.lo]}）為下卦；${r.nums.n}＋${r.nums.h}＝${r.nums.n + r.nums.h} 除六餘 ${r.mv}，第 ${r.mv} 爻動`; }
  return '手動輸入六爻';
}

function renderResult(st, P, C, A, LL, lon, warn) {
  const B = C.ben, V = C.bian, Y = A.yong.line;
  const methodQ = (st.m || '').startsWith('coin') ? 'bz_qian' : st.m === 'time' ? 'mh_time' : (st.m || '').startsWith('num') ? 'mh_wu' : 'bz_qian';
  let h = `<div class="card" id="sheet">`;
  if (warn.length) h += `<p class="hint">說明：${warn.map(esc).join('；')}</p>`;
  h += `<h2>占卜資料</h2><dl class="meta">`;
  if (st.q) h += `<dt>所問</dt><dd>${esc(st.q)}</dd>`;
  h += `<dt>類別</dt><dd>${esc(A.catName)}${st.c === 'hun' ? (st.g === 'f' ? '（女問男）' : '（男問女）') : ''}</dd>`;
  h += `<dt>時間</dt><dd>${fmt(P.wall)}（地方平時）</dd><dt>地點</dt><dd>${esc(st.p || '')} ${lon >= 0 ? '東經' : '西經'} ${Math.abs(lon)}°</dd>`;
  h += `<dt>農曆</dt><dd>${esc(LL.text)}</dd>`;
  h += `<dt>月建</dt><dd>${P.month.gz}（${P.jie.name} ${P.jie.lmt}，地方平時）</dd><dt>日辰</dt><dd>${P.day.gz}${P.shift ? `（東經 70° 以西日柱干支進一位，日期不動；原為${P.day.rawGz}）` : ''}</dd>`;
  h += `<dt>旬空</dt><dd>${C.xun}旬　空${C.kong.map(b => ZHI[b]).join('、')}</dd>`;
  h += `<dt>起卦</dt><dd>${esc(methodText(st, P, P.wall, lon))}</dd></dl>`;
  h += `<div class="pillars">${[['年', P.year.gz], ['月', P.month.gz], ['日', P.day.gz], ['時', P.hour.gz]].map(([a, b]) => `<div><small>${a}柱</small>${b}</div>`).join('')}</div>`;
  if (P.lateZi) h += `<p class="small">23 時起為子時，時干依次日日干（晚子時），日柱不換。</p>`;
  // 卦表
  h += `<h2>排盤</h2><p><span class="gname">${B.name}</span> <span class="gsub">${B.palace}宮・${GENN[B.g]}${B.liuchong ? '・六沖' : ''}${B.liuhe ? '・六合' : ''}</span>${V ? `　之　<span class="gname">${V.name}</span> <span class="gsub">${V.palace}宮・${GENN[V.g]}${V.liuchong ? '・六沖' : ''}${V.liuhe ? '・六合' : ''}</span>` : '　<span class="gsub">（六爻安靜，無變卦）</span>'}</p>`;
  h += `<table class="gua"><thead><tr><th>六獸</th><th>伏神</th><th>本卦</th><th></th><th></th>${V ? '<th>變卦</th><th></th>' : ''}</tr></thead><tbody>`;
  for (let i = 5; i >= 0; i--) {
    const x = C.lines[i], isY = Y && !Y.isRY && !Y.isFu && Y.pos === i, isYF = Y && Y.isFu && Y.pos === i;
    h += `<tr class="${isY ? 'ys' : ''}"><td>${x.shou}</td><td class="fu ${isYF ? 'ys' : ''}">${x.fu ? `${x.fu.lq}<br>${x.fu.g}${x.fu.zhi}${WX[x.fu.wx]}` : ''}</td>`;
    h += `<td class="lq">${x.lq}<small>${x.g}${x.zhi}${WX[x.wx]}${x.kong ? '<span class="kg">空</span>' : ''}</small></td><td>${yaoBar(x.yang, x.moving)} <span class="mk">${x.v === 9 ? '○' : x.v === 6 ? '×' : ''}</span></td><td><span class="sy">${x.shi ? '世' : x.ying ? '應' : ''}</span></td>`;
    if (V) h += x.moving ? `<td>${yaoBar(x.bian.yang, false)}</td><td class="lq">${x.bian.lq}<small>${x.bian.g}${x.bian.zhi}${WX[x.bian.wx]}${x.bian.kong ? '<span class="kg">空</span>' : ''}</small></td>` : `<td>${yaoBar(!!(V.code >> i & 1), false)}</td><td></td>`;
    h += `</tr>`;
  }
  h += `</tbody></table><p class="small">○ 老陽動、× 老陰動；底色為用神。六親以本宮五行定，變爻六親仍照本卦之宮（《增刪卜易》動變章）。伏神取本宮首卦（${C.pure}）。</p>`;
  h += q(methodQ);
  // 解卦
  h += `<h2>解卦</h2><p><b>用神：</b>${esc(A.yong.label)}<br><span class="small">${esc(A.yong.how)}</span></p>`;
  h += A.catQ.map(q).join('');
  const S = A.summary;
  h += `<div class="sum ${S.k}"><div class="h">${esc(S.t)}</div><div class="small">本站依下列逐條結果歸納：有利 ${S.count.pos} 條、不利 ${S.count.neg} 條（歸納為本站統計，不是古籍原文；斷語以引文為準）。</div>${S.q.map(q).join('')}</div>`;
  const KN = { pos: '有利', neg: '不利', note: '參考' };
  h += `<ul class="rules">${A.rules.map(r => `<li class="${r.kind}"><div><span class="k ${r.kind}">${KN[r.kind]}</span><span class="t">${esc(r.title)}</span></div><div class="d">${esc(r.detail)}</div>${r.q.length ? r.q.map(q).join('') : '<blockquote>來源待核</blockquote>'}${r.extra ? q(r.extraSrc).replace(/<blockquote>[\s\S]*?<cite>/, `<blockquote>${esc(r.extra)}<cite>`) : ''}</li>`).join('')}</ul>`;
  // 經文
  const T = C.texts;
  h += `<h2>《周易》經文</h2><div class="jing"><p><span class="lb">本卦　${esc(T.ben.name)}</span>${esc(T.ben.gua)}</p>`;
  for (const m of T.moving) h += `<p><span class="lb">動爻　${esc(m.label)}</span>${esc(m.text)}</p>`;
  if (T.yong) h += `<p><span class="lb">${esc(T.yong.label)}</span>${esc(T.yong.text)}</p>`;
  if (T.bian) h += `<p><span class="lb">變卦　${esc(T.bian.name)}</span>${esc(T.bian.gua)}</p>`;
  h += `<p class="small">經文取自<a href="${esc(T.ben.url)}" target="_blank" rel="noopener">維基文庫《周易》</a>，〔一作〕為維基文庫所註異文，原字未改。</p></div>`;
  h += `<p class="small">內容僅供參考。本站不作健康疾病、生死、刑案與宗教方面的判斷。</p></div>`;
  h += `<div class="actions"><button type="button" id="copyLink">複製分享連結</button><button type="button" id="pdfBtn">下載 PDF</button><button type="button" id="printBtn">列印</button><button type="button" id="again" class="pri">重新起卦</button></div>`;
  return h;
}

function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }
async function copyLink() { const u = location.href; try { await navigator.clipboard.writeText(u); toast('已複製分享連結'); } catch (e) { prompt('請複製這個連結', u); } }

// ---- PDF：html2canvas 逐頁轉圖，組成 A4 PDF ----
async function downloadPdf() {
  const b = $('#pdfBtn'), lab = b.textContent; b.disabled = true; b.textContent = '產生 PDF 中…';
  try {
    if (!window.html2canvas) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'html2canvas.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    const el = $('#sheet'), scale = Math.min(2, 1600 / el.offsetWidth);
    const cv = await window.html2canvas(el, { scale, backgroundColor: '#ffffff', useCORS: true });
    const pw = 595.28, ph = 841.89, m = 28, iw = pw - 2 * m, pxPerPt = cv.width / iw, pageH = Math.floor((ph - 2 * m) * pxPerPt);
    const pages = [];
    for (let y = 0; y < cv.height; y += pageH) {
      const h = Math.min(pageH, cv.height - y), c = document.createElement('canvas'); c.width = cv.width; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, h); g.drawImage(cv, 0, y, cv.width, h, 0, 0, cv.width, h);
      const bin = atob(c.toDataURL('image/jpeg', 0.88).split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      pages.push({ jpg: u8, w: c.width, h, ptH: h / pxPerPt });
    }
    const blob = makePdf(pages, pw, ph, m, iw);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `六爻-${new URLSearchParams(location.search).get('t') || 'chart'}.pdf`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  } catch (e) { toast('PDF 產生失敗，請改用「列印」另存 PDF'); }
  b.disabled = false; b.textContent = lab;
}
function makePdf(pages, pw, ph, m, iw) {
  const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const push = x => { const u = typeof x === 'string' ? enc.encode(x) : x; parts.push(u); len += u.length; };
  const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = pages.length, kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
  pages.forEach((p, i) => {
    const po = 3 + i * 3, io = po + 1, co = po + 2, y = ph - m - p.ptH;
    obj(po, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i} ${io} 0 R >> >> /Contents ${co} 0 R >>`));
    obj(io, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`); push(p.jpg); push('\nendstream'); });
    const cs = `q ${iw.toFixed(2)} 0 0 ${p.ptH.toFixed(2)} ${m} ${y.toFixed(2)} cm /Im${i} Do Q`;
    obj(co, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
  });
  const xref = len, total = 3 + n * 3;
  push(`xref\n0 ${total}\n0000000000 65535 f \n` + Array.from({ length: total - 1 }, (_, i) => String(offs[i + 1]).padStart(10, '0') + ' 00000 n \n').join(''));
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

// ---- 資料來源 ----
$('#sources').innerHTML = SOURCES;

// ---- 由網址還原 ----
const s0 = stateFromUrl();
if (s0) {
  $('#cat').value = CATS[s0.c] ? s0.c : 'self'; $('#cat').onchange(); $('#q').value = s0.q; $('#lon').value = s0.lon; $('#lon').oninput();
  show(s0, []);
}
window.__liuyao = { pillars, buildChart, analyze };
