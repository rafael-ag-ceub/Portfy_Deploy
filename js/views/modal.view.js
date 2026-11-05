/* =====================================================================
   PORTFY · js/views/modal.view.js
   Camada: View
   Janela modal para criar e editar itens
   ===================================================================== */

let mk='',mid=0;

/* Campo "Arquivo vinculado" da janela de projeto */
function docSel(cur){
  const opts=D.docs.map(d=>`<option value="${d.id}" ${sameId(d.id,cur)?'selected':''}>${esc(d.title)} · ${KIND_LABEL[d.kind]||d.kind}</option>`).join('');
  return `<div class="fd"><label for="m3">Arquivo vinculado</label>
    <select class="inp" id="m3"><option value="">Nenhum por enquanto</option>${opts?`<optgroup label="Meus arquivos">${opts}</optgroup>`:''}<option value="__new">＋ Criar um novo a partir de um modelo…</option></select>
    <small class="hint">Ao clicar no projeto, você abre direto este arquivo.</small></div>`
}

function openM(k,d,id){
  if(k==='file'){go('mod');toast('Escolha um modelo para criar o seu arquivo.');return}
  mk=k;
  mid=id||0;
  const n=id&&k==='note'&&D.notes.find(x=>sameId(x.id,id)),pj=id&&k==='proj'&&D.projs.find(x=>sameId(x.id,id)),f=(l,i,t='text',v='')=>`<div class="fd">
    <label for="${i}">${l}</label>${t==='ta'?`<textarea class="inp" id="${i}" rows="4">${esc(v)}</textarea>`:`<input class="inp" id="${i}" type="${t}" value="${esc(v)}">`}</div>`, T={task:'Nova tarefa',event:'Novo compromisso',port:'Novo portfólio',name:'Editar nome',proj:pj?'Editar projeto':'Novo projeto',file:'Novo arquivo',note:n?'Editar nota':'Nova nota'}[k], B={task:f('Título','m1')+f('Data','m2','date',d||today()),event:f('Título','m1')+f('Data','m2','date',d||today())+f('Horário','m3','time','09:00'),file:f('Título','m1')+kindSel(),port:f('Título','m1')+f('Descrição','m2'),name:f('Nome completo','m1','text',me.name),proj:f('Título','m1','text',pj?pj.t:'')+f('Descrição','m2','text',pj?pj.desc||'':'')+docSel(pj?pj.doc:''),note:f('Título','m1','text',n?n.t:'')+f('Conteúdo','m2','ta',n?n.c:'')}[k];
  $('#md').innerHTML=`<div class="md-h"><h3>${T}</h3><button type="button" class="ic" onclick="closeM()" aria-label="Fechar">${ico('x')}</button></div>
    <div class="err" id="e-m">
    </div>${B}<div class="ma">
    <button type="button" class="btn" onclick="closeM()">Cancelar</button>
    <button class="btn p" type="submit">Salvar</button>
    </div>`;
  $('#ov').classList.add('on');
  setTimeout(()=>$('#m1').focus(),50)
}

function closeM(){
  $('#ov').classList.remove('on')
}
