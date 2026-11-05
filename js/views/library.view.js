/* =====================================================================
   PORTFY · js/views/library.view.js
   Camada: View
   Telas novas da v9: assistente "Usar modelo" e biblioteca de Anexos
   (a lógica fica em js/controllers/library.controller.js)
   ===================================================================== */

const fmtSize = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');

/* ------------------------- Assistente "Usar modelo" ------------------------- */
const HEAD_B = { pfCriativo: 1, pfMinimal: 1, pfFoto: 1, prCase: 1, prOnePager: 1 };
const SUB_B = { pfCriativo: 1, pfMinimal: 1, pfFoto: 1 };

function wzOptsHTML() {
  const w = WZ;
  const sw = PALETTES.map(([n, c]) => `<button type="button" class="sw ${w.accent.toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="--c:${c}" title="${n}" aria-label="Cor ${n}" onclick="wzSet('accent','${c}',1)"></button>`).join('')
    + `<label class="sw cust ${PALETTES.some((p) => p[1].toLowerCase() === w.accent.toLowerCase()) ? '' : 'on'}" title="Escolher outra cor" style="--c:${w.accent}"><input type="color" value="${w.accent}" oninput="wzSet('accent',this.value,1)" aria-label="Escolher outra cor"></label>`;
  const fp = Object.entries(FONT_PAIRS).map(([k, v]) => `<button type="button" class="fpc ${w.fp === k ? 'on' : ''}" onclick="wzSet('fp','${k}',1)"><b style="font-family:'${v[1]}'">Aa</b><span>${v[0]}</span></button>`).join('');
  return `<div class="fd"><label>Cor de destaque</label><div class="sws">${sw}</div></div>
    <div class="fd"><label>Fonte</label><div class="fps">${fp}</div></div>`;
}

function wzHTML() {
  const w = WZ, m = modelById(w.id), prof = D.prof || {};
  const hasProf = !!(prof.role || prof.bio || prof.phone || (prof.skills || []).length);
  const projOpts = '<option value="">Não vincular</option>' + D.projs.map((p) => `<option value="${p.id}" ${sameId(p.id, w.proj) ? 'selected' : ''}>${esc(p.t)}</option>`).join('');
  return `<div class="md-h"><div><small class="ph-s">${esc(CAT_LABEL[m.cat] || '')} · ${m.fmt}</small><h3>${esc(m.name)}</h3></div><button type="button" class="ic" onclick="closeWz()" aria-label="Fechar">${ico('x')}</button></div>
  <div class="wz">
    <div class="wz-pv" id="wz-pv"></div>
    <div class="wz-f">
      <div class="fd"><label for="wz-t">Nome do arquivo</label><input class="inp" id="wz-t" value="${esc(w.title)}" maxlength="120" oninput="WZ.title=this.value"></div>
      <div id="wz-opts">${wzOptsHTML()}</div>
      ${HEAD_B[m.b] ? `<div class="fd"><label for="wz-h">Título em destaque <small>(opcional)</small></label><input class="inp" id="wz-h" value="${esc(w.heading)}" maxlength="60" placeholder="${m.kind === 'projeto' ? 'Nome do projeto' : esc(me.name)}" oninput="wzSet('heading',this.value)"></div>` : ''}
      ${SUB_B[m.b] ? `<div class="fd"><label for="wz-s">Subtítulo <small>(opcional)</small></label><input class="inp" id="wz-s" value="${esc(w.sub)}" maxlength="80" placeholder="Designer · Desenvolvedor · Criador" oninput="wzSet('sub',this.value)"></div>` : ''}
      <label class="wz-ck"><input type="checkbox" ${w.fill ? 'checked' : ''} onchange="wzSet('fill',this.checked)"><span><b>Preencher com meus dados</b><small>${hasProf ? 'Usa profissão, contato, resumo e habilidades do seu perfil.' : 'Seu perfil ainda está vazio. Complete-o em Meu perfil para ganhar tempo.'}</small></span></label>
      ${D.projs.length ? `<div class="fd"><label for="wz-p">Vincular a um projeto</label><select class="inp" id="wz-p" onchange="WZ.proj=this.value">${projOpts}</select></div>` : ''}
    </div>
  </div>
  <div class="ma"><button type="button" class="btn" onclick="closeWz()">Cancelar</button><button type="button" class="btn p" id="wz-go" onclick="wzCreate()">${ico('pencil')}Criar e editar</button></div>`;
}

/* ------------------------- Biblioteca de anexos ------------------------- */
function libItemHTML(f, mode) {
  const pdf = f.type === 'application/pdf', url = fileUrl(f);
  const pv = pdf ? `<div class="lib-pdf">${ico('pdf')}<b>PDF</b></div>` : `<img src="${esc(url)}" alt="" loading="lazy">`;
  const acts = mode === 'editor'
    ? (pdf
      ? `<div class="lib-pg"><label>Página <input type="number" min="1" value="1" id="pg-${f.id}"></label></div>
         <button type="button" class="btn sm p" onclick="libInsert('${f.id}','page')">${ico('image')}Inserir página</button>
         <button type="button" class="btn sm" onclick="libInsert('${f.id}','card')">Inserir cartão</button>`
      : `<button type="button" class="btn sm p" onclick="libInsert('${f.id}')">${ico('plus')}Inserir no arquivo</button>`)
    : `<a class="btn sm" href="${esc(url)}" target="_blank" rel="noopener">${ico('eye')}Ver</a>`;
  return `<div class="lib-it" data-id="${f.id}">
    <div class="lib-pv">${pv}</div>
    <div class="lib-in"><b title="${esc(f.name)}">${esc(f.name)}</b><small>${pdf ? 'PDF' : 'Imagem'} · ${fmtSize(f.size)}</small></div>
    <div class="lib-ac">${acts}<button type="button" class="btn sm dg" onclick="libDel('${f.id}',this)" aria-label="Excluir ${esc(f.name)}" title="Excluir">${ico('trash')}</button></div>
  </div>`;
}

function libHTML(mode) {
  const [maxN, maxMB] = FILE_LIMIT[D.plan] || FILE_LIMIT.A, n = D.files.length;
  const intro = mode === 'editor'
    ? 'Escolha um anexo para colocar no arquivo que você está editando.'
    : 'Guarde aqui imagens e PDFs que serão úteis: uma foto para o currículo, um certificado, a capa de um projeto, um logo. No editor, clique em <b>Anexos</b> para colocá-los no currículo, no projeto ou nos slides.';
  const off = D.filesOff ? `<div class="lib-off">${ico('bulb')}<p>A biblioteca de anexos ainda não foi ativada no banco de dados. Rode a migração <b>20261105000000_projetos_anexos_modelos.sql</b> (passo a passo em docs/ATUALIZAR-BANCO-V9.md).</p></div>` : '';
  return `<div class="md-h"><div><small class="ph-s">${n} de ${maxN} arquivos</small><h3>Anexos</h3></div><button type="button" class="ic" onclick="closeLib()" aria-label="Fechar">${ico('x')}</button></div>
  <p class="lib-intro">${intro}</p>${off}
  <label class="lib-drop" id="lib-drop" tabindex="0">
    ${ico('upload')}<b>Arraste arquivos aqui ou clique para escolher</b>
    <small>PNG, JPG, WEBP, GIF ou PDF · até ${maxMB} MB cada · plano ${PL[D.plan] ? PL[D.plan][0] : 'Gratuito'}</small>
    <input type="file" id="lib-file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" multiple hidden ${D.filesOff ? 'disabled' : ''}>
  </label>
  <div class="lib-grid" id="lib-grid">${n ? D.files.map((f) => libItemHTML(f, mode)).join('') : `<div class="emp">${ico('image')}<p>Nenhum anexo ainda. Envie sua primeira imagem ou PDF.</p></div>`}</div>
  <div class="ma"><button type="button" class="btn p" onclick="closeLib()">Concluir</button></div>`;
}
