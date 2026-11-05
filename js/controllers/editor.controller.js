/* =====================================================================
   PORTFY · js/controllers/editor.controller.js
   Camada: Controller
   Lógica do editor: adicionar, mover, redimensionar, girar, alinhar, camadas,
   desfazer/refazer, copiar/colar, zoom, salvar e atalhos.
   ===================================================================== */

const Ed = { doc: null, sel: null, scale: 1, zoom: 0, fitScale: 1, op: null, timer: null, hist: [], hi: -1, tab: 'props', grid: false, snap: true, clip: null };

const edEl = () => Ed.doc && Ed.doc.els.find((e) => e.id === Ed.sel);
const edNextId = () => Math.max(0, ...Ed.doc.els.map((e) => e.id)) + 1;
const edClone = (o) => JSON.parse(JSON.stringify(o));

/* ---------------- Abrir e fechar ---------------- */
let fontsLink = false;
function edLoadFonts() {   // as fontes extras vêm do Google Fonts, só quando o editor é aberto
  if (fontsLink) return;
  fontsLink = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?' + FONT_FAMILIES.filter((f) => f.g).map((f) => 'family=' + f.g).join('&') + '&display=swap';
  document.head.appendChild(l);
}

function openEditor(id) {
  const d = D.docs.find((x) => sameId(x.id, id));
  if (!d) return;
  edLoadFonts();
  Ed.doc = d; Ed.sel = null; Ed.zoom = 0; Ed.tab = 'props';
  d.els.forEach((e) => { if (e.ff === undefined && e.k === 'text') e.ff = 'Inter'; });
  Ed.hist = [edSnap()]; Ed.hi = 0;
  $('#ed-title').value = d.title;
  $('#ed-st').textContent = 'Salvo';
  $('#ed-dl').innerHTML = dlButton('cur', true);
  $('#ed').classList.add('on');
  document.body.style.overflow = 'hidden';
  edFit();
  edProps();
}

function closeEditor() {
  clearTimeout(Ed.timer);
  edFlush();
  $('#ed').classList.remove('on');
  document.body.style.overflow = '';
  closeDlMenus();
  Ed.doc = null; Ed.sel = null;
  render();
}

/* ---------------- Histórico (desfazer / refazer) ---------------- */
const edSnap = () => JSON.stringify({ w: Ed.doc.w, h: Ed.doc.h, bg: Ed.doc.bg, els: Ed.doc.els });

function edPush() {   // guarda um ponto de retorno se algo mudou
  const s = edSnap();
  if (s === Ed.hist[Ed.hi]) return;
  Ed.hist = Ed.hist.slice(0, Ed.hi + 1);
  Ed.hist.push(s);
  if (Ed.hist.length > 80) Ed.hist.shift();
  Ed.hi = Ed.hist.length - 1;
  edBtns();
}

function edGo(n) {
  clearTimeout(Ed.timer); edPush();                  // não perde o que estava pendente
  const i = Ed.hi + n;
  if (i < 0 || i >= Ed.hist.length) return;
  Ed.hi = i;
  Object.assign(Ed.doc, JSON.parse(Ed.hist[i]));
  if (!edEl()) Ed.sel = null;
  edFit(); edProps(); edFlush();
}
const edUndo = () => edGo(-1);
const edRedo = () => edGo(1);

/* ---------------- Selecionar e alterar ---------------- */
function edSelect(id) {
  Ed.sel = id;
  edRender();
  edProps();
}

/** Altera uma propriedade do elemento escolhido. props = redesenhar também o painel. */
function edSet(k, v, props) {
  const e = edEl();
  if (!e || e.lock) return;
  if (v === null) delete e[k]; else e[k] = v;
  if (k === 'fw' && v === 400) e.fw = 400;
  edRender();
  if (props) edProps();
  edSave();
}

function edToggle(id, k) {
  const e = Ed.doc.els.find((x) => x.id === id);
  if (!e) return;
  e[k] = !e[k];
  if (!e[k]) delete e[k];
  if (k === 'hid' && e.hid && Ed.sel === id) Ed.sel = null;
  edRender(); edProps(); edSave();
}

/* ---------------- Adicionar elementos ---------------- */
const bgIsDark = (c) => { const h = hex(c), n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 140; };

const TEXT_PRESETS = {
  title: { txt: 'Título', fs: 64, fw: 700, ff: 'Bricolage Grotesque', w: 560, h: 90 },
  subtitle: { txt: 'Subtítulo', fs: 32, fw: 600, ff: 'Inter', w: 480, h: 50 },
  text: { txt: 'Escreva seu texto aqui', fs: 20, fw: 400, ff: 'Inter', w: 420, h: 60 },
  caption: { txt: 'Legenda ou detalhe', fs: 14, fw: 500, ff: 'Inter', w: 280, h: 28 },
};

function edAdd(k, preset) {
  const id = edNextId(), d = Ed.doc, dark = bgIsDark(d.bg);
  const mk = (w, h, extra) => ({ id, x: Math.round(d.w / 2 - w / 2), y: Math.round(d.h / 2 - h / 2), w, h, ...extra });
  let el;
  if (k === 'text') {
    const t = TEXT_PRESETS[preset || 'text'];
    el = mk(t.w, t.h, { k: 'text', txt: t.txt, fs: t.fs, color: dark ? '#ffffff' : '#0A1A3F', fw: t.fw, ta: 'left', ff: t.ff });
  } else if (k === 'rect') el = mk(260, 150, { k: 'rect', bg: '#2F5BEA', r: 14 });
  else if (k === 'ellipse') el = mk(170, 170, { k: 'ellipse', bg: '#2EC4B6' });
  else if (k === 'line') el = mk(320, 4, { k: 'rect', bg: dark ? '#ffffff' : '#0A1A3F', r: 2, name: 'Linha' });
  else el = mk(170, 170, { k, bg: { tri: '#F59E0B', star: '#FACC15', diamond: '#8B5CF6', arrow: '#EF4444' }[k] || '#2F5BEA' });
  d.els.push(el);
  edSelect(id);
  edSave();
  closeEdMenu();
}

/** Reduz a imagem (máx. 1600 px) antes de guardar: o arquivo fica leve e cabe no limite do banco. */
function edShrink(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      const png = file.type === 'image/png' || file.type === 'image/webp';
      c.toBlob((b) => (b ? resolve({ blob: b, w, h, png }) : reject(new Error('Não foi possível ler a imagem.'))), png ? 'image/png' : 'image/jpeg', 0.88);
    };
    img.onerror = () => reject(new Error('Esse arquivo não parece ser uma imagem.'));
    img.src = url;
  });
}

async function edImage(inp, replace) {
  const f = inp.files && inp.files[0];
  inp.value = '';
  if (!f) return;
  if (!/^image\//.test(f.type)) return toast('Escolha um arquivo de imagem.');
  if (f.size > 15e6) return toast('A imagem é grande demais (máximo 15 MB).');
  try {
    toast('Preparando a imagem…', 8000);
    const r = await edShrink(f);
    const ext = r.png ? 'png' : 'jpg';
    const src = USE_SUPABASE
      ? await PortfyAPI.uploadImage(new File([r.blob], 'imagem.' + ext, { type: r.blob.type }))   // vai para o Storage; no elemento fica só a URL
      : await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(r.blob); });
    const e = replace && edEl();
    if (e && e.k === 'img') { e.src = src; edRender(); edProps(); edSave(); return toast('Imagem trocada.'); }
    const w = Math.min(420, r.w, Ed.doc.w - 40), h = Math.round(w * r.h / r.w), id = edNextId();
    Ed.doc.els.push({ id, k: 'img', x: Math.round((Ed.doc.w - w) / 2), y: Math.round((Ed.doc.h - h) / 2), w, h, src, fit: 'cover' });
    edSelect(id); edSave(); toast('Imagem adicionada.');
  } catch (ex) { toast(ex.message || 'Não foi possível adicionar a imagem.'); }
}

/* ---------------- Ações sobre o elemento ---------------- */
function edDup() {
  const e = edEl();
  if (!e) return;
  const c = { ...edClone(e), id: edNextId(), x: e.x + 24, y: e.y + 24 };
  delete c.lock;
  Ed.doc.els.push(c);
  edSelect(c.id); edSave();
}
function edCopy() { const e = edEl(); if (e) { Ed.clip = edClone(e); toast('Copiado. Use Ctrl+V para colar.'); } }
function edPaste() {
  if (!Ed.clip) return;
  const c = { ...edClone(Ed.clip), id: edNextId() };
  c.x += 24; c.y += 24; Ed.clip.x += 24; Ed.clip.y += 24;
  Ed.doc.els.push(c);
  edSelect(c.id); edSave();
}
function edDel() {
  const e = edEl();
  if (!e || e.lock) return;
  Ed.doc.els = Ed.doc.els.filter((x) => x.id !== Ed.sel);
  Ed.sel = null;
  edRender(); edProps(); edSave();
}
function edOrder(n) {
  const a = Ed.doc.els, i = a.findIndex((e) => e.id === Ed.sel), j = i + n;
  if (i < 0 || j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]];
  edRender(); edSave();
}
function edMoveLayer(id, n) { Ed.sel = id; edOrder(n); edProps(); }
function edAlign(a) {
  const e = edEl(), d = Ed.doc;
  if (!e || e.lock) return;
  if (a === 'l') e.x = 0; if (a === 'c') e.x = Math.round((d.w - e.w) / 2); if (a === 'r') e.x = d.w - e.w;
  if (a === 't') e.y = 0; if (a === 'm') e.y = Math.round((d.h - e.h) / 2); if (a === 'b') e.y = d.h - e.h;
  edRender(); edProps(); edSave();
}
function edFitText() {
  const e = edEl(), n = e && $(`#ed-page [data-id="${e.id}"]`);
  if (!n) return;
  n.style.height = 'auto';
  e.h = Math.max(10, Math.ceil(n.scrollHeight));
  edRender(); edProps(); edSave();
}
function edPageSize(v) {
  const [w, h] = String(v).split('x').map((n) => Math.max(200, Math.min(4000, parseInt(n) || 0)));
  if (!w || !h) return;
  Ed.doc.w = w; Ed.doc.h = h;
  edFit(); edProps(); edSave();
}
const edGrid = () => { Ed.grid = !Ed.grid; edRender(); edProps(); };
const edSnapToggle = () => { Ed.snap = Ed.snap === false; edProps(); };

/* ---------------- Zoom ---------------- */
function edZoom(dir) {
  if (dir === 0) Ed.zoom = 0;
  else Ed.zoom = Math.min(3, Math.max(0.1, +((Ed.zoom || Ed.scale) * (dir > 0 ? 1.15 : 1 / 1.15)).toFixed(3)));
  edFit();
}
function closeEdMenu() { $$('.ed-pop').forEach((x) => x.classList.remove('on')); }
function edPop(id, ev) { ev.stopPropagation(); const el = $('#' + id), on = el.classList.contains('on'); closeEdMenu(); if (!on) el.classList.add('on'); }
document.addEventListener('click', closeEdMenu);

/* ---------------- Salvar ---------------- */
function edSave() {
  $('#ed-st').textContent = 'Salvando…';
  clearTimeout(Ed.timer);
  Ed.timer = setTimeout(() => { edPush(); edFlush(); }, 450);
}

function edFlush() {
  if (USE_SUPABASE) return edFlushRemote();
  if (!Ed.doc) return;
  Ed.doc.upd = Date.now();
  save();
  $('#ed-st').textContent = 'Salvo';
}

/* ---------------- Mouse / toque: mover, redimensionar, girar ---------------- */
const rad = (d) => (d * Math.PI) / 180;

/** Ímã: gruda nas bordas e no centro da página e dos outros elementos. Devolve o ajuste e as guias. */
function edSnapMove(e, nx, ny) {
  const d = Ed.doc, T = 6 / Ed.scale, gx = [0, d.w / 2, d.w], gy = [0, d.h / 2, d.h];
  d.els.forEach((o) => { if (o.id !== e.id && !o.hid) { gx.push(o.x, o.x + o.w / 2, o.x + o.w); gy.push(o.y, o.y + o.h / 2, o.y + o.h); } });
  const best = (pos, size, lines) => {
    let r = { off: 0, line: null, dist: T + 1 };
    [0, size / 2, size].forEach((a) => lines.forEach((l) => { const dd = Math.abs(pos + a - l); if (dd < r.dist) r = { off: l - (pos + a), line: l, dist: dd }; }));
    return r.line === null ? { off: 0, line: null } : r;
  };
  const sx = best(nx, e.w, gx), sy = best(ny, e.h, gy);
  return { x: nx + sx.off, y: ny + sy.off, gx: sx.line, gy: sy.line };
}

function edGuides(gx, gy) {
  const v = $('#ed-page #gd-v'), h = $('#ed-page #gd-h');
  if (!v || !h) return;
  v.style.display = gx === null || gx === undefined ? 'none' : 'block'; if (gx != null) v.style.left = gx + 'px';
  h.style.display = gy === null || gy === undefined ? 'none' : 'block'; if (gy != null) h.style.top = gy + 'px';
}

$('#ed-page').addEventListener('pointerdown', (ev) => {
  if (ev.target.isContentEditable) return;
  const t = ev.target.closest('.el');
  if (!t) { if (Ed.sel !== null) { Ed.sel = null; edRender(); edProps(); } return; }
  const id = +t.dataset.id, e = Ed.doc.els.find((x) => x.id === id);
  if (Ed.sel !== id) edSelect(id);
  if (e.lock) return;
  const h = ev.target.dataset.h;
  Ed.op = { type: h ? (h === 'rot' ? 'rot' : 'size') : 'move', h, x: ev.clientX, y: ev.clientY, ox: e.x, oy: e.y, ow: e.w, oh: e.h, or: e.rot || 0, moved: false };
  ev.preventDefault();
});

document.addEventListener('pointermove', (ev) => {
  const o = Ed.op;
  if (!o) return;
  const e = edEl();
  if (!e) return;
  const dx = (ev.clientX - o.x) / Ed.scale, dy = (ev.clientY - o.y) / Ed.scale;
  if (!o.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
  o.moved = true;
  if (o.type === 'move') {
    let nx = o.ox + dx, ny = o.oy + dy, gx = null, gy = null;
    if (Ed.snap !== false && !ev.altKey) { const s = edSnapMove(e, nx, ny); nx = s.x; ny = s.y; gx = s.gx; gy = s.gy; }
    e.x = Math.round(nx); e.y = Math.round(ny);
    edGuides(gx, gy);
  } else if (o.type === 'rot') {
    const n = $(`#ed-page [data-id="${e.id}"]`).getBoundingClientRect(), cx = n.left + n.width / 2, cy = n.top + n.height / 2;
    let a = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
    if (a > 180) a -= 360;
    a = ev.shiftKey || Math.abs(a % 45) < 4 || Math.abs(a % 45) > 41 ? Math.round(a / 45) * 45 : Math.round(a);
    e.rot = a || 0;
  } else {                     // redimensionar pelo canto, mesmo com o elemento girado
    const th = rad(o.or), c = Math.cos(th), s = Math.sin(th);
    const ldx = dx * c + dy * s, ldy = -dx * s + dy * c;       // movimento no eixo do próprio elemento
    const west = o.h.includes('w'), north = o.h.includes('n');
    let w = Math.max(10, o.ow + (west ? -ldx : ldx)), h = Math.max(10, o.oh + (north ? -ldy : ldy));
    if (e.k === 'img' || ev.shiftKey) { const r = o.ow / o.oh; h = w / r; }
    const cxl = (west ? -1 : 1) * (w - o.ow) / 2, cyl = (north ? -1 : 1) * (h - o.oh) / 2;
    const ccx = o.ox + o.ow / 2 + cxl * c - cyl * s, ccy = o.oy + o.oh / 2 + cxl * s + cyl * c;
    e.w = Math.round(w); e.h = Math.round(h); e.x = Math.round(ccx - w / 2); e.y = Math.round(ccy - h / 2);
  }
  const n = $(`#ed-page [data-id="${e.id}"]`);
  n.style.left = e.x + 'px'; n.style.top = e.y + 'px'; n.style.width = e.w + 'px'; n.style.height = e.h + 'px';
  n.style.transform = e.rot ? `rotate(${e.rot}deg)` : '';
});

document.addEventListener('pointerup', () => {
  if (!Ed.op) return;
  const moved = Ed.op.moved;
  Ed.op = null; edGuides(null, null);
  if (moved) { edSave(); if (!document.activeElement.closest || !document.activeElement.closest('#ed-panel')) edProps(); }
});

function edEditText(t) {
  const e = Ed.doc.els.find((x) => x.id === +t.dataset.id);
  if (!e || e.k !== 'text' || e.lock) return;
  t.querySelectorAll('i').forEach((i) => i.remove());   // tira as alças enquanto digita
  t.contentEditable = 'plaintext-only';
  if (t.contentEditable !== 'plaintext-only') t.contentEditable = 'true';
  t.focus();
  getSelection().selectAllChildren(t);
  t.addEventListener('blur', () => {
    e.txt = t.innerText.replace(/\n$/, '');
    t.contentEditable = 'false';
    edSave(); edRender(); edProps();
  }, { once: true });
}
$('#ed-page').addEventListener('dblclick', (ev) => { const t = ev.target.closest('.el'); if (t) edEditText(t); });

/* ---------------- Teclado ---------------- */
document.addEventListener('keydown', (ev) => {
  if (!Ed.doc) return;
  const typing = ev.target.closest('input,select,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]');
  const mod = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
  if (mod && k === 's') { ev.preventDefault(); clearTimeout(Ed.timer); edPush(); edFlush(); return toast('Salvo.'); }
  if (typing) { if (k === 'escape' && ev.target.isContentEditable) ev.target.blur(); return; }
  if (mod && k === 'z') { ev.preventDefault(); return ev.shiftKey ? edRedo() : edUndo(); }
  if (mod && k === 'y') { ev.preventDefault(); return edRedo(); }
  if (mod && k === 'd') { ev.preventDefault(); return edDup(); }
  if (mod && k === 'c') { return edCopy(); }
  if (mod && k === 'v' && Ed.clip) { ev.preventDefault(); return edPaste(); }
  if (mod && (k === '0')) { ev.preventDefault(); return edZoom(0); }
  if (mod && (k === '=' || k === '+')) { ev.preventDefault(); return edZoom(1); }
  if (mod && k === '-') { ev.preventDefault(); return edZoom(-1); }
  if (k === 'escape') { Ed.sel = null; edRender(); edProps(); return; }
  const e = edEl();
  if (!e || e.lock) return;
  const s = ev.shiftKey ? 10 : 1, m = { arrowleft: ['x', -s], arrowright: ['x', s], arrowup: ['y', -s], arrowdown: ['y', s] }[k];
  if (m) { e[m[0]] += m[1]; edRender(); edSave(); ev.preventDefault(); }
  else if (k === 'delete' || k === 'backspace') { edDel(); ev.preventDefault(); }
  else if (k === 'enter' && e.k === 'text') { ev.preventDefault(); edEditText($(`#ed-page [data-id="${e.id}"]`)); }
});

/* Colar uma imagem da área de transferência (Ctrl+V) adiciona ao arquivo */
document.addEventListener('paste', (ev) => {
  if (!Ed.doc || ev.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]')) return;
  const f = [...(ev.clipboardData?.files || [])].find((x) => /^image\//.test(x.type));
  if (f) { ev.preventDefault(); edImage({ files: [f], value: '' }); }
});

/* Ctrl + roda do mouse faz zoom */
$('#ed-stage').addEventListener('wheel', (ev) => { if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); edZoom(ev.deltaY < 0 ? 1 : -1); } }, { passive: false });

addEventListener('resize', () => { if (Ed.doc) edFit(); });
