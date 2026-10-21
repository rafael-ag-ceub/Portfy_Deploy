/* =====================================================================
   PORTFY · js/views/chat.view.js
   Camada: View
   Desenho do Agente de IA: lista de conversas, mensagens, barra de
   "pausar / continuar / parar" e campo de texto.
   As ações (enviar, pausar, trocar de conversa) ficam em
   js/controllers/ai.controller.js. O estado fica em models/chat.model.js.
   ===================================================================== */

/** Converte o texto da IA em HTML seguro: **negrito**, `código`, listas e parágrafos. */
function md(t) {
  const inl = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  let out = '', list = null;
  const close = () => { if (list) { out += `</${list}>`; list = null; } };
  for (const raw of esc(t).split('\n')) {
    const l = raw.trim();
    let m;
    if ((m = l.match(/^[-*•]\s+(.*)/))) { if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; } out += `<li>${inl(m[1])}</li>`; }
    else if ((m = l.match(/^(\d+)[.)]\s+(.*)/))) { if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; } out += `<li>${inl(m[2])}</li>`; }
    else if (!l) close();
    else if ((m = l.match(/^#{1,4}\s+(.*)/))) { close(); out += `<h5>${inl(m[1])}</h5>`; }
    else { close(); out += `<p>${inl(l)}</p>`; }
  }
  close();
  return out;
}

/* ---------- lista de conversas (coluna da esquerda) ---------- */
function chatListHTML() {
  const items = D.convs.map((c) => `<div class="cv-item ${sameId(c.id, D.conv) ? 'on' : ''}" role="button" tabindex="0" onclick="chatOpen('${c.id}')" onkeydown="if(event.key==='Enter')chatOpen('${c.id}')">
      ${ico('chat')}
      <span class="cv-t">${esc(c.t)}</span>
      <small>${ago(c.upd)}</small>
      <button class="cv-x" onclick="event.stopPropagation();chatDel('${c.id}')" aria-label="Excluir conversa" title="Excluir conversa">${ico('trash')}</button>
    </div>`).join('');
  return `<div class="cl-h"><b>Conversas</b><span class="chip n" title="Guardamos as ${CHAT_MAX} conversas mais recentes">${D.convs.length}/${CHAT_MAX}</span></div>
    <button class="btn p bl sm" onclick="chatNew()">${ico('plus')}Nova conversa</button>
    <div class="cl-items">${items || '<p class="cl-emp">Suas conversas ficam salvas aqui para você retomar depois.</p>'}</div>`;
}

/* ---------- mensagens ---------- */
function msgHTML(m) {
  if (m[0] === 'me') return `<div class="msg me"><div class="mb">${esc(m[1]).replace(/\n/g, '<br>')}</div></div>`;
  const body = m[2] === 'err' ? `<p>${esc(m[1])}</p>` : md(m[1]);
  const cut = m[2] === 'cut' ? `<div class="cut">${ico('stop')}Resposta interrompida por você</div>` : '';
  return `<div class="msg ai ${m[2] === 'err' ? 'er' : ''}"><div class="mav">${ico(m[2] === 'err' ? 'info' : 'sparkles')}</div><div class="mb">${body}${cut}</div></div>`;
}

function chatEmptyHTML() {
  return `<div class="cx-empty">
    <div class="cx-eav">${ico('sparkles')}</div>
    <h3>Como posso ajudar hoje?</h3>
    <p>${esc(WELCOME)}</p>
    <div class="sugs">${SUGGESTIONS.map((s, i) => `<button onclick="askText(SUGGESTIONS[${i}][1])"><b>${s[0]}</b><span>${esc(s[1])}</span></button>`).join('')}</div>
  </div>`;
}

function chatMsgsHTML() {
  let h = D.chat.length || AIS.phase !== 'idle' ? D.chat.map(msgHTML).join('') : chatEmptyHTML();
  if (AIS.phase === 'wait') h += `<div class="msg ai"><div class="mav">${ico('sparkles')}</div><div class="mb"><span class="dots"><i></i><i></i><i></i></span></div></div>`;
  if (AIS.phase === 'type' || AIS.phase === 'pause') h += `<div class="msg ai"><div class="mav">${ico('sparkles')}</div><div class="mb" id="m-live">${md(AIS.full.slice(0, AIS.shown))}${AIS.phase === 'type' ? '<span class="caret"></span>' : ''}</div></div>`;
  return h;
}

/* ---------- barra de status: pausar / continuar / parar ---------- */
function chatStatusHTML() {
  const stop = `<button type="button" class="btn sm dg" onclick="aiStop()">${ico('stop')}Parar</button>`;
  if (AIS.phase === 'wait') return `<span class="dots"><i></i><i></i><i></i></span><span>O Agente está pensando…</span><div class="cs-a">${stop}</div>`;
  if (AIS.phase === 'type') return `<span class="dots"><i></i><i></i><i></i></span><span>O Agente está digitando…</span><div class="cs-a"><button type="button" class="btn sm" onclick="aiPause()">${ico('pause')}Pausar</button>${stop}</div>`;
  if (AIS.phase === 'pause') return `${ico('pause')}<span>Digitação em pausa</span><div class="cs-a"><button type="button" class="btn sm p" onclick="aiPause()">${ico('play')}Continuar</button>${stop}</div>`;
  return '';
}

/* ---------- página inteira ---------- */
function chatPage() {
  return `<div class="chatx" id="chatx">
    <aside class="cx-list" id="cx-list">${chatListHTML()}</aside>
    <div class="cx-scrim" onclick="chatList(false)"></div>
    <section class="cx-main">
      <header class="cx-head">
        <button class="ic cx-tg" onclick="chatList()" aria-label="Mostrar conversas">${ico('panel')}</button>
        <div class="cx-hav">${ico('sparkles')}</div>
        <div class="cx-ti"><b id="cx-title">Agente Portfy</b><small id="cx-sub"></small></div>
        <button class="btn sm" onclick="chatNew()">${ico('plus')}<span>Nova conversa</span></button>
      </header>
      <div class="msgs" id="ms" aria-live="polite">${chatMsgsHTML()}</div>
      <div class="cx-status" id="cx-status" hidden></div>
      <form class="cin" id="cin" onsubmit="return ask(event)">
        <textarea class="inp" id="ci" rows="1" maxlength="2000" placeholder="Pergunte sobre currículo, portfólio ou entrevistas" aria-label="Mensagem para o Agente de IA" onkeydown="chatKey(event)" oninput="chatInput(this)"></textarea>
        <button class="btn p send" id="cx-send" type="submit" aria-label="Enviar mensagem">${ico('send')}</button>
      </form>
      <div class="cx-foot"><span id="cx-count">0/2000</span><span>Enter envia · Shift + Enter quebra a linha · A IA pode errar: confira informações importantes.</span></div>
    </section>
  </div>`;
}

/** Cabeçalho, status e botão de enviar (muda conforme a fase da conversa). */
function chatChrome() {
  const st = $('#cx-status');
  if (!st) return;
  const html = chatStatusHTML();
  st.innerHTML = html;
  st.hidden = !html;
  st.dataset.phase = AIS.phase;
  $('#cx-send').disabled = AIS.phase !== 'idle';
  const c = D.convs.find((x) => sameId(x.id, D.conv));
  $('#cx-title').textContent = c ? c.t : 'Nova conversa';
  $('#cx-sub').textContent = D.quota ? `${D.quota.used} de ${D.quota.limit} mensagens usadas hoje` : (USE_SUPABASE ? 'Online' : 'Modo demonstração · respostas simuladas');
}

/** Redesenha lista, mensagens e barra. Não mexe no texto que a pessoa está digitando. */
function chatDraw(scroll = true) {
  const ms = $('#ms');
  if (page !== 'ia' || !ms) return;
  $('#cx-list').innerHTML = chatListHTML();
  ms.innerHTML = chatMsgsHTML();
  chatChrome();
  if (scroll) ms.scrollTop = ms.scrollHeight;
}

/** Durante a digitação só o balão atual é atualizado (rápido, sem piscar). */
function chatTick() {
  const b = $('#m-live'), ms = $('#ms');
  if (!b) return;
  b.innerHTML = md(AIS.full.slice(0, AIS.shown)) + '<span class="caret"></span>';
  if (ms.scrollHeight - ms.scrollTop - ms.clientHeight < 160) ms.scrollTop = ms.scrollHeight;
}

/** Chamado por render() logo depois de montar a página do Agente. */
function chatAfterRender() {
  chatChrome();
  const ms = $('#ms');
  ms.scrollTop = ms.scrollHeight;
  if (USE_SUPABASE) chatLoadQuota();
}
