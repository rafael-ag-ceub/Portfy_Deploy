/* =====================================================================
   PORTFY · js/views/editor.view.js
   Camada: View
   Desenho do editor: página, painel de propriedades, camadas, zoom e menu "Baixar".
   ===================================================================== */

/* ---------- Menu "Baixar" (usado no editor e nos cartões de Meus arquivos) ---------- */
function dlMenu(id) {
  const o = (f, t, d) => `<button type="button" onclick="downloadDoc('${id}','${f}')"><b>${t}</b><small>${d}</small></button>`;
  return `<div class="dlm" role="menu">${o('pdf', 'PDF', 'Para enviar e imprimir')}${o('png', 'Imagem PNG', 'Alta qualidade')}${o('jpg', 'Imagem JPG', 'Arquivo mais leve')}${o('html', 'Página HTML', 'Abre em qualquer navegador')}
    ${D.plan !== 'C' ? `<p class="dlm-n">${ico('star')}<span>Com a marca “Feito com Portfy”. <a href="#" onclick="closeEditor();go('plan');return false">Premium</a> baixa sem marca.</span></p>` : ''}</div>`;
}
function dlButton(id, primary) {
  return `<button type="button" class="btn sm ${primary ? 'p' : ''}" onclick="toggleDl(event,this)" aria-haspopup="true">${ico('download')}Baixar${ico('chev-down', 'cv')}</button>${dlMenu(id)}`;
}
function toggleDl(ev, btn) {
  ev.stopPropagation();
  const w = btn.parentElement, open = w.classList.contains('open');
  closeDlMenus();
  if (!open) w.classList.add('open');
}
function closeDlMenus() { $$('.dl.open').forEach((x) => x.classList.remove('open')); }
document.addEventListener('click', closeDlMenus);

/* ---------- Página ---------- */
function edFit() {
  const d = Ed.doc, st = $('#ed-stage');
  if (!d) return;
  const fit = Math.min((st.clientWidth - 56) / d.w, (st.clientHeight - 56) / d.h, 1);
  Ed.fitScale = Math.max(0.05, fit);
  Ed.scale = Ed.zoom ? Ed.zoom : Ed.fitScale;
  const w = $('#ed-wrap');
  w.style.width = d.w * Ed.scale + 'px';
  w.style.height = d.h * Ed.scale + 'px';
  $('#ed-zoom').textContent = Math.round(Ed.scale * 100) + '%';
  edRender();
}

function edRender() {
  const d = Ed.doc, pg = $('#ed-page');
  pg.style.cssText = `width:${d.w}px;height:${d.h}px;background:${d.bg};transform:scale(${Ed.scale})`;
  pg.classList.toggle('grid', !!Ed.grid);
  pg.innerHTML = d.els.map((e) => elHTML(e, true)).join('') + '<div class="gd gv" id="gd-v"></div><div class="gd gh" id="gd-h"></div>';
  document.documentElement.style.setProperty('--hs', (1 / Ed.scale).toFixed(3));   // alças com tamanho constante na tela
  edBtns();
  if (Ed.tab === 'layers') edLayers();
}

/** Estado dos botões desfazer / refazer. */
function edBtns() {
  $('#ed-undo').disabled = Ed.hi <= 0;
  $('#ed-redo').disabled = Ed.hi >= Ed.hist.length - 1;
}

/* ---------- Painel da direita ---------- */
const edLayerName = (e) => e.name || (e.k === 'text' ? (e.txt || 'Texto').split('\n')[0].slice(0, 22) : LAYER_NAMES[e.k] || 'Elemento');
const edLayerIcon = (e) => ({ text: 'type', rect: 'square', ellipse: 'circle', img: 'image', tri: 'triangle', star: 'star', diamond: 'diamond', arrow: 'arrow-right' }[e.k] || 'square');

function edLayers() {
  const L = [...Ed.doc.els].reverse();
  $('#ed-panel').innerHTML = `<div class="ly">${L.map((e, i) => `<div class="ly-r ${Ed.sel === e.id ? 'on' : ''} ${e.hid ? 'off' : ''}" onclick="edSelect(${e.id})">
      ${ico(edLayerIcon(e))}<span>${esc(edLayerName(e))}</span>
      <button type="button" title="Mostrar ou ocultar" onclick="event.stopPropagation();edToggle(${e.id},'hid')">${ico(e.hid ? 'eye-off' : 'eye')}</button>
      <button type="button" title="Travar ou destravar" onclick="event.stopPropagation();edToggle(${e.id},'lock')">${ico(e.lock ? 'lock' : 'unlock')}</button>
      <button type="button" title="Subir" ${i === 0 ? 'disabled' : ''} onclick="event.stopPropagation();edMoveLayer(${e.id},1)">${ico('chev-up')}</button>
      <button type="button" title="Descer" ${i === L.length - 1 ? 'disabled' : ''} onclick="event.stopPropagation();edMoveLayer(${e.id},-1)">${ico('chev-down')}</button>
    </div>`).join('') || '<p class="hint">A página ainda está vazia. Adicione texto, formas ou imagens no menu da esquerda.</p>'}</div>`;
}

function edProps() {
  $$('.ed-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === Ed.tab));
  if (Ed.tab === 'layers') return edLayers();
  const e = edEl(), d = Ed.doc;
  const row = (l, c) => `<div class="pr"><label>${l}</label>${c}</div>`;
  const num = (k, v, min, max, step = 1) => `<input class="inp" type="number" min="${min}" max="${max}" step="${step}" value="${Math.round(v * 100) / 100}" onchange="edSet('${k}',+this.value,true)">`;
  const col = (k, v) => `<input type="color" value="${hex(v)}" oninput="edSet('${k}',this.value)" onchange="edSet('${k}',this.value,true)">`;
  const tog = (k, on, label, title) => `<button type="button" class="${on ? 'on' : ''}" title="${title || label}" onclick="edSet('${k}',${on ? 'false' : 'true'},true)">${label}</button>`;
  let h = '';
  if (!e) {
    const sizes = PAGE_SIZES.map((s) => `<option value="${s[1]}x${s[2]}" ${d.w === s[1] && d.h === s[2] ? 'selected' : ''}>${s[0]} · ${s[1]}×${s[2]}</option>`).join('');
    h = `<h4>Página</h4>`
      + row('Cor de fundo', `<input type="color" value="${hex(d.bg)}" oninput="Ed.doc.bg=this.value;edRender();edSave()">`)
      + row('Tamanho', `<select class="inp" onchange="edPageSize(this.value)">${sizes}${PAGE_SIZES.some((s) => d.w === s[1] && d.h === s[2]) ? '' : `<option selected>Personalizado · ${d.w}×${d.h}</option>`}</select>`)
      + `<div class="pr2">${row('Largura', `<input class="inp" type="number" min="200" max="4000" value="${d.w}" onchange="edPageSize(this.value+'x${d.h}')">`)}${row('Altura', `<input class="inp" type="number" min="200" max="4000" value="${d.h}" onchange="edPageSize('${d.w}x'+this.value)">`)}</div>`
      + row('Ajudas', `<div class="seg">${tog2('Grade', Ed.grid, 'edGrid()')}${tog2('Alinhamento magnético', Ed.snap !== false, 'edSnapToggle()')}</div>`)
      + '<p class="hint">Clique em um elemento para editar. Dois cliques em um texto para digitar. Arraste os cantos para redimensionar e a bolinha de cima para girar. Ctrl+Z desfaz, Ctrl+D duplica.</p>';
  } else {
    h = `<h4>${esc(LAYER_NAMES[e.k] || 'Elemento')}</h4>`;
    if (e.k === 'text') {
      h += row('Fonte', `<select class="inp" onchange="edSet('ff',this.value,true)">${FONTS.map((f) => `<option ${f === e.ff ? 'selected' : ''}>${f}</option>`).join('')}</select>`)
        + `<div class="pr2">${row('Tamanho', num('fs', e.fs, 6, 400))}${row('Cor', col('color', e.color))}</div>`
        + row('Estilo', `<div class="seg">${tog('fw', e.fw >= 700, '<b>B</b>', 'Negrito').replace(`edSet('fw',false`, `edSet('fw',400`).replace(`edSet('fw',true`, `edSet('fw',700`)}${tog('it', e.it, '<i>I</i>', 'Itálico')}${tog('ul', e.ul, '<u>U</u>', 'Sublinhado')}${tog('up', e.up, 'Aa', 'Maiúsculas')}</div>`)
        + row('Alinhamento', `<div class="seg">${['left', 'center', 'right'].map((a) => `<button type="button" class="${e.ta === a ? 'on' : ''}" onclick="edSet('ta','${a}',true)">${{ left: 'Esq.', center: 'Centro', right: 'Dir.' }[a]}</button>`).join('')}</div>`)
        + `<div class="pr2">${row('Entrelinha', num('lh', e.lh || 1.3, 0.8, 3, 0.1))}${row('Espaço entre letras', num('ls', e.ls || 0, -5, 40, 0.5))}</div>`
        + row('Destaque (fundo)', `<div class="seg">${e.bg ? col('bg', e.bg) : ''}<button type="button" onclick="edSet('bg',${e.bg ? 'null' : "'#FDE68A'"},true)">${e.bg ? 'Remover' : 'Adicionar'}</button></div>`)
        + `<div class="seg"><button type="button" onclick="edFitText()">Ajustar altura ao texto</button></div>`;
    }
    if (e.k === 'rect' || e.k === 'ellipse' || POLY[e.k]) {
      h += row('Preenchimento', col('bg', e.bg));
      if (e.k === 'rect') h += row('Arredondamento', `<input type="range" min="0" max="200" value="${e.r || 0}" oninput="edSet('r',+this.value)">`);
    }
    if (e.k === 'img') {
      h += row('Ajuste da imagem', `<div class="seg">${[['cover', 'Preencher'], ['contain', 'Conter'], ['fill', 'Esticar']].map(([v, t]) => `<button type="button" class="${(e.fit || 'cover') === v ? 'on' : ''}" onclick="edSet('fit','${v}',true)">${t}</button>`).join('')}</div>`)
        + row('Arredondamento', `<input type="range" min="0" max="300" value="${e.r || 0}" oninput="edSet('r',+this.value)">`)
        + `<div class="seg"><button type="button" onclick="$('#ed-file-rep').click()">Trocar imagem</button></div>`;
    }
    h += '<h5>Posição e tamanho</h5>'
      + `<div class="pr2">${row('X', num('x', e.x, -5000, 9000))}${row('Y', num('y', e.y, -5000, 9000))}${row('Largura', num('w', e.w, 4, 6000))}${row('Altura', num('h', e.h, 4, 6000))}</div>`
      + row('Rotação (graus)', `<input type="range" min="-180" max="180" value="${e.rot || 0}" oninput="edSet('rot',+this.value)" onchange="edProps()">`)
      + row('Alinhar à página', `<div class="seg al">${[['l', 'align-left', 'Esquerda'], ['c', 'align-center', 'Centro'], ['r', 'align-right', 'Direita'], ['t', 'align-top', 'Topo'], ['m', 'align-middle', 'Meio'], ['b', 'align-bottom', 'Base']].map(([a, i, t]) => `<button type="button" title="${t}" aria-label="${t}" onclick="edAlign('${a}')">${ico(i)}</button>`).join('')}</div>`)
      + '<h5>Aparência</h5>'
      + row('Transparência', `<input type="range" min="5" max="100" value="${e.op == null ? 100 : e.op}" oninput="edSet('op',+this.value)">`)
      + (e.k === 'text' || e.k === 'img' || e.k === 'rect' || e.k === 'ellipse' || POLY[e.k]
        ? row('Sombra e borda', `<div class="seg">${tog('sh', e.sh, 'Sombra')}</div><div class="pr2" style="margin-top:8px">${num('bd', e.bd || 0, 0, 60)}${col('bdc', e.bdc || '#0A1A3F')}</div><small class="hint">Espessura da borda em px (0 = sem borda)</small>`) : '')
      + `<div class="seg col"><div class="seg"><button type="button" onclick="edDup()">Duplicar</button><button type="button" onclick="edCopy()">Copiar</button></div>
        <div class="seg"><button type="button" onclick="edOrder(1)">Trazer p/ frente</button><button type="button" onclick="edOrder(-1)">Enviar p/ trás</button></div>
        <div class="seg"><button type="button" onclick="edToggle(${e.id},'lock')">${e.lock ? 'Destravar' : 'Travar'}</button><button type="button" class="dg" onclick="edDel()">Excluir</button></div></div>`;
  }
  $('#ed-panel').innerHTML = h;
}

const tog2 = (l, on, fn) => `<button type="button" class="${on ? 'on' : ''}" onclick="${fn}">${l}</button>`;

/** Cor em #rrggbb para o campo de cor (aceita rgba/curtas). */
function hex(c) {
  c = String(c || '#000000');
  if (/^#[0-9a-f]{6}/i.test(c)) return c.slice(0, 7);
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
  const m = c.match(/\d+/g);
  return m && m.length >= 3 ? '#' + m.slice(0, 3).map((x) => (+x).toString(16).padStart(2, '0')).join('') : '#000000';
}
