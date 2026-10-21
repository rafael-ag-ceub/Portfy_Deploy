/* =====================================================================
   PORTFY · js/controllers/ai.controller.js
   Camada: Controller
   Conversa com o Agente de IA: enviar, digitar a resposta aos poucos,
   PAUSAR / CONTINUAR / PARAR e trocar entre as conversas salvas.

   Fluxo de uma mensagem:  ask() > sendMsg() > replyFor() > (resposta) > aiRun()
   O estado da conversa fica em AIS e D (models/chat.model.js).
   Quem desenha a tela é views/chat.view.js.
   ===================================================================== */

/* ---------- enviar ---------- */
function ask(e) {
  e.preventDefault();
  const t = $('#ci'), v = t.value.trim();
  if (!v || AIS.phase !== 'idle') return false;
  t.value = '';
  chatInput(t);
  sendMsg(v);
  return false;
}

/** Envia um texto pronto (botões de sugestão). */
function askText(v) { if (AIS.phase === 'idle') sendMsg(v); }

function chatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#cin').requestSubmit(); }
}

function chatInput(t) {
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 180) + 'px';
  $('#cx-count').textContent = t.value.length + '/2000';
}

/** Modo local: grava; no Supabase o servidor já gravou a conversa. */
function chatSave() {
  if (USE_SUPABASE) return;
  const th = D.convs.find((x) => sameId(x.id, D.conv));
  if (th) { th.upd = Date.now(); chatSort(); }
  save();
}

/** Resposta da IA: do servidor (Supabase) ou simulada (modo local). */
function replyFor(v) {
  if (USE_SUPABASE) return replyRemote(v);
  return new Promise((ok) => setTimeout(() => ok({ reply: aiR(v) }), 600 + Math.random() * 500));
}

async function sendMsg(v) {
  if (!USE_SUPABASE && !D.conv) chatCreateLocal(v);
  D.chat.push(['me', v]);
  chatSave();
  const tok = ++AIS.token, startConv = D.conv;
  AIS.phase = 'wait';
  chatDraw();

  let r;
  try { r = await replyFor(v); } catch (ex) { r = { error: ex.message || 'A IA não respondeu. Tente de novo.', quota: ex.quota }; }
  if (r.quota) D.quota = r.quota;

  /* a pessoa apertou Parar ou trocou de conversa enquanto esperava: a resposta não é mostrada */
  if (tok !== AIS.token) {
    if (USE_SUPABASE && r.conversation_id) {
      chatRemember(r.conversation_id, v);
      if (D.conv === null && startConv === null && D.chat.some((m) => m[0] === 'me' && m[1] === v)) D.conv = r.conversation_id;
      chatDraw(false);
    }
    return;
  }

  if (r.error) {
    D.chat.push(['ai', r.error, 'err']);
    AIS.phase = 'idle';
    chatSave();
    chatDraw();
    return;
  }
  if (USE_SUPABASE) { D.conv = r.conversation_id; chatRemember(D.conv, v); }

  /* saiu da página enquanto esperava: guarda a resposta inteira, sem animação */
  if (page !== 'ia') {
    D.chat.push(['ai', r.reply]);
    AIS.phase = 'idle';
    chatSave();
    return;
  }
  AIS.full = r.reply;
  AIS.shown = 0;
  AIS.phase = 'type';
  chatDraw();
  aiRun();
}

/* ---------- digitação aos poucos ---------- */
function aiRun() {
  clearInterval(AIS.timer);
  const passo = Math.max(2, Math.ceil(AIS.full.length / 240));   // respostas longas não demoram demais
  AIS.timer = setInterval(() => {
    AIS.shown = Math.min(AIS.full.length, AIS.shown + passo);
    if (AIS.shown >= AIS.full.length) return aiCommit(false);
    chatTick();
  }, 18);
}

/** Guarda a resposta na conversa. cut = true quando a pessoa parou no meio. */
function aiCommit(cut) {
  clearInterval(AIS.timer);
  const texto = cut ? AIS.full.slice(0, AIS.shown) : AIS.full;
  if (cut) D.chat.push(['ai', texto, 'cut']);
  else D.chat.push(['ai', texto]);
  AIS.phase = 'idle';
  AIS.full = '';
  AIS.shown = 0;
  chatSave();
  chatDraw();
}

/** PAUSAR / CONTINUAR a digitação. */
function aiPause() {
  if (AIS.phase === 'type') {
    clearInterval(AIS.timer);
    AIS.phase = 'pause';
    const b = $('#m-live');
    if (b) b.innerHTML = md(AIS.full.slice(0, AIS.shown));   // tira o cursor piscando
    chatChrome();
  } else if (AIS.phase === 'pause') {
    AIS.phase = 'type';
    chatChrome();
    const b = $('#m-live');
    if (b) chatTick();
    aiRun();
  }
}

/** PARAR: interrompe a resposta (esperando ou digitando). */
function aiStop() {
  if (AIS.phase === 'wait') {
    AIS.token++;                       // a resposta que chegar depois será ignorada
    AIS.phase = 'idle';
    D.chat.push(['ai', '', 'cut']);
    chatSave();
    chatDraw();
  } else if (AIS.phase === 'type' || AIS.phase === 'pause') {
    aiCommit(true);
  }
}

/** Termina a digitação na hora (usado ao trocar de página ou de conversa). */
function aiFinish() {
  if (AIS.phase === 'type' || AIS.phase === 'pause') { AIS.shown = AIS.full.length; aiCommit(false); }
}

/* ---------- conversas salvas ---------- */
function chatList(force) {
  const c = $('#chatx');
  if (c) c.classList.toggle('lo', typeof force === 'boolean' ? force : !c.classList.contains('lo'));
}

function chatNew() {
  aiFinish();
  if (AIS.phase === 'wait') { AIS.token++; AIS.phase = 'idle'; }
  D.conv = null;
  D.chat = [];
  chatList(false);
  chatDraw();
  const t = $('#ci');
  if (t) t.focus();
}

async function chatOpen(id) {
  chatList(false);
  if (sameId(id, D.conv)) return;
  aiFinish();
  if (AIS.phase === 'wait') { AIS.token++; AIS.phase = 'idle'; }
  D.conv = id;
  if (!USE_SUPABASE) {
    const th = D.convs.find((x) => sameId(x.id, id));
    D.chat = th ? th.msgs : [];
    return chatDraw();
  }
  D.chat = [];
  $('#ms').innerHTML = '<div class="cx-loading"><span class="dots"><i></i><i></i><i></i></span>Carregando conversa…</div>';
  $('#cx-list').innerHTML = chatListHTML();
  chatChrome();
  try {
    const rows = await PortfyAPI.messages(id);
    if (!sameId(D.conv, id)) return;      // a pessoa já abriu outra
    D.chat = rows;
  } catch (ex) { fail(ex); }
  chatDraw();
}

async function chatDel(id) {
  if (!confirm('Excluir esta conversa? Essa ação não pode ser desfeita.')) return;
  const eraAtual = sameId(id, D.conv);
  if (USE_SUPABASE) {
    try { await PortfyAPI.deleteConversation(id); } catch (ex) { return fail(ex); }
  }
  D.convs = D.convs.filter((c) => !sameId(c.id, id));
  if (!USE_SUPABASE) save();
  if (eraAtual) chatNew(); else chatDraw(false);
  toast('Conversa excluída.');
}

/** Modo Supabase: mostra quantas mensagens da cota diária já foram usadas. */
async function chatLoadQuota() {
  try { D.quota = await PortfyAPI.quota(); chatChrome(); } catch (ex) { /* sem cota na tela, o chat continua funcionando */ }
}
