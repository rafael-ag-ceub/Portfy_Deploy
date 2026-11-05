/* =====================================================================
   PORTFY · js/models/document.model.js
   Camada: Model
   Regras dos arquivos (currículo, portfólio, projeto) e seus modelos de layout
   ===================================================================== */

/* --- Criação de arquivos: cada arquivo nasce de um modelo (veja templates.model.js) --- */
const DEFAULT_TITLE = { curriculo: 'Meu currículo', portfolio: 'Meu portfólio', projeto: 'Novo projeto' };

/** Cria um arquivo novo. o = { model, accent, fp, fill, name, heading, sub } */
function mkDoc(kind, title, o = {}) {
  const id = o.model || DEFAULT_MODEL[kind] || 'em-branco-a4';
  const lay = buildDoc(id, { name: (typeof me !== 'undefined' && me && me.name) || '', nameOnly: true, ...o });
  return { id: Date.now() + Math.floor(Math.random() * 1e4), kind, title, upd: Date.now(), ...lay };
}

function migrateDocs() {
  D.files = D.files || [];   // biblioteca de anexos (v9)
  if (D.seeded) return;
  D.docs = D.docs || [];
  (D.ports || []).forEach(p => D.docs.push(mkDoc('portfolio', p.t, {heading: p.t, sub: p.desc, accent: '#2F5BEA'})));
  D.ports = [];
  if (!D.docs.some(d => d.kind === 'curriculo')) D.docs.unshift(mkDoc('curriculo', 'Meu currículo'));
  D.seeded = 1;
  save();
}
