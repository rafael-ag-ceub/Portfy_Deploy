/* =====================================================================
   PORTFY · js/controllers/library.controller.js
   Camada: Controller
   v9: assistente "Usar modelo", projeto ↔ arquivo vinculado e biblioteca de anexos.
   Funciona nos dois modos: demonstração (arquivos no IndexedDB do navegador)
   e Supabase (bucket "anexos" + tabela anexos).
   ===================================================================== */

/* Projeto que está esperando um arquivo (quem clicou em "Criar a partir de um modelo" no projeto) */
let linkProj = '';
let WZ = null;          // estado do assistente de modelos
let LIBM = 'manage';    // 'manage' (Projetos/Modelos) ou 'editor' (inserir no arquivo aberto)

/* ------------------------- Projeto ↔ arquivo ------------------------- */
/** Clique no projeto: abre direto o arquivo vinculado. */
function openProject(id) {
  const p = D.projs.find((x) => sameId(x.id, id));
  if (!p) return;
  const d = p.doc && D.docs.find((x) => sameId(x.id, p.doc));
  if (d) return openEditor(d.id);
  toast('Este projeto ainda não tem um arquivo vinculado.');
  openM('proj', 0, id);
}

/** Projeto salvo com "Criar a partir de um modelo": leva a pessoa à lista de modelos. */
function pickModelFor(projId) {
  linkProj = String(projId);
  filt = 'todos';
  go('mod');
  toast('Escolha um modelo: o arquivo será vinculado ao projeto.', 4200);
}
function cancelLink() { linkProj = ''; render(); }

/* ------------------------- Assistente "Usar modelo" ------------------------- */
function useM(id) {
  const m = modelById(id);
  if (!m) return;
  if (m.plan === 'B' && D.plan === 'A') {
    toast('Este modelo faz parte do plano Pro. Veja os planos.');
    return;
  }
  const p = D.prof || {};
  WZ = { id, accent: m.accent, fp: m.fp, title: m.name, heading: '', sub: '', proj: linkProj, fill: !!(p.role || p.bio || p.phone || (p.skills || []).length) };
  edLoadFonts();
  $('#wz-md').innerHTML = wzHTML();
  $('#wz-ov').classList.add('on');
  wzPreview();
}
function closeWz() { $('#wz-ov').classList.remove('on'); WZ = null; }

let wzRaf = 0;
function wzSet(k, v, opts) {
  if (!WZ) return;
  WZ[k] = v;
  if (opts) $('#wz-opts').innerHTML = wzOptsHTML();
  cancelAnimationFrame(wzRaf);
  wzRaf = requestAnimationFrame(wzPreview);
}
function wzPreview() {
  if (!WZ) return;
  const doc = buildDoc(WZ.id, { accent: WZ.accent, fp: WZ.fp, fill: WZ.fill, nameOnly: true, heading: WZ.heading || undefined, sub: WZ.sub || undefined });
  $('#wz-pv').innerHTML = thumb(doc);
  fitThumbs();
}

async function wzCreate() {
  const w = WZ, m = w && modelById(w.id);
  if (!m) return;
  const btn = $('#wz-go');
  btn.disabled = true;
  const title = (w.title || '').trim() || m.name;
  try {
    let doc = mkDoc(m.kind, title, { model: m.id, accent: w.accent, fp: w.fp, fill: w.fill, heading: w.heading || undefined, sub: w.sub || undefined });
    if (USE_SUPABASE) doc = await PortfyAPI.documents.add(doc);
    D.docs.unshift(doc);
    const p = w.proj && D.projs.find((x) => sameId(x.id, w.proj));
    if (p) {
      p.doc = doc.id;
      if (USE_SUPABASE) await PortfyAPI.projects.update(p.id, p);
      lg('Arquivo vinculado ao projeto: ' + p.t);
    }
    lg('Novo arquivo criado: ' + title);
    if (!USE_SUPABASE) save();
    linkProj = '';
    closeWz();
    render();
    openEditor(doc.id);
  } catch (ex) {
    btn.disabled = false;
    fail(ex);
  }
}

/* ------------------------- Armazenamento local (modo demonstração) ------------------------- */
const FileStore = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('Seu navegador não permite guardar arquivos aqui.'));
    const r = indexedDB.open('portfy-anexos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('blobs');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(new Error('Não foi possível abrir o armazenamento do navegador.'));
  }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('blobs', mode), rq = fn(t.objectStore('blobs'));
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = () => rej(new Error('Não foi possível guardar o arquivo.'));
    });
  };
  return { put: (id, b) => run('readwrite', (s) => s.put(b, String(id))), get: (id) => run('readonly', (s) => s.get(String(id))), del: (id) => run('readwrite', (s) => s.delete(String(id))) };
})();
const FURL = {};   // id -> endereço temporário (blob:) usado só para mostrar o anexo no modo demonstração
const fileUrl = (f) => (USE_SUPABASE ? f.url : FURL[f.id] || '');
async function warmFileUrls() {
  for (const f of D.files) {
    if (FURL[f.id]) continue;
    try { const b = await FileStore.get(f.id); if (b) FURL[f.id] = URL.createObjectURL(b); } catch (_) { /* sem armazenamento */ }
  }
}

/* ------------------------- Biblioteca de anexos ------------------------- */
async function openLib(mode) {
  if (!D) return;
  D.files = D.files || [];
  LIBM = mode || 'manage';
  if (!USE_SUPABASE) await warmFileUrls();
  refreshLib();
  $('#lib-ov').classList.add('on');
  bindLib();
}
function closeLib() { $('#lib-ov').classList.remove('on'); }
function refreshLib() { $('#lib-md').innerHTML = libHTML(LIBM); }

let libBound = false;
function bindLib() {
  if (libBound) return;
  libBound = true;
  const md = $('#lib-md');
  md.addEventListener('change', (e) => { if (e.target.id === 'lib-file') { libUpload([...e.target.files]); e.target.value = ''; } });
  md.addEventListener('dragover', (e) => { const z = e.target.closest('#lib-drop'); if (z) { e.preventDefault(); z.classList.add('over'); } });
  md.addEventListener('dragleave', (e) => { const z = e.target.closest('#lib-drop'); if (z) z.classList.remove('over'); });
  md.addEventListener('drop', (e) => { const z = e.target.closest('#lib-drop'); if (z) { e.preventDefault(); z.classList.remove('over'); libUpload([...e.dataTransfer.files]); } });
  md.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'lib-drop') { e.preventDefault(); $('#lib-file').click(); } });
}

async function libUpload(files) {
  if (!files.length) return;
  const [maxN, maxMB] = FILE_LIMIT[D.plan] || FILE_LIMIT.A;
  let added = 0;
  for (const f of files) {
    if (!FILE_TYPES.includes(f.type)) { toast(`"${f.name}": use PNG, JPG, WEBP, GIF ou PDF.`); continue; }
    if (f.size > maxMB * 1e6) { toast(`"${f.name}" passa de ${maxMB} MB (limite do seu plano).`, 4200); continue; }
    if (D.files.length >= maxN) { toast(`Limite de ${maxN} anexos do seu plano atingido. Exclua algum ou veja os planos.`, 4200); break; }
    try {
      toast('Enviando ' + f.name + '…', 15000);
      let item;
      if (USE_SUPABASE) item = await PortfyAPI.files.add(f);
      else {
        item = { id: Date.now() + Math.floor(Math.random() * 1e4), name: f.name, type: f.type, size: f.size, ts: Date.now() };
        await FileStore.put(item.id, f);
        FURL[item.id] = URL.createObjectURL(f);
      }
      D.files.unshift(item);
      added++;
      lg('Anexo adicionado: ' + f.name);
    } catch (ex) { fail(ex); }
  }
  if (added) { if (!USE_SUPABASE) save(); toast(added === 1 ? 'Anexo adicionado.' : added + ' anexos adicionados.'); }
  refreshLib();
}

async function libDel(id, btn) {
  if (!btn.dataset.sure) {
    btn.dataset.sure = 1; btn.classList.add('sure'); btn.textContent = 'Excluir?';
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.sure; btn.classList.remove('sure'); btn.innerHTML = ico('trash'); } }, 3000);
    return;
  }
  const f = D.files.find((x) => sameId(x.id, id));
  if (!f) return;
  try {
    if (USE_SUPABASE) {
      const used = D.docs.find((d) => (d.els || []).some((e) => e.src === f.url));
      if (used) return toast(`Este anexo está sendo usado em "${used.title}". Remova a imagem de lá antes de excluir.`, 4800);
      await PortfyAPI.files.remove(f);
    } else {
      await FileStore.del(f.id);
      if (FURL[f.id]) { URL.revokeObjectURL(FURL[f.id]); delete FURL[f.id]; }
    }
    D.files = D.files.filter((x) => !sameId(x.id, id));
    if (!USE_SUPABASE) save();
    refreshLib();
    toast('Anexo excluído.');
  } catch (ex) { fail(ex); }
}

/* ------------------------- Inserir no editor ------------------------- */
/* blobToDataURL vem de profile.controller.js */
const imgSize = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth || 400, h: i.naturalHeight || 300 }); i.onerror = () => rej(new Error('Não foi possível abrir a imagem.')); i.src = src; });

/** Devolve { src, w, h } de um anexo de imagem, pronto para virar elemento do editor. */
async function attachImage(f) {
  if (USE_SUPABASE) return { src: f.url, ...(await imgSize(f.url)) };
  const blob = await FileStore.get(f.id);
  if (!blob) throw new Error('Não encontrei esse arquivo neste navegador.');
  if (f.type === 'image/gif') { const src = await blobToDataURL(blob); return { src, ...(await imgSize(src)) }; }
  const r = await edShrink(new File([blob], f.name, { type: f.type }));
  return { src: await blobToDataURL(r.blob), w: r.w, h: r.h };
}

function edPlaceImg(src, w0, h0, big) {
  const d = Ed.doc, maxW = big ? Math.min(d.w - 80, 560) : Math.min(d.w - 40, 420), maxH = d.h - 60;
  let w = Math.min(maxW, w0), h = Math.round(w * h0 / w0);
  if (h > maxH) { h = maxH; w = Math.round(h * w0 / h0); }
  const id = edNextId();
  d.els.push({ id, k: 'img', x: Math.round((d.w - w) / 2), y: Math.round((d.h - h) / 2), w, h, src, fit: big ? 'contain' : 'cover' });
  edSelect(id); edSave();
}

function edPlacePdfCard(f) {
  const d = Ed.doc, W = 360, H = 104, x = Math.round((d.w - W) / 2), y = Math.round((d.h - H) / 2);
  const nm = f.name.length > 30 ? f.name.slice(0, 28) + '…' : f.name;
  const base = edNextId();
  const mk = (i, o) => ({ id: base + i, ...o });
  d.els.push(
    mk(0, { k: 'rect', x, y, w: W, h: H, bg: '#ffffff', r: 14, bd: 1, bdc: '#DCE3F2', sh: 1, name: 'Cartão do PDF' }),
    mk(1, { k: 'rect', x: x + 18, y: y + 20, w: 64, h: 64, bg: '#E5484D', r: 12, name: 'Selo PDF' }),
    mk(2, { k: 'text', x: x + 18, y: y + 38, w: 64, h: 28, txt: 'PDF', fs: 22, color: '#ffffff', fw: 800, ta: 'center', ff: 'Inter' }),
    mk(3, { k: 'text', x: x + 98, y: y + 24, w: W - 114, h: 28, txt: nm, fs: 17, color: '#0F172A', fw: 700, ta: 'left', ff: 'Inter' }),
    mk(4, { k: 'text', x: x + 98, y: y + 56, w: W - 114, h: 24, txt: 'Documento PDF · ' + fmtSize(f.size), fs: 14, color: '#64748B', fw: 400, ta: 'left', ff: 'Inter' }),
  );
  edSelect(base); edSave();
}

let pdfJsP = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfJsP) return pdfJsP;
  const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  pdfJsP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = base + 'pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => { pdfJsP = null; rej(new Error('Não consegui carregar o leitor de PDF. Use "Inserir cartão" ou tente de novo com internet.')); };
    document.head.appendChild(s);
  });
  return pdfJsP;
}

async function pdfPageImage(f, n) {
  const lib = await loadPdfJs();
  const buf = USE_SUPABASE ? await (await fetch(f.url)).arrayBuffer() : await (await FileStore.get(f.id)).arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;
  if (n > pdf.numPages) throw new Error(`Esse PDF tem só ${pdf.numPages} página${pdf.numPages > 1 ? 's' : ''}.`);
  const page = await pdf.getPage(n), v0 = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: Math.min(2, 1400 / Math.max(v0.width, v0.height)) });
  const c = document.createElement('canvas');
  c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
  const src = USE_SUPABASE ? await PortfyAPI.uploadImage(new File([blob], 'pdf-pagina.jpg', { type: 'image/jpeg' })) : await blobToDataURL(blob);
  return { src, w: c.width, h: c.height };
}

async function libInsert(id, mode) {
  if (!Ed.doc) return;
  const f = D.files.find((x) => sameId(x.id, id));
  if (!f) return;
  try {
    toast('Preparando…', 20000);
    if (f.type !== 'application/pdf') { const r = await attachImage(f); edPlaceImg(r.src, r.w, r.h, false); }
    else if (mode === 'card') edPlacePdfCard(f);
    else { const n = Math.max(1, Math.floor(+($('#pg-' + id) || {}).value || 1)); const r = await pdfPageImage(f, n); edPlaceImg(r.src, r.w, r.h, true); }
    closeLib();
    toast('Adicionado ao arquivo.');
  } catch (ex) { toast(ex.message || 'Não foi possível inserir o anexo.', 4200); }
}
