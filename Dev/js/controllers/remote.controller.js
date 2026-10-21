/* =====================================================================
   PORTFY · js/controllers/remote.controller.js
   Camada: Controller (modo Supabase)
   Tudo que conversa com o banco real fica aqui. Os controllers antigos
   (auth, data, editor, ai) chamam estas funções quando USE_SUPABASE é true;
   com o config.js vazio, o site continua no modo local (localStorage).
   Padrão: atualiza a tela na hora (otimista) e confirma no servidor.
   ===================================================================== */

const API_TABLE = { tasks: 'tasks', events: 'events', notes: 'notes', projs: 'projects', docs: 'documents' };

/** Mostra o erro do Supabase em português. */
const fail = (ex) => { toast(PortfyAPI.friendly(ex)); return false; };

/** Salva as preferências (idioma, privacidade, notificações, 2FA). Funciona nos dois modos. */
function persistSettings() {
  if (USE_SUPABASE) PortfyAPI.saveSettings(D).catch(fail);
  else save();
}

/* ------------------------- Autenticação ------------------------- */

async function loginRemote(e) {
  e.preventDefault();
  const em = $('#l-em').value.trim().toLowerCase(), pw = $('#l-pw').value;
  if (!em || !pw) return err('login', 'Preencha e-mail e senha.'), false;
  try {
    await PortfyAPI.signIn(em, pw);
    await bootRemote();
  } catch (ex) {
    err('login', PortfyAPI.friendly(ex));
  }
  return false;
}

async function regRemote(e) {
  e.preventDefault();
  const nm = $('#r-nm').value.trim(), em = $('#r-em').value.trim().toLowerCase(), pw = $('#r-pw').value, cf = $('#r-cf').value;
  if (!nm || !em || !pw || !cf) return err('reg', 'Preencha todos os campos.'), false;
  if (!/^\S+@\S+\.\S+$/.test(em)) return err('reg', 'Digite um e-mail válido.'), false;
  if (!pwOk(pw)) return err('reg', 'A senha precisa ter 8 ou mais caracteres, uma letra maiúscula e um número.'), false;
  if (pw !== cf) return err('reg', 'As senhas não coincidem.'), false;
  try {
    const res = await PortfyAPI.signUp(nm, em, pw);
    // Com confirmação de e-mail ligada, e-mail já cadastrado volta sem erro e sem identidades
    if (res.user && res.user.identities && res.user.identities.length === 0) {
      return err('reg', 'Este e-mail já tem conta. Entre ou recupere a senha.'), false;
    }
    if (!res.session) {
      auth('login');
      toast('Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre.');
      return false;
    }
    D = await PortfyAPI.load();
    me = { name: D.name, email: D.email };
    auth('diag');
  } catch (ex) {
    err('reg', PortfyAPI.friendly(ex));
  }
  return false;
}

async function forgotRemote(e) {
  e.preventDefault();
  const em = $('#f-em').value.trim().toLowerCase();
  if (!em) return err('forgot', 'Informe o seu e-mail.'), false;
  try {
    await PortfyAPI.requestReset(em, REDIRECT_URL);
    auth('login');
    toast('Se o e-mail existir, enviamos um link para redefinir a senha.');
  } catch (ex) {
    err('forgot', PortfyAPI.friendly(ex));
  }
  return false;
}

/* ----------------------- Recuperação de senha -----------------------
   Fluxo: Esqueci a senha -> e-mail do Supabase -> clique no link -> volta ao site
   -> tela própria "Criar nova senha" -> senha salva -> entra no app.
   O link pode chegar de 3 formas (todas tratadas):
     1. ?token_hash=...&type=recovery   (modelo de e-mail do Portfy, recomendado)
     2. #access_token=...&type=recovery (modelo padrão do Supabase)
     3. evento PASSWORD_RECOVERY do supabase-js                                   */

const RECOVERY_FLAG = 'pf_recovery';   // lembra, até a senha ser trocada, que esta aba está em recuperação
let recoveryOpen = false;

const recFlag = {
  set() { try { sessionStorage.setItem(RECOVERY_FLAG, '1'); } catch (_) { /* sem sessionStorage: segue sem lembrar */ } },
  has() { try { return sessionStorage.getItem(RECOVERY_FLAG) === '1'; } catch (_) { return false; } },
  clear() { try { sessionStorage.removeItem(RECOVERY_FLAG); } catch (_) { /* ignora */ } },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Mostra a tela de nova senha quando já existe uma sessão de recuperação válida. */
async function recoveryReady() {
  if (recoveryOpen) return;                       // evita abrir duas vezes (evento + leitura do link)
  recoveryOpen = true;
  const s = await PortfyAPI.session();
  if (!s) return recoveryFail();
  recFlag.set();
  history.replaceState(null, '', location.pathname);     // tira o token do endereço
  $('#np-acc').textContent = s.user.email || '';
  $('#np-accw').style.display = s.user.email ? '' : 'none';
  npReset();
  auth('newpass');
  $('#n-pw').focus();
}

/** Link inválido, vencido ou já usado. */
function recoveryFail(motivo = '') {
  recoveryOpen = false;
  recFlag.clear();
  history.replaceState(null, '', location.pathname);
  $('#linkerr-msg').textContent = /expired|invalid|otp/i.test(motivo)
    ? 'Este link já foi aberto ou venceu. Alguns programas de e-mail abrem os links sozinhos para checá-los, e isso os invalida. Peça um novo link e abra-o logo que chegar.'
    : 'Por segurança, cada link vale por pouco tempo e só pode ser usado uma vez. Peça um novo e use-o em seguida.';
  auth('linkerr');
}

/** Formato 1: troca o token_hash do endereço por uma sessão. */
async function recoveryFromToken(tokenHash) {
  auth('newpass-wait');
  try {
    await PortfyAPI.verifyRecovery(tokenHash);
    await recoveryReady();
  } catch (ex) {
    console.error(ex);
    recoveryFail();
  }
}

/** Formato 2: o supabase-js lê o #access_token sozinho; esperamos a sessão aparecer (até ~3 s). */
async function recoveryFromHash() {
  auth('newpass-wait');
  for (let i = 0; i < 20; i++) {
    if (await PortfyAPI.session()) return recoveryReady();
    await sleep(150);
  }
  recoveryFail();
}

/** Botão "Salvar nova senha". */
async function newPass(e) {
  e.preventDefault();
  const pw = $('#n-pw').value, cf = $('#n-cf').value, btn = $('#np-btn');
  if (!pwOk(pw)) return err('newpass', 'A senha precisa ter 8 ou mais caracteres, uma letra maiúscula e um número.'), false;
  if (pw !== cf) return err('newpass', 'As senhas não coincidem.'), false;
  btn.disabled = true;
  btn.textContent = 'Salvando…';
  try {
    if (!(await PortfyAPI.session())) { recoveryFail(); return false; }
    await PortfyAPI.setNewPassword(pw);
    recFlag.clear();
    recoveryOpen = false;
    npReset();
    auth('newpass-ok');
  } catch (ex) {
    err('newpass', PortfyAPI.friendly(ex));
  } finally {
    btn.textContent = 'Salvar nova senha';
    npCheck();
  }
  return false;
}

/** Botão "Entrar no Portfy" da tela de sucesso. */
async function npEnter() {
  try { await bootRemote(); } catch (ex) { console.error(ex); auth('login'); }
}

/** Link "Cancelar": encerra a sessão de recuperação e volta ao login. */
async function npCancel() {
  recFlag.clear();
  recoveryOpen = false;
  try { await PortfyAPI.signOut(); } catch (_) { /* sai mesmo se a rede falhar */ }
  npReset();
  auth('login');
}

async function diagRemote(e) {
  e.preventDefault();
  const v = ['d1', 'd2', 'd3'].map((i) => $('#' + i).value);
  if (v.some((x) => !x)) return err('diag', 'Responda as três perguntas para continuar.'), false;
  try {
    await PortfyAPI.saveDiagnostic(v);
    D.diag = v;
    if (!D.docs.length && !D.tasks.length) await seedRemote();   // conta nova: cria o conteúdo inicial
    enterRemote();
  } catch (ex) {
    err('diag', PortfyAPI.friendly(ex));
  }
  return false;
}

/** Conteúdo inicial de uma conta nova (2 tarefas, 1 compromisso, 1 currículo e 1 portfólio). */
async function seedRemote() {
  const [t1, t2, ev, pf, cv] = await Promise.all([
    PortfyAPI.tasks.add({ t: 'Atualizar meu currículo', d: today(), done: 0 }),
    PortfyAPI.tasks.add({ t: 'Escolher um modelo de portfólio', d: addD(1), done: 0 }),
    PortfyAPI.events.add({ t: 'Reunião de alinhamento', d: addD(1), h: '10:00' }),
    PortfyAPI.documents.add(mkDoc('portfolio', 'Meu portfólio')),
    PortfyAPI.documents.add(mkDoc('curriculo', 'Meu currículo')),
  ]);
  D.tasks.push(t1, t2); D.events.push(ev); D.docs.unshift(pf, cv);
}

/** Carrega tudo do banco e abre o app (ou o diagnóstico, se ainda não foi respondido). */
async function bootRemote() {
  D = await PortfyAPI.load();
  me = { name: D.name, email: D.email };
  if (!D.diag) return auth('diag');
  enterRemote();
}

/** Parte visual de entrar no app (igual ao enter() local, mas com os dados já carregados). */
function enterRemote() {
  ['#u-av', '#u-av2'].forEach((s) => { $(s).textContent = ini(me.name); });
  $('#u-nm').textContent = me.name;
  $('#u-em').textContent = me.email;
  show('app');
  go('dash');
}

async function logoutRemote() {
  try { await PortfyAPI.signOut(); } catch (ex) { /* sai mesmo se a rede falhar */ }
  me = D = null;
  show('land');
  toast('Você saiu da conta.');
}

/* ------------------------------ Dados ------------------------------ */

async function togRemote(id) {
  const t = D.tasks.find((x) => sameId(x.id, id));
  t.done = t.done ? 0 : 1;
  if (t.done) lg('Tarefa concluída: ' + t.t);
  render();
  try { await PortfyAPI.tasks.update(t.id, t); } catch (ex) { fail(ex); }
}

async function delRemote(k, id) {
  D[k] = D[k].filter((x) => !sameId(x.id, id));
  render();
  toast('Item excluído.');
  try { await PortfyAPI[API_TABLE[k]].remove(id); } catch (ex) { fail(ex); }
}

async function progRemote(id, n) {
  const p = D.projs.find((x) => sameId(x.id, id));
  p.pr = Math.min(100, Math.max(0, p.pr + n));
  if (p.pr === 100) lg('Projeto concluído: ' + p.t);
  render();
  try { await PortfyAPI.projects.update(p.id, p); } catch (ex) { fail(ex); }
}

/** Botão Salvar da janela modal (tarefa, compromisso, projeto, nota, arquivo e nome). */
async function okMRemote(e) {
  e.preventDefault();
  const v = $('#m1').value.trim(), a = $('#m2')?.value || '', b = $('#m3')?.value || '';
  if (!v) {
    const x = $('#e-m');
    x.textContent = 'Preencha o título para salvar.';
    x.classList.add('on');
    return false;
  }
  try {
    if (mk === 'task') D.tasks.push(await PortfyAPI.tasks.add({ t: v, d: a || today(), done: 0 }));
    if (mk === 'event') {
      D.events.push(await PortfyAPI.events.add({ t: v, d: a || today(), h: b || '09:00' }));
      lg('Compromisso agendado: ' + v);
    }
    if (mk === 'proj') {
      D.projs.push(await PortfyAPI.projects.add({ t: v, desc: a, pr: Math.min(100, Math.max(0, +b || 0)) }));
      lg('Novo projeto criado: ' + v);
    }
    if (mk === 'note') {
      if (mid) {
        const n = D.notes.find((x) => sameId(x.id, mid));
        n.t = v; n.c = a;
        await PortfyAPI.notes.update(n.id, n);
      } else {
        D.notes.unshift(await PortfyAPI.notes.add({ t: v, c: a }));
        lg('Nova nota: ' + v);
      }
    }
    if (mk === 'file') {
      const doc = await PortfyAPI.documents.add(mkDoc(a || 'portfolio', v));
      D.docs.unshift(doc);
      lg('Novo arquivo criado: ' + v);
      closeM(); render(); openEditor(doc.id);
      return false;
    }
    if (mk === 'name') {
      await PortfyAPI.saveProfile(v, D.prof);
      me.name = D.name = v;
      $('#u-nm').textContent = v;
      $('#u-av').textContent = $('#u-av2').textContent = ini(v);
    }
    closeM(); render(); toast('Salvo com sucesso.');
  } catch (ex) {
    fail(ex);
  }
  return false;
}

async function dupDocRemote(id) {
  const c = JSON.parse(JSON.stringify(D.docs.find((x) => sameId(x.id, id))));
  c.title += ' (cópia)';
  try {
    D.docs.unshift(await PortfyAPI.documents.add(c));
    render(); toast('Arquivo duplicado.');
  } catch (ex) { fail(ex); }
}

function delDocRemote(id) { return delRemote('docs', id); }

async function useMRemote(n, pl) {
  if (pl === 'Pro' && D.plan === 'A') return toast('Este modelo faz parte do plano Pro. Veja os planos.');
  const m = MODS.find((x) => x[0] === n);
  try {
    const doc = await PortfyAPI.documents.add(mkDoc(KIND[m[2]], n, { accent: ACC[n] }));
    D.docs.unshift(doc);
    lg('Novo arquivo criado: ' + n);
    openEditor(doc.id);
  } catch (ex) { fail(ex); }
}

/** O plano só pode mudar por um pagamento confirmado no servidor (webhook). */
function setPlanRemote() {
  toast('O plano só muda depois que o pagamento for confirmado. Essa etapa vem a seguir.');
}

async function savePfRemote(e) {
  e.preventDefault();
  D.prof = { role: $('#p1').value.trim(), phone: $('#p2').value.trim(), link: $('#p3').value.trim(), bio: $('#p4').value.trim() };
  lg('Perfil atualizado');
  render();
  try { await PortfyAPI.saveProfile(me.name, D.prof); toast('Perfil salvo.'); } catch (ex) { fail(ex); }
  return false;
}

/* ------------------------------ Editor ------------------------------ */

async function edFlushRemote() {
  if (!Ed.doc) return;
  const doc = Ed.doc;
  doc.upd = Date.now();
  try {
    await PortfyAPI.documents.update(doc.id, doc);
    $('#ed-st').textContent = 'Salvo';
  } catch (ex) {
    $('#ed-st').textContent = 'Erro ao salvar';
    fail(ex);
  }
}

async function edImageRemote(inp) {
  const f = inp.files[0];
  if (!f) return;
  if (f.size > 1.5e6) { inp.value = ''; return toast('Use uma imagem de até 1,5 MB.'); }
  try {
    const src = await PortfyAPI.uploadImage(f);   // vai para o Storage; no elemento fica só a URL
    inp.value = '';
    const img = new Image();
    img.onload = () => {
      const w = Math.min(400, img.width), id = edNextId();
      Ed.doc.els.push({ id, k: 'img', x: 100, y: 100, w, h: Math.round(w * img.height / img.width), src });
      edSelect(id); edSave();
    };
    img.src = src;
  } catch (ex) { fail(ex); }
}

/* ---------------------------- Agente de IA ---------------------------- */

/** Pergunta ao servidor (Edge Function ai-chat). Quem anima a resposta é controllers/ai.controller.js. */
async function replyRemote(v) {
  return PortfyAPI.askAI(v, D.conv);
}
