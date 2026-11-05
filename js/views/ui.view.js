/* =====================================================================
   PORTFY · js/views/ui.view.js
   Camada: View
   Elementos de interface: avisos, troca de telas, tema, menu da landing
   e janelas de informação do rodapé.
   ===================================================================== */

function toast(m, ms = 2800) {
  const t = $('#ts');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(tm);
  tm = setTimeout(() => t.classList.remove('on'), ms);
}

function show(id) {
  $$('.scr').forEach((s) => s.classList.remove('on'));
  $('#' + id).classList.add('on');
  scrollTo(0, 0);
}

function auth(t) {
  show('auth');
  $$('.ac').forEach((c) => c.classList.toggle('on', c.id === 'a-' + t));
  $$('.err').forEach((e) => e.classList.remove('on'));
}

function err(id, m) {
  const e = $('#e-' + id);
  e.textContent = m;
  e.classList.add('on');
}

/** Mostra ou esconde a senha. O botão ganha .on quando a senha está visível (o risco some). */
function eye(id) {
  const input = $('#' + id);
  input.type = input.type === 'password' ? 'text' : 'password';
  const btn = input.parentElement.querySelector('.eye');
  if (btn) {
    btn.classList.toggle('on', input.type === 'text');
    btn.title = input.type === 'text' ? 'Ocultar senha' : 'Mostrar senha';
    btn.setAttribute('aria-label', btn.title);
  }
}

function rule() {
  const h = $('#r-h'), ok = pwOk($('#r-pw').value);
  h.classList.toggle('ok', ok);
  h.textContent = ok ? 'Senha forte.' : 'Use 8 ou mais caracteres, com uma letra maiúscula e um número.';
}

/** Tela "nova senha": mede a força, marca os requisitos e só libera o botão quando está tudo certo. */
function npCheck() {
  const pw = $('#n-pw').value, cf = $('#n-cf').value;
  const r = [pw.length >= 8, /[A-Z]/.test(pw), /\d/.test(pw)];
  r.forEach((v, i) => $('#np-r' + (i + 1)).classList.toggle('on', v));
  const score = !pw ? 0 : Math.min(4, r.filter(Boolean).length + (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw) ? 1 : 0)) || 1;
  const nomes = ['Digite uma senha para ver a força dela.', 'Senha fraca', 'Senha razoável', 'Senha boa', 'Senha forte'];
  $('#np-meter').dataset.s = pw && !r.every(Boolean) ? Math.min(score, 2) : score;
  $('#np-ml').textContent = pw && !r.every(Boolean) ? 'Senha ainda não atende aos requisitos.' : nomes[score];
  $('#np-ml').classList.toggle('ok', score >= 3 && r.every(Boolean));
  const m = $('#np-m'), igual = !!cf && pw === cf;
  m.textContent = !cf ? '' : igual ? 'As senhas coincidem.' : 'As senhas ainda não coincidem.';
  m.classList.toggle('ok', igual);
  m.classList.toggle('er', !!cf && !igual);
  $('#np-btn').disabled = !(r.every(Boolean) && igual);
}

/** Limpa a tela "nova senha" (campos, medidor e mensagens). */
function npReset() {
  ['#n-pw', '#n-cf'].forEach((s) => { $(s).value = ''; $(s).type = 'password'; });
  $$('#a-newpass .eye').forEach((b) => b.classList.remove('on'));
  npCheck();
  $('#e-newpass').classList.remove('on');
}

function stp() {
  const n = ['d1', 'd2', 'd3'].filter((i) => $('#' + i).value).length;
  $('#s2').classList.toggle('on', n >= 1);
  $('#s3').classList.toggle('on', n >= 2);
}

function theme() {
  const r = document.documentElement, dk = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
  r.dataset.theme = dk ? 'light' : 'dark';
  ls.set('pf_theme', r.dataset.theme);
  if (page === 'cfg' && me) render();
}

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
};

function fitThumbs() {
  $$('.th2').forEach((t) => {
    t.firstElementChild.style.transform = `scale(${t.clientWidth / +t.dataset.w})`;
  });
}

/* ---------- landing: menu no celular ---------- */
function navMenu() { $('#nav').classList.toggle('open'); }
function navClose() { $('#nav').classList.remove('open'); }

/* ---------- janelas de informação do rodapé ---------- */
function info(key) {
  const item = INFO[key];
  if (!item) return;
  $('#info-md').innerHTML = `<h3>${item[0]}</h3>${item[1]}<div class="ma"><button type="button" class="btn p" onclick="closeInfo()">Entendi</button></div>`;
  $('#info-ov').classList.add('on');
  if (key === 'status') statusDetail();
}
function closeInfo() { $('#info-ov').classList.remove('on'); }

/** Estado do sistema mostrado no selo do rodapé. ok: true | false | null (modo demonstração) */
const STATUS = { ok: null, msg: '' };
function setStatus(ok, msg) {
  STATUS.ok = ok; STATUS.msg = msg;
  const pill = $('#status-pill');
  pill.classList.toggle('off', ok !== true);
  $('#status-txt').textContent = ok === true ? 'Todos os sistemas operacionais' : ok === false ? 'Banco de dados indisponível' : 'Modo demonstração (dados locais)';
}
function statusDetail() {
  const d = $('#status-detail');
  if (!d) return;
  d.textContent = STATUS.ok === true ? 'Conexão com o Supabase funcionando: login, banco de dados e armazenamento respondendo.'
    : STATUS.ok === false ? 'Não foi possível falar com o banco de dados agora. ' + STATUS.msg
    : 'O site está em modo demonstração: os dados ficam salvos só neste navegador. Preencha js/config.js para conectar ao Supabase.';
}
