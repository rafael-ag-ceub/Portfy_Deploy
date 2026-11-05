/* =====================================================================
   PORTFY · js/services/export.service.js
   Camada: Service
   Baixa um arquivo do Portfy como PDF, PNG, JPG ou HTML, direto no
   computador (sem abrir a janela de impressão).
   - html2canvas e jsPDF são carregados só na primeira exportação.
   - Nos planos Gratuito e Pro entra a marca "Feito com Portfy"; o Premium sai sem marca.
   ===================================================================== */

const Exporter = (() => {
  const LIBS = {
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  };
  const loaded = {};
  const loadScript = (name) => loaded[name] || (loaded[name] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = LIBS[name]; s.onload = res; s.onerror = () => { delete loaded[name]; rej(new Error('Não foi possível carregar o gerador de arquivos. Verifique a internet e tente de novo.')); };
    document.head.appendChild(s);
  }));

  const slug = (t) => (String(t || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'arquivo');

  function save(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /** Elementos do arquivo + marca d'água (quando o plano pede). Não altera o arquivo salvo. */
  function elementsFor(doc, mark) {
    const els = doc.els.filter((e) => !e.hid);
    if (!mark) return els;
    const fs = Math.max(11, Math.round(Math.min(doc.w, doc.h) / 62)), w = Math.round(fs * 11.5), h = Math.round(fs * 1.9);
    const x = doc.w - w - Math.round(fs * 1.2), y = doc.h - h - Math.round(fs * 1.2);
    return [...els,
      { id: 9001, k: 'rect', x, y, w, h, bg: 'rgba(10,26,63,.88)', r: h / 2 },
      { id: 9002, k: 'text', x, y: y + Math.round((h - fs * 1.3) / 2), w, h: Math.round(fs * 1.4), txt: 'Feito com Portfy', fs, color: '#ffffff', fw: 600, ta: 'center', ff: 'Inter' }];
  }

  /** Monta a página em tamanho real fora da tela e tira a "foto" dela. */
  async function canvasOf(doc, { scale = 2, mark = false, type = 'image/png' } = {}) {
    await loadScript('html2canvas');
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-100000px;top:0;width:${doc.w}px;height:${doc.h}px;overflow:hidden;`;
    host.innerHTML = `<div class="exp" style="position:relative;width:${doc.w}px;height:${doc.h}px;background:${doc.bg};overflow:hidden">${elementsFor(doc, mark).map((e) => elHTML(e, false, { cors: true })).join('')}</div>`;
    document.body.appendChild(host);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all([...host.querySelectorAll('img')].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
      const max = 8000, s = Math.max(1, Math.min(scale, max / doc.w, max / doc.h));
      return await window.html2canvas(host.firstChild, { scale: s, useCORS: true, backgroundColor: doc.bg, logging: false, width: doc.w, height: doc.h });
    } finally { host.remove(); }
  }

  const toBlob = (canvas, type, q) => new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Não foi possível gerar a imagem.'))), type, q));

  async function image(doc, fmt, mark) {
    const type = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
    const canvas = await canvasOf(doc, { scale: 2, mark });
    save(await toBlob(canvas, type, 0.95), `${slug(doc.title)}.${fmt}`);
  }

  async function pdf(doc, mark) {
    await loadScript('jspdf');
    const canvas = await canvasOf(doc, { scale: 2.5, mark });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: doc.w >= doc.h ? 'l' : 'p', unit: 'px', format: [doc.w, doc.h], hotfixes: ['px_scaling'], compress: true });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, doc.w, doc.h, undefined, 'FAST');
    pdf.setProperties({ title: doc.title, creator: 'Portfy' });
    pdf.save(`${slug(doc.title)}.pdf`);
  }

  /** Página web independente (um único .html que abre em qualquer navegador). */
  function html(doc, mark) {
    const fonts = 'https://fonts.googleapis.com/css2?' + FONT_FAMILIES.filter((f) => f.g).map((f) => 'family=' + f.g).join('&') + '&display=swap';
    const page = `<div class="pg" style="width:${doc.w}px;height:${doc.h}px;background:${doc.bg}">${elementsFor(doc, mark).map((e) => elHTML(e, false)).join('')}</div>`;
    const out = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.title)}</title><link rel="stylesheet" href="${fonts}"><style>*{box-sizing:border-box}body{margin:0;background:#e9edf6;display:flex;justify-content:center;padding:24px}.pg{position:relative;overflow:hidden;transform-origin:top center;box-shadow:0 10px 40px rgba(10,20,48,.2)}.el{position:absolute;white-space:pre-wrap;word-break:break-word}.el img{width:100%;height:100%;display:block}</style></head><body>${page}<script>(function(){var p=document.querySelector('.pg'),w=${doc.w};function f(){var s=Math.min(1,(innerWidth-48)/w);p.style.transform='scale('+s+')';p.style.marginBottom=(${doc.h}*(s-1))+'px'}f();addEventListener('resize',f)})()<\/script></body></html>`;
    save(new Blob([out], { type: 'text/html;charset=utf-8' }), `${slug(doc.title)}.html`);
  }

  return {
    /** fmt: 'pdf' | 'png' | 'jpg' | 'html'. Devolve quando o download começou. */
    async download(doc, fmt) {
      const mark = typeof D !== 'undefined' && D.plan !== 'C';
      if (fmt === 'pdf') return pdf(doc, mark);
      if (fmt === 'png' || fmt === 'jpg') return image(doc, fmt, mark);
      if (fmt === 'html') return html(doc, mark);
      throw new Error('Formato desconhecido.');
    },
  };
})();

/** Chamado pelos botões "Baixar": mostra o andamento e avisa se algo falhar. */
async function downloadDoc(id, fmt) {
  const doc = id === 'cur' ? Ed.doc : D.docs.find((x) => sameId(x.id, id));
  if (!doc) return;
  closeDlMenus();
  const names = { pdf: 'PDF', png: 'imagem PNG', jpg: 'imagem JPG', html: 'página HTML' };
  toast('Gerando ' + names[fmt] + '…', 20000);
  try {
    await Exporter.download(doc, fmt);
    toast('Download pronto: ' + names[fmt] + '.' + (D.plan !== 'C' ? ' (com a marca Portfy; o Premium exporta sem marca)' : ''), 5000);
  } catch (ex) { console.error(ex); toast(ex.message || 'Não foi possível baixar. Tente de novo.', 6000); }
}
