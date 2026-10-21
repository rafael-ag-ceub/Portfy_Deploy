/* =====================================================================
   PORTFY · js/controllers/app.controller.js
   Camada: Controller
   Navegação entre páginas, menu lateral, busca e calendário
   ===================================================================== */

/** Botão de menu: no computador recolhe a barra lateral; no celular abre e fecha. */
function menu() {
  if (innerWidth > 900) document.body.classList.toggle('nc');
  else $('#app').classList.toggle('sb-open');
}

function go(p, k) {
  if (page === 'ia' && p !== 'ia') aiFinish();     // termina a digitação da IA antes de sair
  page = p;
  if (!k) $('#q').value = '';
  $('#app').classList.remove('sb-open');
  $('#nv').innerHTML = NAV_GROUPS.map(([titulo, ids]) => `<div class="nv-g">${titulo}</div>` + ids.map((id) => {
    const n = NAV.find((x) => x[0] === id);
    return `<button class="ni ${id === p ? 'on' : ''}" onclick="go('${id}')" ${id === p ? 'aria-current="page"' : ''}>${ico(n[2])}<span>${n[1]}</span></button>`;
  }).join('')).join('');
  render();
  scrollTo(0, 0);
}

function mon(n) {
  cal.setDate(1);
  cal.setMonth(cal.getMonth() + n);
  render();
}

function search() {
  if (!['mod', 'notas', 'proj', 'por'].includes(page)) return go('mod', 1);
  render();
}

function notif() {
  const n = D.tasks.filter((t) => !t.done && t.d <= today()).length;
  toast(n ? `Você tem ${n} tarefa(s) para hoje ou atrasada(s).` : 'Nenhuma tarefa para hoje. Bom trabalho!');
}
