/* 六爻（文王卦）裝卦與解卦引擎。所有規則皆附古籍出處（data.js 的 QUOTES），不另造斷語。 */
import { ZHOUYI, PALACE_WS, QUOTES, WX_MONTH } from './data.js';
import { GAN, ZHI, xunKong, xunName } from './calendar.js';

export const WX = ['木', '火', '土', '金', '水'];
const ZWX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];             // 子丑寅卯辰巳午未申酉戌亥 → 五行序
export const zwx = b => ZWX[b];
export const WXN = i => WX[i];
const sheng = (a, b) => (a + 1) % 5 === b;                    // a 生 b
const ke = (a, b) => (a + 2) % 5 === b;                       // a 剋 b
export function rel(a, b) { if (a === b) return '比'; if (sheng(a, b)) return '生'; if (sheng(b, a)) return '被生'; if (ke(a, b)) return '剋'; return '被剋'; }
export const chong = (a, b) => (a - b + 12) % 12 === 6;
export const he = (a, b) => (a + b) % 12 === 1;
// 三刑：只取《增刪卜易》三刑章所列且通行無異說的四組（寅巳、巳申、子卯、丑戌）
const XING = [[2, 5], [5, 8], [0, 3], [1, 10]];
const xing = (a, b) => XING.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

// 八經卦：位元 b1(初)+2*b2+4*b3
export const TRI = {
  7: { n: '乾', img: '天', wx: 3, ig: '甲', ib: [0, 2, 4], og: '壬', ob: [6, 8, 10] },
  3: { n: '兌', img: '澤', wx: 3, ig: '丁', ib: [5, 3, 1], og: '丁', ob: [11, 9, 7] },
  5: { n: '離', img: '火', wx: 1, ig: '己', ib: [3, 1, 11], og: '己', ob: [9, 7, 5] },
  1: { n: '震', img: '雷', wx: 0, ig: '庚', ib: [0, 2, 4], og: '庚', ob: [6, 8, 10] },
  6: { n: '巽', img: '風', wx: 0, ig: '辛', ib: [1, 11, 9], og: '辛', ob: [7, 5, 3] },
  2: { n: '坎', img: '水', wx: 4, ig: '戊', ib: [2, 4, 6], og: '戊', ob: [8, 10, 0] },
  4: { n: '艮', img: '山', wx: 2, ig: '丙', ib: [4, 6, 8], og: '丙', ob: [10, 0, 2] },
  0: { n: '坤', img: '地', wx: 2, ig: '乙', ib: [7, 5, 3], og: '癸', ob: [1, 11, 9] },
};
export const PALACE_ORDER = [7, 2, 4, 1, 6, 5, 0, 3];          // 乾坎艮震巽離坤兌
const GEN = ['本宮', '一世', '二世', '三世', '四世', '五世', '遊魂', '歸魂'];
const MASK = [0, 0b1, 0b11, 0b111, 0b1111, 0b11111, 0b10111, 0b10000];
const SHI = [6, 1, 2, 3, 4, 5, 4, 3];
// 64 卦 code（下卦+8*上卦）→ {palace, gen}
const HEX = {};
PALACE_ORDER.forEach((t, pi) => { const pure = t + 8 * t; MASK.forEach((m, g) => { const c = pure ^ m; HEX[c] = { pi, pt: t, g, name: PALACE_WS[pi][g][0], key: PALACE_WS[pi][g][1] }; }); });
export const hexOf = code => HEX[code];
export const LIUQIN = ['兄弟', '子孫', '妻財', '官鬼', '父母'];   // 依 rel(宮, 爻)：比、生、剋、被剋、被生
const LQ_BY_REL = { '比': '兄弟', '生': '子孫', '剋': '妻財', '被剋': '官鬼', '被生': '父母' };
export const lqOf = (palaceWx, lineWx) => LQ_BY_REL[rel(palaceWx, lineWx)];
export const SHOU = ['青龍', '朱雀', '勾陳', '螣蛇', '白虎', '玄武'];
const SHOU_START = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5];             // 甲乙青龍、丙丁朱雀、戊勾陳、己螣蛇、庚辛白虎、壬癸玄武
export const shouOf = (dayStem, pos) => SHOU[(SHOU_START[dayStem] + pos) % 6];
const YAO_NAME = ['初', '二', '三', '四', '五', '上'];

export function codeOf(bits) { return bits.reduce((s, b, i) => s + (b ? 1 << i : 0), 0); }
export function najia(code) {
  const lo = TRI[code & 7], up = TRI[code >> 3];
  return [0, 1, 2, 3, 4, 5].map(i => i < 3 ? { g: lo.ig, b: lo.ib[i] } : { g: up.og, b: up.ob[i - 3] });
}
export function hexInfo(code) {
  const h = HEX[code], lo = TRI[code & 7], up = TRI[code >> 3], nj = najia(code);
  const pwx = TRI[h.pt].wx, shi = SHI[h.g], ying = (shi + 2) % 6 + 1;
  return { code, ...h, palace: TRI[h.pt].n, palaceWx: pwx, lower: lo.n, upper: up.n, shi, ying, nj,
    liuchong: [0, 1, 2].every(i => chong(nj[i].b, nj[i + 3].b)), liuhe: [0, 1, 2].every(i => he(nj[i].b, nj[i + 3].b)) };
}

/** lines：初爻到上爻六個值（6 老陰、7 少陽、8 少陰、9 老陽）；P：calendar.pillars() */
export function buildChart(lines, P) {
  lines = lines.map(v => [6, 7, 8, 9].includes(+v) ? +v : 7);
  const bits = lines.map(v => v % 2), moving = lines.map(v => v === 6 || v === 9);
  const ben = hexInfo(codeOf(bits)), bianBits = bits.map((b, i) => moving[i] ? 1 - b : b);
  const anyMove = moving.some(x => x), bian = anyMove ? hexInfo(codeOf(bianBits)) : null;
  const kong = xunKong(P.day.idx), pwx = ben.palaceWx;
  const mk = (b, g) => ({ b, g, zhi: ZHI[b], wx: ZWX[b] });
  const L = lines.map((v, i) => {
    const nj = ben.nj[i], o = mk(nj.b, nj.g);
    o.pos = i; o.name = YAO_NAME[i] + '爻'; o.v = v; o.yang = !!bits[i]; o.moving = moving[i];
    o.lq = lqOf(pwx, o.wx); o.shou = shouOf(P.day.stem, i);
    o.shi = ben.shi === i + 1; o.ying = ben.ying === i + 1; o.kong = kong.includes(o.b);
    if (o.moving) { const bn = bian.nj[i]; o.bian = mk(bn.b, bn.g); o.bian.lq = lqOf(pwx, o.bian.wx); o.bian.yang = !bits[i]; o.bian.kong = kong.includes(bn.b); }
    return o;
  });
  // 伏神：本卦缺的六親，取本宮首卦同位之爻
  const have = new Set(L.map(x => x.lq)), pure = hexInfo(ben.pt + 8 * ben.pt), fu = [];
  for (const q of LIUQIN) if (!have.has(q)) pure.nj.forEach((nj, i) => { if (lqOf(pwx, ZWX[nj.b]) === q) { const f = mk(nj.b, nj.g); f.lq = q; f.pos = i; f.kong = kong.includes(nj.b); L[i].fu = f; fu.push(f); } });
  // 變卦的世應、宮（只供顯示）
  return { lines: L, ben, bian, P, kong, xun: xunName(P.day.idx), fu, pure: pure.name, anyMove,
    texts: textsOf(ben, bian, L) };
}
function textsOf(ben, bian, L) {
  const z = ZHOUYI[ben.key], out = { ben: { name: ben.name, gua: z.gua, url: zyUrl(ben.key) }, moving: [], bian: null, yong: null };
  L.forEach((x, i) => { if (x.moving) out.moving.push({ pos: i, label: z.yao[i][0], text: z.yao[i][1] }); });
  if (L.every(x => x.moving) && z.yong) out.yong = { label: z.yong[0], text: z.yong[1] };
  if (bian) { const b = ZHOUYI[bian.key]; out.bian = { name: bian.name, gua: b.gua, url: zyUrl(bian.key) }; }
  return out;
}
const zyUrl = k => 'https://zh.wikisource.org/zh-hant/' + encodeURIComponent('周易/' + k);

// ---------- 旺衰與日月 ----------
const SEASON = b => [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4][b];   // 月支所屬季的「當令五行」：寅卯木、巳午火、申酉金、亥子水、辰戌丑未土
export function wangState(lineWx, monthBr) {
  const s = SEASON(monthBr), r = rel(s, lineWx);
  return { '比': '旺', '生': '相', '被生': '休', '剋': '死', '被剋': '囚' }[r];
}
const WS_IDX = { 2: [0, 2], 3: [1, 2], 4: [3], 5: [4, 5], 6: [5], 7: [6], 8: [7, 8], 9: [7, 8], 10: [9], 11: [10, 11], 0: [10, 11], 1: [12] };
export const monthWangText = b => WS_IDX[b].map(i => WX_MONTH[i]);
const STAGE = { 3: { sheng: 5, wang: 9, mu: 1, jue: 2 }, 0: { sheng: 11, wang: 3, mu: 7, jue: 8 }, 4: { sheng: 8, wang: 0, mu: 4, jue: 5 }, 2: { sheng: 8, wang: 0, mu: 4, jue: 5 }, 1: { sheng: 2, wang: 6, mu: 10, jue: 11 } };
export function stageOf(wx, b) { const s = STAGE[wx]; return b === s.sheng ? '長生' : b === s.wang ? '帝旺' : b === s.mu ? '墓' : b === s.jue ? '絕' : null; }
const JIN = { 11: 0, 2: 3, 5: 6, 8: 9, 1: 4, 4: 7, 7: 10 }, TUI = { 0: 11, 3: 2, 6: 5, 9: 8, 4: 1, 7: 4, 10: 7 };

/** 一爻（或伏神、日月）的狀態 */
export function lineState(x, C, movers) {
  const P = C.P, mb = P.month.br, db = P.day.br, s = {};
  s.wang = wangState(x.wx, mb); s.youqiSeason = s.wang === '旺' || s.wang === '相';
  s.month = x.b === mb ? '臨月建' : chong(x.b, mb) ? '月破' : he(x.b, mb) ? '月合' : { '比': '月比', '被生': '月生', '被剋': '月剋', '生': '泄月', '剋': '剋月' }[rel(x.wx, zwx(mb))];
  s.day = x.b === db ? '臨日辰' : chong(x.b, db) ? '日沖' : he(x.b, db) ? '日合' : { '比': '日比', '被生': '日生', '被剋': '日剋', '生': '泄日', '剋': '剋日' }[rel(x.wx, zwx(db))];
  s.stageDay = stageOf(x.wx, db);
  s.helpRY = ['臨月建', '月比', '月生', '月合'].includes(s.month) || ['臨日辰', '日比', '日生'].includes(s.day);
  s.youqi = s.youqiSeason || s.helpRY;
  s.yuepo = s.month === '月破' && x.b !== db;   // 臨日辰不作破（《增刪卜易》日辰章例：「亥爲月破，臨日建而不破」）
  s.andong = !x.moving && s.day === '日沖' && s.youqi;
  s.ripo = !x.moving && s.day === '日沖' && !s.youqi;
  s.chongsan = !!x.moving && s.day === '日沖';
  // 動爻生剋（他爻之動、暗動）
  s.byMove = (movers || []).filter(m => m !== x && m.pos !== x.pos).map(m => ({ m, r: rel(m.wx, x.wx) })).filter(o => o.r === '生' || o.r === '剋');
  s.kong = !!x.kong;
  if (s.kong) {
    const why = [];
    if (s.youqiSeason) why.push('旺相'); if (x.moving) why.push('動');
    if (['臨日辰', '日生', '日比'].includes(s.day) || s.byMove.some(o => o.r === '生')) why.push('有日建動爻生扶');
    if (x.isFu && s.youqiSeason) why.push('伏而旺相');
    s.kongNot = why; s.kongReal = !why.length || s.yuepo;
    s.kongTrue = (x.wx === 2 && [2, 3].includes(mb)) || (x.wx === 3 && [5, 6].includes(mb)) || (x.wx === 0 && [8, 9].includes(mb)) || (x.wx === 1 && [11, 0, 1].includes(mb));
  }
  if (x.moving && x.bian) {
    const v = x.bian, r = rel(v.wx, x.wx);
    s.hua = { rel: r === '生' ? '回頭生' : r === '剋' ? '回頭剋' : r === '比' ? '比和' : r === '被生' ? '化泄' : '化耗' };
    if (chong(v.b, x.b)) s.hua.chong = true; if (he(v.b, x.b)) s.hua.he = true;
    if (JIN[x.b] === v.b) s.hua.jin = 'zs'; else if (x.b === 10 && v.b === 1) s.hua.jin = 'bz';
    if (TUI[x.b] === v.b) s.hua.tui = 'zs'; else if (x.b === 1 && v.b === 10) s.hua.tui = 'bz';
    s.hua.kong = !!v.kong; s.hua.po = chong(v.b, mb); s.hua.stage = stageOf(x.wx, v.b);
  }
  return s;
}

// ---------- 用神類別 ----------
export const CATS = {
  self: { n: '自身綜合（問自己的事）', ys: '世', q: ['bz_shi_self'] },
  cai: { n: '求財・投資・生意', ys: '妻財', q: ['ys_cai', 'hj_cai'] },
  shiye: { n: '事業・工作・升遷', ys: '官鬼', q: ['ys_guan'] },
  kaoshi: { n: '考試・學業', ys: '官鬼', also: '父母', q: ['ys_guan', 'tongshi', 'hj_ming'] },
  hun: { n: '感情・婚姻', ys: 'hun', q: ['hun_ys', 'hj_hun'] },
  chuxing: { n: '出行・旅途', ys: '世', alsoYing: true, q: ['chuxing', 'hj_xing'] },
  shiwu: { n: '失物・尋物', ys: '妻財', q: ['hj_shi', 'ys_cai'] },
  song: { n: '訴訟・官司・爭執', ys: '世', alsoYing: true, also: '官鬼', q: ['hj_song', 'song_xing', 'ys_guan'] },
  fang: { n: '房屋・文書・契約', ys: '父母', q: ['ys_fumu'] },
  fumu: { n: '父母・長輩', ys: '父母', q: ['ys_fumu_ren'] },
  zinv: { n: '子女・晚輩', ys: '子孫', q: ['ys_zi'] },
  xiongdi: { n: '兄弟姊妹・朋友', ys: '兄弟', q: ['ys_xiong'] },
  taren: { n: '他人・對方（不熟的人）', ys: '應', q: ['bz_ying'] },
};

const posName = x => x.isRY ? x.isRY : (x.isFu ? `伏神（${YAO_NAME[x.pos]}爻下）` : x.name);
const lbl = x => `${x.lq || ''}${x.g || ''}${x.zhi}${WX[x.wx]}`;

/** 解卦：依類別取用神，逐條列出本卦觸發的規則與出處 */
export function analyze(C, opts = {}) {
  const cat = CATS[opts.cat] ? opts.cat : 'self', K = CATS[cat], L = C.lines, P = C.P, R = [];
  const add = (kind, title, detail, q) => R.push({ kind, title, detail, q: q.filter(id => QUOTES[id]) });
  const movers = L.filter(x => x.moving);
  // 暗動之爻也能生剋（《增刪卜易》暗動章）
  const andongs = L.filter(x => !x.moving && lineState(x, C, []).andong);
  const actors = movers.concat(andongs);
  let target = K.ys; if (target === 'hun') target = opts.gender === 'f' ? '官鬼' : '妻財';
  let yong = null, how = '', cands = [];
  if (target === '世' || target === '應') { yong = L.find(x => target === '世' ? x.shi : x.ying); how = `取${target}爻為用神`; }
  else {
    cands = L.filter(x => x.lq === target);
    if (cands.length === 1) { yong = cands[0]; how = `${target}一現，取為用神`; }
    else if (cands.length > 1) {
      const sc = x => { const s = lineState(x, C, actors); return (x.moving ? 16 : 0) + (s.yuepo ? 0 : 8) + (s.kong ? 0 : 4) + (s.youqi ? 2 : 0) + (s.byMove.some(o => o.r === '剋') ? 0 : 1) + (x.shi || x.ying ? 0.5 : 0); };
      yong = cands.slice().sort((a, b) => sc(b) - sc(a) || a.pos - b.pos)[0];
      how = `${target}${cands.length}現（${cands.map(x => x.name).join('、')}），依「兩現」古法取${yong.name}`;
      add('note', '用神兩現', how, ['liangxian']);
    } else {
      const pwx = C.ben.palaceWx, mq = lqOf(pwx, zwx(P.month.br)), dq = lqOf(pwx, zwx(P.day.br));
      if (mq === target || dq === target) {
        const b = mq === target ? P.month.br : P.day.br;
        yong = { b, g: mq === target ? GAN[P.month.stem] : GAN[P.day.stem], zhi: ZHI[b], wx: zwx(b), lq: target, pos: -1, isRY: mq === target ? '月建' : '日辰', kong: C.kong.includes(b) };
        how = `卦中無${target}，以${yong.isRY}${ZHI[b]}${WX[yong.wx]}為用神`;
        add('note', '用神不上卦', how, ['feifu', 'yuejiang_wu']);
      } else {
        const f = C.fu.find(x => x.lq === target);
        if (f) { yong = { ...f, isFu: true }; how = `卦中無${target}，取本宮首卦（${C.pure}）${YAO_NAME[f.pos]}爻${f.g}${f.zhi}為伏神`; add('note', '用神伏藏', how, ['feifu']); }
      }
    }
  }
  if (!yong) { yong = L.find(x => x.shi); how = '無法取得用神，暫以世爻代'; add('note', '用神', how + '（本站處理，來源待核）', []); }
  const ys = lineState(yong, C, actors);
  const Y = { line: yong, how, label: `${posName(yong)} ${lbl(yong)}`, st: ys };
  const ywx = yong.wx, yuanWx = (ywx + 4) % 5, jiWx = (ywx + 3) % 5, chouWx = (ywx + 2) % 5;
  const role = { yuan: { wx: yuanWx, n: '元神' }, ji: { wx: jiWx, n: '忌神' }, chou: { wx: chouWx, n: '仇神' } };
  add('note', '用神・元神・忌神・仇神', `用神：${Y.label}。元神屬${WX[yuanWx]}、忌神屬${WX[jiWx]}、仇神屬${WX[chouWx]}。`, ['yuan_ji']);

  // 1. 月建旺衰
  const wtxt = monthWangText(P.month.br).join('');
  const wDet = `月建${P.month.gz}（${P.jie.name}後），用神${ZHI[yong.b]}${WX[ywx]}於月令為「${ys.wang}」`;
  add(ys.youqiSeason ? 'pos' : 'neg', `旺衰：${ys.wang}`, wDet, ['bz_wx', 'wxdy_xw']);
  R[R.length - 1].extra = wtxt; R[R.length - 1].extraSrc = 'wangxiang_m';
  // 2. 月建關係
  const mMap = { '臨月建': ['pos', '用神臨月建'], '月生': ['pos', '月建生用神'], '月比': ['pos', '月建比扶用神'], '月合': ['pos', '用神逢月合'], '月剋': ['neg', '月建剋用神'], '月破': ['neg', '用神月破'] };
  if (ys.month === '月破' && !ys.yuepo) add('note', '月沖而臨日辰', `用神${ZHI[yong.b]}與月建${ZHI[P.month.br]}相沖，但臨日辰`, ['richen_main']);
  else if (mMap[ys.month]) {
    const [k, t] = mMap[ys.month];
    add(k, t, `月建${ZHI[P.month.br]}${WX[zwx(P.month.br)]}，用神${ZHI[yong.b]}${WX[ywx]}`, ys.month === '月破' ? ['yuejiang_po', 'yuepo_ye', 'bz_po'] : ys.month === '月合' ? ['yuejiang_he'] : ['yuejiang_shuai', 'hj_riyue']);
    if (ys.month === '月破') add('note', '月破應期', `破而逢合（${ZHI[(13 - P.month.br) % 12]}）或塡實（${ZHI[yong.b]}）之日月`, ['yq_po']);
  }
  // 3. 日辰關係
  const dMap = { '臨日辰': ['pos', '用神臨日辰'], '日生': ['pos', '日辰生用神'], '日比': ['pos', '日辰比扶用神'], '日剋': ['neg', '日辰剋用神'] };
  if (dMap[ys.day]) add(dMap[ys.day][0], dMap[ys.day][1], `日辰${P.day.gz}，用神${ZHI[yong.b]}${WX[ywx]}`, ['richen_main', 'hj_riyue']);
  if (ys.day === '日合') add(yong.moving ? 'neg' : 'pos', yong.moving ? '用神動而逢日合（合絆）' : '用神靜而逢日合（合起）', `日辰${ZHI[P.day.br]}與用神${ZHI[yong.b]}相合`, ['liuhe_qi', 'hj_he']);
  if (ys.andong) add('pos', '用神暗動', `用神靜而有氣，逢日辰${ZHI[P.day.br]}沖`, ['richen', 'andong']);
  if (ys.ripo) add('neg', '用神日破', `用神靜而休囚，逢日辰${ZHI[P.day.br]}沖`, ['richen']);
  if (ys.chongsan) add(ys.youqi ? 'note' : 'neg', '用神動而逢日沖', `用神發動，日辰${ZHI[P.day.br]}沖之；用神${ys.youqi ? '有氣' : '休囚'}`, ['dongsan']);
  if (ys.stageDay) add(ys.stageDay === '墓' || ys.stageDay === '絕' ? 'neg' : 'pos', `用神${ys.stageDay}於日辰`, `${WX[ywx]}${ys.stageDay}在${ZHI[P.day.br]}`, ys.stageDay === '墓' ? ['swmj_list', 'bz_swmj', 'hj_mu'] : ['swmj_list', 'bz_swmj']);
  // 4. 旬空
  if (ys.kong) {
    if (ys.kongReal) add('neg', ys.kongTrue ? '用神旬空（眞空）' : '用神旬空', `${C.xun}旬，空${C.kong.map(b => ZHI[b]).join('')}；用神${ZHI[yong.b]}${ys.yuepo ? '空又月破' : '靜而無生扶'}`, ['xunkong', 'bz_kong']);
    else add('note', '用神旬空（不作眞空）', `${C.xun}旬，空${C.kong.map(b => ZHI[b]).join('')}；用神${ys.kongNot.join('、')}`, ['xunkong']);
    add('note', '旬空應期', `出旬、塡實（${ZHI[yong.b]}日）或沖空（${ZHI[(yong.b + 6) % 12]}日）`, ['yq_kong', 'richen_kong']);
  }
  // 5. 動爻生剋用神
  for (const o of ys.byMove) {
    const m = o.m, ms = lineState(m, C, actors), kind = m.moving ? '動' : '暗動';
    if (o.r === '生') {
      const weak = !ms.youqi && (ms.yuepo || (ms.kong && ms.kongReal) || (ms.hua && (ms.hua.rel === '回頭剋' || ms.hua.tui || ms.hua.po)));
      add(weak ? 'note' : 'pos', `元神${kind}生用神${weak ? '（元神無力）' : ''}`, `${m.name} ${lbl(m)}${kind}，生用神${ZHI[yong.b]}${WX[ywx]}`, weak ? ['yuan_wu'] : ['yuan_you', ...(m.moving ? [] : ['andong'])]);
    } else {
      const yuanMove = actors.some(a => a.wx === yuanWx && a !== yong);
      const weak = (!ms.youqi && (ms.yuepo || (ms.kong && ms.kongReal))) || (ms.hua && (ms.hua.rel === '回頭剋' || ms.hua.tui || ms.hua.po));
      if (yuanMove) add('pos', '忌神與元神同動（貪生忘剋）', `忌神${m.name} ${lbl(m)}${kind}，卦中元神屬${WX[yuanWx]}亦動，接續相生`, ['ji_wu']);
      else add(weak ? 'note' : 'neg', `忌神${kind}剋用神${weak ? '（忌神無力）' : ''}`, `${m.name} ${lbl(m)}${kind}，剋用神${ZHI[yong.b]}${WX[ywx]}`, weak ? ['ji_wu'] : ['ji_you']);
    }
  }
  // 仇神發動
  for (const m of actors) if (m.wx === chouWx && m !== yong) add('note', '仇神發動', `${m.name} ${lbl(m)}${m.moving ? '動' : '暗動'}，剋制元神（${WX[yuanWx]}）`, ['yuan_ji']);
  // 6. 用神自身動變
  if (yong.moving && ys.hua) {
    const h = ys.hua, v = yong.bian, vt = `${ZHI[yong.b]}${WX[ywx]}化${v.zhi}${WX[v.wx]}`;
    if (h.rel === '回頭生') add('pos', '用神化回頭生', vt, ['bianyao']);
    if (h.rel === '回頭剋') add('neg', '用神化回頭剋', vt, ['bianyao', 'hj_huitou']);
    if (h.chong) add('neg', '用神化回頭沖', vt, ['chong_hui']);
    if (h.he) add('pos', '用神化合（化扶）', vt, ['liuhe_qi', 'bz_hezhongke']);
    if (h.jin) add('pos', '用神化進神', vt + (h.jin === 'bz' ? '（《卜筮正宗》列為進神，《增刪卜易》未列）' : ''), h.jin === 'bz' ? ['bz_jin'] : ['jin_list', 'jin_yi', 'bz_jin']);
    if (h.tui) add('neg', '用神化退神', vt + (h.tui === 'bz' ? '（《卜筮正宗》列為退神，《增刪卜易》未列）' : ''), h.tui === 'bz' ? ['bz_jin'] : ['tui_list', 'jin_yi', 'bz_jin']);
    if (h.kong) add('neg', ys.kong ? '用神自空化空' : '用神化空', vt, ys.kong ? ['hj_kongkong'] : ['xunkong']);
    if (h.po) add('neg', '用神化破（變爻月破）', vt, ['yuejiang_po']);
    if (h.stage) add(h.stage === '墓' || h.stage === '絕' ? 'neg' : 'pos', `用神化${h.stage === '帝旺' ? '旺' : h.stage}`, vt, ['swmj_hua', 'hj_zhu2']);
  }
  // 7. 伏神：飛神與伏神
  if (yong.isFu) {
    const fei = L[yong.pos], r = rel(fei.wx, ywx);
    add(r === '生' ? 'pos' : r === '剋' ? 'neg' : 'note', `飛神${r === '生' ? '生' : r === '剋' ? '剋' : r === '被生' ? '洩' : r === '被剋' ? '受剋於' : '比'}伏神`, `飛神${fei.name} ${lbl(fei)}，伏神${lbl(yong)}`, ['hj_fu']);
  }
  // 8. 三刑（只在用神休囚時列出，並附野鶴「得驗者少」之說）
  if (!ys.youqi) { const xs = [['月建', P.month.br], ['日辰', P.day.br], ...actors.map(m => [m.name, m.b])].filter(([, b]) => xing(b, yong.b)); if (xs.length) add('note', '用神逢刑', `用神${ZHI[yong.b]}休囚，與${xs.map(([n, b]) => n + ZHI[b]).join('、')}相刑`, ['sanxing']); }
  // 9. 世應
  const shi = L.find(x => x.shi), ying = L.find(x => x.ying), sr = rel(ying.wx, shi.wx);
  const swTxt = chong(shi.b, ying.b) ? '世應相沖' : he(shi.b, ying.b) ? '世應相合' : sr === '生' ? '應生世' : sr === '被生' ? '世生應' : sr === '剋' ? '應剋世' : sr === '被剋' ? '世剋應' : '世應比和';
  add(/沖|剋世/.test(swTxt) ? 'note' : 'note', swTxt, `世${shi.name} ${lbl(shi)}；應${ying.name} ${lbl(ying)}`, ['bz_shi', 'hj_shiying']);
  if (shi.kong && ying.kong) add('neg', '世應俱空', `世${shi.zhi}、應${ying.zhi}皆在旬空`, ['hj_kong']);
  // 10. 卦象：六沖六合、反吟伏吟、遊魂歸魂、內外發動、卦化剋
  const B = C.ben, V = C.bian;
  if (B.liuchong) add('note', '本卦六沖', `${B.name}為六沖卦`, ['liuchong']);
  if (B.liuhe) add('note', '本卦六合', `${B.name}為六合卦`, ['liuhe_def', 'liuhe_ji']);
  if (V && B.liuhe && V.liuchong) add('neg', '六合變六沖', `${B.name}之${V.name}`, ['liuchong', 'bz_heChong']);
  if (V && B.liuchong && V.liuhe) add('pos', '六沖變六合', `${B.name}之${V.name}`, ['bz_heChong']);
  if (V) {
    const FAN = new Set(['7-6', '6-7', '2-5', '5-2', '4-0', '0-4', '1-3', '3-1', '0-6', '6-0']), FU = new Set(['7-1', '1-7']);
    const tri = [['內卦', B.code & 7, V.code & 7], ['外卦', B.code >> 3, V.code >> 3]].filter(([, a, b]) => a !== b);
    const fan = tri.filter(([, a, b]) => FAN.has(a + '-' + b)), fu = tri.filter(([, a, b]) => FU.has(a + '-' + b));
    if (fan.length) add('neg', `${fan.map(t => t[0]).join('、')}反吟`, fan.map(([n, a, b]) => `${n}${TRI[a].n}變${TRI[b].n}`).join('；'), ['bz_fanyin', 'fanfu']);
    if (fu.length) add('neg', `${fu.map(t => t[0]).join('、')}伏吟`, fu.map(([n, a, b]) => `${n}${TRI[a].n}變${TRI[b].n}`).join('；'), ['bz_fuyin', 'fanfu']);
    for (const [n, a, b] of tri) { const r = rel(TRI[b].wx, TRI[a].wx); if (r === '剋') add('neg', `${n}化剋`, `${TRI[a].n}${WX[TRI[a].wx]}變${TRI[b].n}${WX[TRI[b].wx]}，回頭剋`, ['guabian_ke']); }
    if (movers.some(x => x.pos < 3) && movers.some(x => x.pos >= 3)) add('note', '內外競發', `內卦、外卦皆有動爻`, ['hj_kong']);
  }
  if (B.g === 6) add('note', '遊魂卦', `${B.name}為${B.palace}宮遊魂卦`, ['youhun', 'youhun_ye']);
  if (B.g === 7) add('note', '歸魂卦', `${B.name}為${B.palace}宮歸魂卦`, ['guihun', 'youhun_ye']);
  // 類別附帶：考試看父母、訴訟與出行看應
  if (K.also && K.also !== target) {
    const xs = L.filter(x => x.lq === K.also);
    if (xs.length) { const x = xs[0], s = lineState(x, C, actors); add('note', `參看${K.also}`, xs.map(x => `${x.name} ${lbl(x)}`).join('、') + `（月令${s.wang}${s.yuepo ? '、月破' : ''}${s.kong ? '、旬空' : ''}${x.moving ? '、發動' : ''}）`, K.q); }
  }
  if (K.alsoYing) { const s = lineState(ying, C, actors); add('note', '參看應爻', `應${ying.name} ${lbl(ying)}（月令${s.wang}${s.yuepo ? '、月破' : ''}${s.kong ? '、旬空' : ''}${ying.moving ? '、發動' : ''}）`, K.q); }
  add('note', '六獸', '六獸僅列於排盤，不作主斷', ['hj_shensha']);

  // 總結：依《黃金策》「用神有氣無他故…主象徒存更被傷…」
  const hurt = R.filter(r => r.kind === 'neg' && !/旺衰|世應|內外|反吟|伏吟|化剋|六合變/.test(r.title)).length;
  const help = R.filter(r => r.kind === 'pos' && !/旺衰/.test(r.title) && !/六沖變/.test(r.title)).length;
  const youqi = ys.youqi || (yong.moving && ys.hua && (ys.hua.rel === '回頭生' || ys.hua.jin));
  let sum;
  if (youqi && !hurt) sum = { k: 'pos', t: '用神有氣，未見受傷', q: ['hj_youqi'] };
  else if (!youqi && hurt) sum = { k: 'neg', t: '用神無氣，又見受傷', q: ['hj_youqi', 'hj_zhu2'] };
  else if (youqi && hurt) sum = { k: 'mix', t: '用神有氣，但有受傷之處', q: ['hj_jiu'] };
  else if (help) sum = { k: 'mix', t: '用神休囚，但得生扶', q: ['hj_zhu'] };
  else sum = { k: 'mix', t: '用神休囚，未見生扶亦未見重傷', q: ['bz_wx2'] };
  sum.count = { pos: R.filter(r => r.kind === 'pos').length, neg: R.filter(r => r.kind === 'neg').length };
  return { cat, catName: K.n, catQ: K.q, target, yong: Y, rules: R, summary: sum };
}
export { QUOTES, ZHOUYI };

// ---------- 起卦 ----------
/** 三錢：backs＝背面個數（0..3）→ 爻值。一背單（少陽 7）、二背拆（少陰 8）、三背重（老陽 9）、三字交（老陰 6） */
export const coinValue = backs => [6, 7, 8, 9][backs];
export function tossCoins(rand = Math.random) { const c = [0, 1, 2].map(() => rand() < 0.5 ? 1 : 0); return { coins: c, backs: c[0] + c[1] + c[2], v: coinValue(c[0] + c[1] + c[2]) }; }
const XT = [null, 7, 3, 5, 1, 6, 2, 4, 0];   // 先天數 → 經卦位元：乾1兌2離3震4巽5坎6艮7坤8
const mod = (n, m) => { const r = n % m; return r === 0 ? m : r; };
function linesFrom(up, lo, mv) { const code = XT[up] * 8 + XT[lo]; const out = []; for (let i = 0; i < 6; i++) { const y = (code >> i) & 1; out.push(i === mv - 1 ? (y ? 9 : 6) : (y ? 7 : 8)); } return out; }
/** 梅花易數年月日時起例：年支數＋農曆月＋日 → 上卦；再加時支數 → 下卦；總數除六 → 動爻 */
export function timeCast(yearBr, lm, ld, hourBr) {
  const y = yearBr + 1, h = hourBr + 1, s1 = y + lm + ld, s2 = s1 + h;
  return { up: mod(s1, 8), lo: mod(s2, 8), mv: mod(s2, 6), nums: { y, m: lm, d: ld, h, s1, s2 }, lines: linesFrom(mod(s1, 8), mod(s2, 8), mod(s2, 6)) };
}
/** 梅花易數物數占例：數作上卦，時數作下卦，卦數並時數除六取動爻 */
export function numberCast(n, hourBr) {
  n = Math.max(1, Math.floor(Math.abs(+n) || 1)); const h = hourBr + 1;
  return { up: mod(n, 8), lo: mod(h, 8), mv: mod(n + h, 6), nums: { n, h }, lines: linesFrom(mod(n, 8), mod(h, 8), mod(n + h, 6)) };
}
export const XT_NAME = [null, '乾', '兌', '離', '震', '巽', '坎', '艮', '坤'];
