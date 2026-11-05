/* =====================================================================
   PORTFY · js/views/pages.view.js
   Camada: View
   Desenho de todas as páginas do aplicativo.
   render() olha a variável "page" e monta o HTML da página aberta.
   As classes CSS usadas aqui estão em css/app.css.
   ===================================================================== */

function render() {
  const q = ($('#q').value || '').toLowerCase(), td = today();
  const pend = D.tasks.filter((t) => !t.done), due = pend.filter((t) => t.d <= td);
  const up = D.events.filter((e) => e.d >= td).sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h));
  const ach = [D.tasks.some((t) => t.done), D.docs.length, D.notes.length, D.projs.length, D.events.length, D.prof.bio, D.plan !== 'A', D.diag].filter(Boolean).length;

  /* pedaços reaproveitados */
  const ph = (t, b = '', sub = '') => `<div class="ph"><div>${sub ? `<small class="ph-s">${sub}</small>` : ''}<h2>${t}</h2></div><div class="ph-a">${b}</div></div>`;
  const emp = (t, ic = 'sparkles') => `<div class="emp">${ico(ic)}<p>${t}</p></div>`;
  const btn = (t, k) => `<button class="btn p" onclick="openM('${k}')">${ico('plus')}${t}</button>`;
  const logs = (n) => D.log.slice(0, n).map((l) => `<div class="ai2"><i>${ico('check')}</i><span>${esc(l.t)}</span><small>${ago(l.ts)}</small></div>`).join('') || emp('Suas ações vão aparecer aqui.', 'clock');
  let h = '';

  /* ---------- Início ---------- */
  if (page === 'dash') {
    const first = esc(me.name.split(' ')[0]);
    const tl = [...D.tasks].sort((a, b) => a.d.localeCompare(b.d)).slice(0, 6).map((t) => `<div class="tk ${t.done ? 'd' : ''}">
        <button class="ck ${t.done ? 'd' : ''}" onclick="tog('${t.id}')" aria-label="Concluir tarefa">${t.done ? ico('check') : ''}</button>
        <span>${esc(t.t)}</span>
        <small class="${!t.done && t.d < td ? 'late' : ''}">${lbl(t.d)}</small>
        <button class="x" onclick="del('tasks','${t.id}')" aria-label="Excluir tarefa">${ico('x')}</button>
      </div>`).join('') || emp('Nenhuma tarefa ainda. Adicione a primeira.', 'check-circle');
    const stats = [
      ['folder', 'Projetos', D.projs.length, 's1'],
      ['briefcase', 'Portfólios criados', D.docs.filter((d) => d.kind === 'portfolio').length, 's2'],
      ['check-circle', 'Tarefas para hoje', due.length, 's3'],
      ['trophy', 'Conquistas (de 8)', ach, 's4'],
    ].map((s) => `<div class="cd st ${s[3]}"><div class="si">${ico(s[0])}</div><div><b>${s[2]}</b><span>${s[1]}</span></div></div>`).join('');
    const ev = up.slice(0, 4).map((e) => `<div class="ev"><div class="evd"><b>${e.d.slice(8)}</b><small>${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+e.d.slice(5, 7) - 1]}</small></div><div><span>${esc(e.t)}</span><small>${lbl(e.d)} · ${e.h}</small></div></div>`).join('') || emp('Nenhum compromisso marcado.', 'calendar');
    h = `${ph(`${greet()}, ${first}`, `<button class="btn" onclick="openM('task')">${ico('plus')}Nova tarefa</button><button class="btn p" onclick="go('mod')">${ico('layout')}Criar arquivo</button>`, longDate())}
      <div class="bn">
        <div class="bn-i">${ico('sparkles')}</div>
        <div><b>Converse com o Agente de IA</b><span>Tire dúvidas sobre currículo, portfólio e entrevistas. Você pode pausar a resposta quando quiser.</span></div>
        <button class="btn" onclick="go('ia')">Abrir o Agente${ico('arrow-right')}</button>
      </div>
      <div class="gr g4">${stats}</div>
      <div class="gr dash">
        <div class="col">
          <div class="cd cr">
            <div>
              <span class="chip">${ico('bulb')}Seja criativo</span>
              <h3>Monte seu portfólio em minutos</h3>
              <p>Use nossos modelos prontos para criar currículos e portfólios que se destacam no mercado de trabalho.</p>
              <button class="btn p" onclick="go('mod')">Explorar modelos${ico('arrow-right')}</button>
            </div>
            <div class="lap">${LAPTOP}</div>
          </div>
          <div class="cd">
            <h3>Próximas tarefas<span class="h3-a"><button class="btn sm" onclick="openM('task')">${ico('plus')}Nova</button><a class="lk" href="#" onclick="go('age');return false">Ver agenda</a></span></h3>${tl}
          </div>
          <div class="cd"><h3>Atividade recente</h3>${logs(4)}</div>
        </div>
        <div class="col">
          <div class="cd plan-c">
            <span class="chip">Plano ${PL[D.plan][0]}</span>
            <h3>${D.plan === 'A' ? 'Desbloqueie mais recursos' : 'Obrigado por apoiar o Portfy'}</h3>
            <p>${D.plan === 'A' ? 'Modelos Pro, Agente de IA ampliado e exportação sem marca.' : 'Seu plano já inclui os recursos avançados.'}</p>
            <button class="btn p bl" onclick="go('plan')">Ver planos</button>
          </div>
          <div class="cd"><h3>Próximos compromissos<span class="h3-a"><a class="lk" href="#" onclick="go('cal');return false">Calendário</a></span></h3>${ev}</div>
          <div class="cd quick"><h3>Atalhos</h3>
            <button onclick="openM('note')">${ico('note')}Nova nota</button>
            <button onclick="openM('proj')">${ico('folder')}Novo projeto</button>
            <button onclick="openM('event')">${ico('calendar')}Compromisso</button>
            <button onclick="go('ia')">${ico('sparkles')}Perguntar à IA</button>
          </div>
          <div class="tip">${ico('bulb')}<div><h4>Dica do dia</h4><p>Mantenha seu portfólio sempre atualizado e destaque suas melhores conquistas com números.</p></div></div>
        </div>
      </div>`;
  }

  /* ---------- Projetos ---------- */
  if (page === 'proj') {
    const attachBtn = `<button class="btn" onclick="openLib('manage')" title="Imagens e PDFs para usar nos seus arquivos">${ico('paperclip')}Anexos</button>`;
    h = ph('Projetos', attachBtn + btn('Novo projeto', 'proj'), 'Cada projeto abre o arquivo vinculado')
      + `<div class="gr g3">${D.projs.filter((p) => (p.t + (p.desc || '')).toLowerCase().includes(q)).map((p) => {
        const d = p.doc && D.docs.find((x) => sameId(x.id, p.doc));
        return `<div class="cd mc pj2">
          ${d
            ? `<div class="pv" role="button" tabindex="0" onclick="openProject('${p.id}')" aria-label="Abrir o arquivo do projeto ${esc(p.t)}">${thumb(d)}<span class="kd">${KIND_LABEL[d.kind] || d.kind}</span></div>`
            : `<div class="pv pj-empty" role="button" tabindex="0" onclick="openM('proj',0,'${p.id}')" aria-label="Vincular um arquivo ao projeto ${esc(p.t)}">${ico('link')}<b>Sem arquivo vinculado</b><small>Clique para vincular</small></div>`}
          <div class="mi">
            <div class="pj-h2"><h4>${esc(p.t)}</h4><div class="pj-x"><button class="x" onclick="openM('proj',0,'${p.id}')" aria-label="Editar projeto" title="Editar">${ico('pencil')}</button><button class="x" onclick="del('projs','${p.id}')" aria-label="Excluir projeto" title="Excluir">${ico('trash')}</button></div></div>
            <p>${esc(p.desc || 'Sem descrição')}</p>
            <div class="mi-f">${d ? `<span class="chip n pj-lk">${ico('link')}<span>${esc(d.title)}</span></span><button class="btn sm p" onclick="openProject('${p.id}')">${ico('pencil')}Abrir</button>` : `<span class="chip n">Sem arquivo</span><button class="btn sm" onclick="openM('proj',0,'${p.id}')">${ico('link')}Vincular</button>`}</div>
          </div></div>`;
      }).join('') || `<div class="cd span-all">${emp('Nenhum projeto encontrado. Crie o primeiro e vincule um arquivo a ele.', 'folder')}</div>`}</div>`;
  }

  /* ---------- Modelos ---------- */
  if (page === 'mod') {
    edLoadFonts();
    const L = MODELS.filter((m) => (filt === 'todos' || m.cat === filt) && (m.name + ' ' + m.desc + ' ' + CAT_LABEL[m.cat]).toLowerCase().includes(q));
    const lp = linkProj && D.projs.find((x) => sameId(x.id, linkProj));
    const banner = lp ? `<div class="lnk-bn">${ico('link')}<p>Escolha um modelo para o projeto <b>${esc(lp.t)}</b>. O arquivo criado será vinculado a ele.</p><button class="btn sm" onclick="cancelLink()">Cancelar</button></div>` : '';
    h = ph('Modelos', `<button class="btn" onclick="openLib('manage')" title="Imagens e PDFs para usar nos seus arquivos">${ico('paperclip')}Anexos</button>`, MODELS.length + ' modelos prontos para personalizar')
      + banner
      + `<div class="fb">${CATS.map((f) => `<button class="${filt === f[0] ? 'on' : ''}" onclick="filt='${f[0]}';render()">${f[1]}${f[0] === 'todos' ? '' : ' <i>' + MODELS.filter((m) => m.cat === f[0]).length + '</i>'}</button>`).join('')}</div>
      <div class="gr g3">${L.map((m) => `<div class="cd mc">
          <div class="pv" onclick="useM('${m.id}')" onkeydown="if(event.key==='Enter')useM('${m.id}')" role="button" tabindex="0" aria-label="Usar o modelo ${esc(m.name)}">${thumb(buildDoc(m.id, { nameOnly: true }))}${m.plan === 'B' ? `<span class="tagpro">${ico('star')}Pro</span>` : ''}<span class="kd">${m.fmt}</span></div>
          <div class="mi"><h4>${esc(m.name)}</h4><p>${esc(m.desc)}</p>
            <div class="mi-f"><span class="chip ${m.plan === 'B' ? '' : 'n'}">${m.plan === 'B' ? 'Pro' : 'Gratuito'}</span><button class="btn sm p" onclick="useM('${m.id}')">Usar modelo</button></div>
          </div></div>`).join('') || `<div class="cd span-all">${emp('Nenhum modelo encontrado para essa busca.', 'layout')}</div>`}</div>`;
  }

  if (page === 'por') h = filesPage(q, ph, btn);

  /* ---------- Notas ---------- */
  if (page === 'notas') {
    h = ph('Notas', btn('Nova nota', 'note'), 'Ideias, estudos e lembretes')
      + `<div class="gr g3">${D.notes.filter((n) => (n.t + (n.c || '')).toLowerCase().includes(q)).map((n, i) => `<div class="cd nt n${i % 4}">
          <h4>${esc(n.t)}</h4><p>${esc(n.c || 'Sem conteúdo')}</p>
          <div class="nt-a"><button class="btn sm" onclick="openM('note',0,'${n.id}')">${ico('pencil')}Editar</button><button class="btn sm dg" onclick="del('notes','${n.id}')">${ico('trash')}</button></div>
        </div>`).join('') || `<div class="cd span-all">${emp('Nenhuma nota. Registre ideias, estudos e lembretes.', 'note')}</div>`}</div>`;
  }

  /* ---------- Calendário ---------- */
  if (page === 'cal') {
    const y = cal.getFullYear(), m = cal.getMonth(), f = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate(), pv = new Date(y, m, 0).getDate();
    const MN = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let c = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => `<small>${d}</small>`).join('');
    for (let i = f - 1; i >= 0; i--) c += `<div class="cl o">${pv - i}</div>`;
    for (let d = 1; d <= n; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, k = D.events.filter((e) => e.d === ds).length;
      c += `<button class="cl ${ds === td ? 't' : ''} ${k ? 'e' : ''}" onclick="openM('event','${ds}')" aria-label="Dia ${d}${k ? ', ' + k + ' compromisso(s)' : ''}">${d}${k ? `<i>${k}</i>` : ''}</button>`;
    }
    const mes = `${y}-${String(m + 1).padStart(2, '0')}`;
    const doMes = D.events.filter((e) => e.d.startsWith(mes)).sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h));
    h = ph('Calendário', btn('Novo compromisso', 'event'), 'Clique em um dia para marcar')
      + `<div class="gr calw"><div class="cd">
        <div class="cal-h"><button class="btn sm" onclick="mon(-1)" aria-label="Mês anterior">${ico('chev-left')}</button><h3>${MN[m]} ${y}</h3><button class="btn sm" onclick="mon(1)" aria-label="Próximo mês">${ico('chev-right')}</button></div>
        <div class="cal">${c}</div></div>
        <div class="cd"><h3>Neste mês</h3>${doMes.map((e) => `<div class="ev"><div class="evd"><b>${e.d.slice(8)}</b><small>${MN[m].slice(0, 3).toLowerCase()}</small></div><div><span>${esc(e.t)}</span><small>${e.h}</small></div></div>`).join('') || emp('Sem compromissos neste mês.', 'calendar')}</div></div>`;
  }

  /* ---------- Agenda ---------- */
  if (page === 'age') {
    const all = [...D.events].sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h));
    h = ph('Agenda', btn('Novo compromisso', 'event'), 'Todos os seus compromissos')
      + (all.map((e) => `<div class="cd ag ${e.d < td ? 'past' : ''}">
          <div class="evd"><b>${e.d.slice(8)}</b><small>${lbl(e.d)}</small></div>
          <div class="ag-t"><span>${esc(e.t)}</span><small>${ico('clock')}${e.h}${e.d < td ? ' · já passou' : ''}</small></div>
          <button class="x" onclick="del('events','${e.id}')" aria-label="Excluir compromisso">${ico('trash')}</button>
        </div>`).join('') || `<div class="cd">${emp('Sua agenda está vazia. Marque estudos, prazos e entrevistas.', 'clock')}</div>`);
  }

  /* ---------- Agente de IA (o desenho fica em views/chat.view.js) ---------- */
  if (page === 'ia') h = chatPage();

  /* ---------- Planos ---------- */
  if (page === 'plan') h = planPage(ph);

  /* ---------- Perfil ---------- */
  if (page === 'perf') {
    const P = D.prof || {}, sc = profileScore();
    PF_SK = [...(P.skills || [])];
    const fl = (l, i, v, t = 'text', extra = '') => `<div class="fd"><label for="${i}">${l}</label><input class="inp" id="${i}" type="${t}" value="${esc(v || '')}" ${extra}></div>`;
    h = ph('Perfil', '', 'Como as pessoas veem você')
      + `<div class="pf">
        <div class="cd pf-c">
          <div class="av-up"><div class="av big ${D.avatar ? 'has-img' : ''}">${avInner()}</div>
            <label class="av-btn" title="Trocar foto">${ico('camera')}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onchange="pickAvatar(this)"></label></div>
          ${D.avatar ? '<button type="button" class="lnk" onclick="removeAvatar()">Remover foto</button>' : ''}
          <h3>${esc(me.name)}</h3>
          <p>${esc(P.role || 'Sua profissão')}</p>
          ${P.loc ? `<small class="loc">${ico('pin')}${esc(P.loc)}</small>` : ''}
          <small>${esc(me.email)}</small>
          <span class="chip">Plano ${PL[D.plan][0]}</span>
          ${(P.skills || []).length ? `<div class="tags ro">${P.skills.slice(0, 8).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          <div class="meter"><div class="meter-h"><span>Perfil completo</span><b>${sc.pct}%</b></div><div class="meter-b"><i style="width:${sc.pct}%"></i></div>
            ${sc.missing.length ? `<small>Falta: ${sc.missing.slice(0, 3).join(', ')}${sc.missing.length > 3 ? '…' : ''}</small>` : '<small>Tudo certo! Seu perfil está completo.</small>'}</div>
        </div>
        <form class="cd" onsubmit="return savePf(event)">
          <h3>Informações pessoais</h3>
          <div class="fr">${fl('Nome completo', 'p0', me.name, 'text', 'maxlength="80" required')}${fl('Profissão ou área', 'p1', P.role, 'text', 'maxlength="80" placeholder="Ex.: Desenvolvedora front-end"')}</div>
          <div class="fr">${fl('Telefone', 'p2', P.phone, 'tel', 'maxlength="30"')}${fl('Cidade e estado', 'p8', P.loc, 'text', 'maxlength="80" placeholder="Brasília, DF"')}</div>
          <h3 class="sub">Links</h3>
          ${fl('Site ou portfólio', 'p3', P.link, 'text', 'maxlength="200" placeholder="seusite.com.br"')}
          <div class="fr">${fl('LinkedIn', 'p6', P.li, 'text', 'maxlength="200" placeholder="linkedin.com/in/voce"')}${fl('GitHub', 'p7', P.gh, 'text', 'maxlength="200" placeholder="github.com/voce"')}</div>
          <h3 class="sub">Sobre você</h3>
          <div class="fd"><label for="p4">Biografia <small class="cnt" id="p4c">${(P.bio || '').length}/500</small></label><textarea class="inp" id="p4" rows="4" maxlength="500" oninput="$('#p4c').textContent=this.value.length+'/500'" placeholder="Conte em poucas linhas quem você é e o que procura.">${esc(P.bio || '')}</textarea></div>
          <div class="fd"><label for="p5">Habilidades <small class="cnt">Enter ou vírgula para adicionar (máx. 20)</small></label>
            <div class="tags in" onclick="$('#p5').focus()"><span id="p-tags" class="tg-l"></span><input id="p5" class="tg-i" maxlength="30" placeholder="Ex.: Figma, React, Excel" onkeydown="skKey(event)" onblur="skBlur(this)"></div></div>
          <button class="btn p">Salvar perfil</button>
        </form>
      </div>
      <div class="cd" style="margin-top:16px"><h3>Linha do tempo</h3>${logs(20)}</div>`;
    setTimeout(skDraw, 0);
  }

  /* ---------- Configurações ---------- */
  if (page === 'cfg') {
    const sel = (k, o) => `<select class="inp sel" onchange="D.${k}=this.value;persistSettings();toast('Preferência salva.')">${o.map((x) => `<option ${D[k] === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
    const tg = (on, fn, l) => `<button class="tg ${on ? 'on' : ''}" onclick="${fn}" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="${l}"></button>`;
    h = ph('Configurações', '', 'Conta, aparência e segurança')
      + `<div class="gr cfg">
        <div class="cd"><h3>Conta</h3>
          <div class="sr2"><div>Nome<small>${esc(me.name)}</small></div><button class="btn sm" onclick="openM('name')">${ico('pencil')}Editar</button></div>
          <div class="sr2"><div>E-mail<small>${esc(me.email)}</small></div></div>
          <div class="sr2"><div>Sair da conta<small>Encerrar a sessão neste dispositivo</small></div><button class="btn sm dg" onclick="logout()">Sair</button></div>
        </div>
        <div class="cd"><h3>Aparência e preferências</h3>
          <div class="sr2"><div>Modo escuro<small>Alternar o tema da interface</small></div>${tg(isDark(), 'theme()', 'Modo escuro')}</div>
          <div class="sr2"><div>Notificações por e-mail<small>Receber lembretes de tarefas</small></div>${tg(D.notif, "D.notif=D.notif?0:1;persistSettings();render();toast('Preferência salva.')", 'Notificações')}</div>
          <div class="sr2"><div>Idioma<small>Idioma da interface</small></div>${sel('lang', ['Português (Brasil)', 'English', 'Español'])}</div>
          <div class="sr2"><div>Privacidade do perfil<small>Quem pode ver seu portfólio</small></div>${sel('priv', ['Público', 'Somente com link', 'Privado'])}</div>
        </div>
        <div class="cd"><h3>Segurança</h3>
          <div class="sr2"><div>Autenticação de dois fatores<small>Código por e-mail ao entrar (opcional)</small></div>${tg(D.fa, "D.fa=D.fa?0:1;persistSettings();render();toast(D.fa?'2FA ativado.':'2FA desativado.')", '2FA')}</div>
          <div class="sr2"><div>Alterar senha<small>Defina uma nova senha</small></div><button class="btn sm" onclick="auth('forgot')">Alterar</button></div>
        </div>
      </div>`;
  }

  $('#pc').innerHTML = `<section class="pg-in">${h}</section>`;
  $('#pc').classList.toggle('chat', page === 'ia');
  $('#bell-dot').hidden = !due.length;
  fitThumbs();
  if (page === 'ia') chatAfterRender();
}

const LAPTOP = `<svg viewBox="0 0 360 236" role="img" aria-label="Notebook mostrando o painel do Portfy, com uma planta e uma xícara de café">
  <defs>
    <linearGradient id="lpBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6F8FB"/><stop offset=".6" stop-color="#D6DBE5"/><stop offset="1" stop-color="#A7AFC0"/></linearGradient>
    <linearGradient id="lpDeck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4E8EF"/><stop offset="1" stop-color="#C6CCD8"/></linearGradient>
    <linearGradient id="lpBezel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3452"/><stop offset="1" stop-color="#0E1325"/></linearGradient>
    <linearGradient id="lpBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4C86FF"/><stop offset="1" stop-color="#2352E8"/></linearGradient>
    <linearGradient id="lpGlare" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="lpLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3FE0B5"/><stop offset="1" stop-color="#139E83"/></linearGradient>
    <linearGradient id="lpCup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E9EDF4"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#D5DBE6"/></linearGradient>
    <pattern id="lpKeys" width="13" height="5" patternUnits="userSpaceOnUse"><rect x="1" y=".8" width="11" height="3.4" rx="1" fill="#2D3548"/></pattern>
    <clipPath id="lpClip"><rect x="76" y="20" width="208" height="128" rx="3"/></clipPath>
    <filter id="lpBlur"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <ellipse cx="180" cy="212" rx="170" ry="11" fill="#000" opacity=".3" filter="url(#lpBlur)"/>
  <rect x="322" y="170" width="28" height="34" rx="5" fill="#F1F3F8"/><rect x="322" y="170" width="28" height="7" rx="3" fill="#DDE2EC"/>
  <path d="M336 170C322 158 322 138 336 120c14 18 14 38 0 50z" fill="url(#lpLeaf)"/>
  <path d="M336 172c12-8 24-8 22-22-14 0-24 8-22 22z" fill="#17A98B"/>
  <path d="M336 172c-12-7-22-6-26-19 13-1 24 7 26 19z" fill="#32D1AA"/>
  <path d="M336 168V128" stroke="#0E7F69" stroke-width="1" opacity=".5"/>
  <rect x="66" y="10" width="228" height="148" rx="12" fill="url(#lpBezel)" stroke="#4A5473" stroke-width=".8"/>
  <circle cx="180" cy="15" r="1.6" fill="#59638A"/>
  <rect x="76" y="20" width="208" height="128" rx="3" fill="#fff"/>
  <g clip-path="url(#lpClip)">
    <rect x="76" y="20" width="208" height="12" fill="#F2F5FB"/><circle cx="84" cy="26" r="2" fill="#FF6B6B"/><circle cx="91" cy="26" r="2" fill="#FFC145"/><circle cx="98" cy="26" r="2" fill="#3DDC97"/>
    <rect x="200" y="23" width="70" height="6" rx="3" fill="#E1E7F3"/>
    <rect x="76" y="32" width="34" height="116" fill="#F7F9FD"/>
    <rect x="82" y="40" width="22" height="4" rx="2" fill="#2F6BFF"/><rect x="82" y="50" width="18" height="3" rx="1.5" fill="#CBD5E8"/><rect x="82" y="58" width="20" height="3" rx="1.5" fill="#CBD5E8"/><rect x="82" y="66" width="14" height="3" rx="1.5" fill="#CBD5E8"/>
    <rect x="118" y="40" width="100" height="40" rx="6" fill="url(#lpBlue)"/><rect x="127" y="50" width="42" height="4" rx="2" fill="#fff"/><rect x="127" y="60" width="62" height="3" rx="1.5" fill="#BCD0FF"/><rect x="127" y="67" width="40" height="3" rx="1.5" fill="#BCD0FF"/>
    <rect x="118" y="90" width="32" height="32" rx="7" fill="#2EC4B6"/><rect x="125" y="99" width="18" height="3" rx="1.5" fill="#fff"/><rect x="125" y="106" width="12" height="3" rx="1.5" fill="#CFF5F0"/>
    <rect x="160" y="108" width="7" height="14" fill="#7FA2FF"/><rect x="171" y="98" width="7" height="24" fill="#2F6BFF"/><rect x="182" y="112" width="7" height="10" fill="#7FA2FF"/>
    <rect x="228" y="48" width="9" height="14" rx="1" fill="#2F6BFF"/><rect x="241" y="40" width="9" height="22" rx="1" fill="#2F6BFF"/><rect x="254" y="32" width="9" height="30" rx="1" fill="#2F6BFF"/>
    <circle cx="250" cy="100" r="16" fill="#2F6BFF"/><path d="M250 100V84a16 16 0 0 1 16 16z" fill="#fff"/>
    <rect x="118" y="130" width="130" height="3" rx="1.5" fill="#E1E7F3"/><rect x="118" y="137" width="88" height="3" rx="1.5" fill="#E1E7F3"/>
    <polygon points="76,20 186,20 128,148 76,148" fill="url(#lpGlare)"/>
  </g>
  <rect x="128" y="157" width="104" height="4" rx="2" fill="#8892A7"/>
  <path d="M66 160H294L330 190H30Z" fill="url(#lpDeck)"/>
  <polygon points="94,164 266,164 290,180 70,180" fill="#1F2638" opacity=".92"/>
  <polygon points="94,164 266,164 290,180 70,180" fill="url(#lpKeys)"/>
  <polygon points="154,183 206,183 210,188 150,188" fill="#CDD3DF" stroke="#B3BBCB" stroke-width=".6"/>
  <path d="M30 190H330a3 3 0 0 1 2.9 3.6c-.7 3.2-3 4.4-6.4 4.4H33.5c-3.4 0-5.7-1.2-6.4-4.4A3 3 0 0 1 30 190z" fill="url(#lpBody)"/>
  <path d="M158 190h44v3a5 5 0 0 1-5 3h-34a5 5 0 0 1-5-3z" fill="#98A1B4"/>
  <ellipse cx="288" cy="214" rx="32" ry="7" fill="#EEF1F7"/><ellipse cx="288" cy="213" rx="22" ry="4.5" fill="#DDE2EC"/>
  <path d="M272 192h32v9a16 13 0 0 1-32 0z" fill="url(#lpCup)"/>
  <path d="M304 195h5a5.5 5.5 0 0 1 0 11h-6.5" fill="none" stroke="#E3E8F1" stroke-width="3"/>
  <ellipse cx="288" cy="193" rx="16" ry="4" fill="#5B3A29"/><ellipse cx="285" cy="192.5" rx="7" ry="1.6" fill="#8A5A3F" opacity=".7"/>
  <path d="M281 186c-4-5 4-8 0-14M290 186c-4-5 4-8 0-14" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".35"/>
</svg>`;

const kindSel = () => `<div class="fd">
  <label for="m2">Tipo de arquivo</label>
  <select class="inp" id="m2">
  <option value="portfolio">Portfólio</option>
  <option value="curriculo">Currículo</option>
  <option value="projeto">Projeto</option>
  </select>
  </div>`;

/* --- Miniaturas reais dos arquivos --- */
/** Pontos (em %) das formas desenhadas com SVG. */
const POLY = {
  tri: '50,0 100,100 0,100',
  star: '50,2 61,37 98,37 68,59 79,95 50,73 21,95 32,59 2,37 39,37',
  diamond: '50,0 100,50 50,100 0,50',
  arrow: '0,35 60,35 60,10 100,50 60,90 60,65 0,65',
};
const LAYER_NAMES = { text: 'Texto', rect: 'Retângulo', ellipse: 'Círculo', img: 'Imagem', tri: 'Triângulo', star: 'Estrela', diamond: 'Losango', arrow: 'Seta' };

/** Desenha um elemento do arquivo. edit = no editor (com alças); o.cors = para exportar imagens. */
function elHTML(e, edit, o = {}) {
  if (e.hid) return '';
  const sel = edit && Ed.sel === e.id && !e.lock;
  let css = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;`, inner = '';
  if (e.rot) css += `transform:rotate(${e.rot}deg);`;
  if (e.op != null && e.op < 100) css += `opacity:${e.op / 100};`;
  const shadow = e.sh ? (e.k === 'text' ? 'text-shadow:0 2px 10px rgba(0,0,0,.35);' : 'box-shadow:0 10px 30px rgba(10,20,48,.32);') : '';
  const border = e.bd ? `border:${e.bd}px solid ${e.bdc || '#0A1A3F'};box-sizing:border-box;` : '';
  if (e.k === 'text') {
    css += `font-family:'${e.ff}',sans-serif;font-weight:${e.fw};font-size:${e.fs}px;line-height:${e.lh || 1.3};color:${e.color};text-align:${e.ta};`
      + (e.it ? 'font-style:italic;' : '') + (e.ul ? 'text-decoration:underline;' : '') + (e.ls ? `letter-spacing:${e.ls}px;` : '') + (e.up ? 'text-transform:uppercase;' : '')
      + (e.bg ? `background:${e.bg};` : '') + shadow + border;
    inner = esc(e.txt);
  } else if (e.k === 'img') {
    css += `border-radius:${e.r || 0}px;overflow:hidden;` + shadow + border;
    inner = `<img src="${esc(e.src)}" alt=""${o.cors ? ' crossorigin="anonymous"' : ''} style="object-fit:${e.fit || 'cover'}">`;
  } else if (POLY[e.k]) {
    css += (e.sh ? 'filter:drop-shadow(0 10px 14px rgba(10,20,48,.3));' : '');
    inner = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style="display:block"><polygon points="${POLY[e.k]}" fill="${e.bg}"${e.bd ? ` stroke="${e.bdc || '#0A1A3F'}" stroke-width="${e.bd}" vector-effect="non-scaling-stroke" stroke-linejoin="round"` : ''}/></svg>`;
  } else {
    css += `background:${e.bg};border-radius:${e.k === 'ellipse' ? '50%' : (e.r || 0) + 'px'};` + shadow + border;
  }
  const hs = sel ? ['nw', 'ne', 'sw', 'se'].map((h) => `<i class="hd ${h}" data-h="${h}"></i>`).join('') + '<i class="rot" data-h="rot"></i>' : '';
  return `<div class="el ${sel ? 'sel' : ''} ${e.lock ? 'lk' : ''}" data-id="${e.id}" style="${css}">${inner}${hs}</div>`;
}

function thumb(doc) {
  return `<div class="th2" data-w="${doc.w}" style="--ar:${doc.w / doc.h}">
    <div class="th2-in" style="width:${doc.w}px;height:${doc.h}px;background:${doc.bg}">${doc.els.map(e => elHTML(e)).join('')}</div>
    </div>`;
}

/* --- Página "Meus arquivos" --- */
function filesPage(q, ph, btn) {
  const L = D.docs.filter((d) => (fk === 'todos' || d.kind === fk) && d.title.toLowerCase().includes(q));
  const chips = [['todos', 'Todos'], ['curriculo', 'Currículos'], ['portfolio', 'Portfólios'], ['projeto', 'Projetos']]
    .map((f) => `<button class="${fk === f[0] ? 'on' : ''}" onclick="fk='${f[0]}';render()">${f[1]}</button>`).join('');
  const cards = L.map((d) => `<div class="cd mc fc">
      <div class="pv" role="button" tabindex="0" onclick="openEditor('${d.id}')" aria-label="Abrir ${esc(d.title)}">${thumb(d)}<span class="kd">${KIND_LABEL[d.kind] || d.kind}</span></div>
      <div class="mi">
        <h4>${esc(d.title)}</h4>
        <p>Editado ${ago(d.upd)}</p>
        <div class="row2">
          <button class="btn sm p" onclick="openEditor('${d.id}')">${ico('pencil')}Abrir</button>
          <div class="dl">${dlButton(d.id)}</div>
          <button class="btn sm" onclick="dupDoc('${d.id}')" aria-label="Duplicar arquivo" title="Duplicar">${ico('copy')}</button>
          <button class="btn sm dg" onclick="delDoc('${d.id}')" aria-label="Excluir arquivo" title="Excluir">${ico('trash')}</button>
        </div>
      </div>
    </div>`).join('');
  return ph('Meus arquivos', `<button class="btn" onclick="openLib('manage')">${ico('paperclip')}Anexos</button>` + btn('Novo arquivo', 'file'), 'Currículos, portfólios e projetos')
    + `<div class="fb">${chips}</div><div class="gr g3">${cards}<button class="cd addc" onclick="openM('file')">${ico('plus')}Adicionar arquivo</button></div>`;
}
