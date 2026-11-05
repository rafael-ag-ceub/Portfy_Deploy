/* =====================================================================
   PORTFY · js/controllers/data.controller.js
   Camada: Controller
   Ações sobre tarefas, projetos, arquivos, plano, perfil e janelas modais
   ===================================================================== */

function tog(id){
  if(USE_SUPABASE)return togRemote(id);
  const t=D.tasks.find(x=>sameId(x.id,id));
  t.done=t.done?0:1;
  if(t.done)lg('Tarefa concluída: '+t.t);
  save();
  render()
}

function del(k,id){
  if(USE_SUPABASE)return delRemote(k,id);
  D[k]=D[k].filter(x=>!sameId(x.id,id));
  save();
  render();
  toast('Item excluído.')
}

function setPlan(k){
  openCheckout(k)   // a compra passa pelo checkout (billing.controller.js)
}

function okM(e){
  if(USE_SUPABASE)return okMRemote(e);
  e.preventDefault();
  const v=$('#m1').value.trim(),a=$('#m2')?.value||'',b=$('#m3')?.value||'',id=Date.now();
  if(!v){
    const x=$('#e-m');
    x.textContent='Preencha o título para salvar.';
    x.classList.add('on');
    return false
  }
  if(mk==='file'){
    const doc=mkDoc(a||'portfolio',v);
    D.docs.unshift(doc);
    lg('Novo arquivo criado: '+v);
    save();
    closeM();
    render();
    openEditor(doc.id);
    return false
  }
  if(mk==='task')D.tasks.push({id,t:v,d:a||today(),done:0});
  if(mk==='event'){
    D.events.push({id,t:v,d:a||today(),h:b||'09:00'});
    lg('Compromisso agendado: '+v)
  }
  if(mk==='port'){
    D.ports.push({id,t:v,desc:a});
    lg('Você publicou um novo portfólio: '+v)
  }
  if(mk==='proj'){
    const pr=D.projs.find(x=>sameId(x.id,mid)),doc=b==='__new'?null:(b||null);
    if(mid&&pr){Object.assign(pr,{t:v,desc:a,doc});lg('Projeto atualizado: '+v)}
    else{D.projs.push({id,t:v,desc:a,doc});lg('Novo projeto criado: '+v)}
    if(b==='__new'){save();closeM();pickModelFor(mid||id);return false}
  }
  if(mk==='note'){
    if(mid){
      const n=D.notes.find(x=>sameId(x.id,mid));
      n.t=v;
      n.c=a
    }else{
      D.notes.unshift({id,t:v,c:a});
      lg('Nova nota: '+v)
    }
  }
  if(mk==='name'){
    const l=users();
    l.find(x=>x.email===me.email).name=v;
    ls.set('pf_users',l);
    me.name=D.name=v;
    syncUser()
  }
  save();
  closeM();
  render();
  toast('Salvo com sucesso.');
  return false
}

function dupDoc(id) {
  if(USE_SUPABASE)return dupDocRemote(id);
  const c = JSON.parse(JSON.stringify(D.docs.find(x => sameId(x.id, id))));
  c.id = Date.now();
  c.title += ' (cópia)';
  c.upd = Date.now();
  D.docs.unshift(c);
  save();
  render();
  toast('Arquivo duplicado.');
}

function delDoc(id) {
  if(USE_SUPABASE)return delDocRemote(id);
  D.docs = D.docs.filter(x => !sameId(x.id, id));
  D.projs.forEach(p => { if (sameId(p.doc, id)) p.doc = null; });   // projetos que apontavam para ele ficam sem arquivo
  save();
  render();
  toast('Arquivo excluído.');
}

