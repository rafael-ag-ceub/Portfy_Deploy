/* =====================================================================
   PORTFY · js/controllers/profile.controller.js
   Camada: Controller
   Perfil: dados pessoais, foto, habilidades e quanto do perfil está pronto.
   Funciona nos dois modos (demonstração e Supabase).
   ===================================================================== */

let PF_SK = [];   // habilidades em edição

/** Foto (se houver) ou iniciais. */
const avInner = () => (D && D.avatar ? `<img src="${esc(D.avatar)}" alt="Foto de ${esc(me.name)}">` : esc(ini(me.name)));

/** Atualiza nome, e-mail e foto no menu lateral e no topo. */
function syncUser() {
  ['#u-av', '#u-av2'].forEach((s) => { $(s).innerHTML = avInner(); $(s).classList.toggle('has-img', !!D.avatar); });
  $('#u-nm').textContent = me.name;
  $('#u-em').textContent = me.email;
}

/** Quanto do perfil já está preenchido (0–100) e o que falta. */
function profileScore() {
  const P = D.prof || {};
  const items = [
    ['Foto', !!D.avatar], ['Profissão', !!P.role], ['Telefone', !!P.phone], ['Link do portfólio', !!P.link],
    ['Localização', !!P.loc], ['LinkedIn ou GitHub', !!(P.li || P.gh)], ['Biografia', (P.bio || '').length >= 40], ['Habilidades', (P.skills || []).length >= 3],
  ];
  const done = items.filter((i) => i[1]).length;
  return { pct: Math.round((done / items.length) * 100), missing: items.filter((i) => !i[1]).map((i) => i[0]) };
}

/* ---- habilidades (tags) ---- */
function skDraw() {
  const box = $('#p-tags'); if (!box) return;
  box.innerHTML = PF_SK.map((t, i) => `<span class="tag">${esc(t)}<button type="button" onclick="skDel(${i})" aria-label="Remover ${esc(t)}">×</button></span>`).join('');
}
function skAdd(raw) {
  raw.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
    if (PF_SK.length < 20 && t.length <= 30 && !PF_SK.some((x) => x.toLowerCase() === t.toLowerCase())) PF_SK.push(t);
  });
  skDraw();
}
function skDel(i) { PF_SK.splice(i, 1); skDraw(); }
function skKey(e) {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); skAdd(e.target.value); e.target.value = ''; }
  else if (e.key === 'Backspace' && !e.target.value && PF_SK.length) { PF_SK.pop(); skDraw(); }
}
function skBlur(el) { if (el.value.trim()) { skAdd(el.value); el.value = ''; } }

/* ---- foto ---- */
/** Corta a imagem em quadrado, reduz para 320px e devolve um Blob JPEG. */
function avatarBlob(file) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height), c = document.createElement('canvas');
      c.width = c.height = 320;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 320, 320);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível ler a imagem.'))), 'image/jpeg', 0.88);
    };
    img.onerror = () => reject(new Error('Esse arquivo não parece ser uma imagem.'));
    img.src = url;
  });
}
const blobToDataURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

async function pickAvatar(input) {
  const f = input.files && input.files[0]; input.value = '';
  if (!f) return;
  if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return toast('Use uma imagem PNG, JPG ou WebP.');
  if (f.size > 8 * 1024 * 1024) return toast('A imagem é grande demais (máximo 8 MB).');
  try {
    const blob = await avatarBlob(f);
    D.avatar = USE_SUPABASE ? await PortfyAPI.uploadAvatar(blob) : await blobToDataURL(blob);
    lg('Foto de perfil atualizada'); if (!USE_SUPABASE) save();
    syncUser(); render(); toast('Foto atualizada.');
  } catch (ex) { toast(PortfyAPI.friendly ? PortfyAPI.friendly(ex) : ex.message); }
}
async function removeAvatar() {
  D.avatar = '';
  try { if (USE_SUPABASE) await PortfyAPI.saveAvatarUrl(null); else save(); } catch (ex) { return toast(ex.message); }
  syncUser(); render(); toast('Foto removida.');
}

/* ---- salvar ---- */
async function savePf(e) {
  e.preventDefault();
  const v = (id) => ($(id) ? $(id).value.trim() : '');
  const name = v('#p0').replace(/\s+/g, ' ');
  if (name.length < 2) return toast('Informe seu nome.');
  const fixUrl = (u) => (u && !/^https?:\/\//i.test(u) ? 'https://' + u : u);
  const bad = [['#p3', 'link do portfólio'], ['#p6', 'LinkedIn'], ['#p7', 'GitHub']].find(([id]) => { try { return v(id) && new URL(fixUrl(v(id))) && false; } catch (_) { return true; } });
  if (bad) return toast('O ' + bad[1] + ' não parece um endereço válido.');
  skBlur($('#p5'));
  D.prof = { role: v('#p1'), phone: v('#p2'), link: fixUrl(v('#p3')), bio: v('#p4'), loc: v('#p8'), li: fixUrl(v('#p6')), gh: fixUrl(v('#p7')), skills: [...PF_SK] };
  me.name = D.name = name;
  try {
    if (USE_SUPABASE) await PortfyAPI.saveProfile(name, D.prof); else save();
    lg('Perfil atualizado'); syncUser(); render(); toast('Perfil salvo.');
  } catch (ex) { toast(PortfyAPI.friendly ? PortfyAPI.friendly(ex) : ex.message); }
  return false;
}
