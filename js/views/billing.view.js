/* =====================================================================
   PORTFY · js/views/billing.view.js
   Camada: View
   Tela de Planos (comparação, validade, histórico) e janela de pagamento.
   ===================================================================== */

const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dmy = (ts) => new Date(ts).toLocaleDateString('pt-BR');

/** Dias que faltam para o plano vencer (null = sem vencimento). */
function planDaysLeft() {
  if (D.plan === 'A' || !D.planEnd) return null;
  return Math.ceil((Date.parse(D.planEnd) - Date.now()) / 864e5);
}

function planPage(ph) {
  const left = planDaysLeft();
  const cur = PL[D.plan];
  const banner = D.plan === 'A'
    ? `<div class="pl-ban"><div><span class="chip n">Plano atual</span><h3>Gratuito</h3><p>Você já pode criar currículos, portfólios, notas e projetos. Assine para liberar modelos Pro, mais IA e exportação em alta qualidade.</p></div></div>`
    : `<div class="pl-ban on"><div><span class="chip">Plano atual</span><h3>${cur[0]}</h3><p>${left === null ? 'Plano ativo.' : left > 0 ? `Válido até <b>${dmy(D.planEnd)}</b> · ${left} ${left === 1 ? 'dia restante' : 'dias restantes'}.` : 'Seu plano venceu. Renove para continuar.'}</p></div>${left !== null && left <= 7 ? `<button class="btn p" onclick="openCheckout('${D.plan}')">Renovar por mais 30 dias</button>` : ''}</div>`;

  const cards = Object.entries(PL).map(([k, p]) => {
    const isCur = D.plan === k;
    const label = k === 'A' ? (isCur ? 'Plano atual' : 'Incluído') : isCur ? 'Renovar +30 dias' : (D.plan !== 'A' && PL_PRICE[k] < PL_PRICE[D.plan]) ? 'Trocar para ' + p[0] : 'Assinar ' + p[0];
    const dis = k === 'A';
    return `<div class="cd pcn ${isCur ? 'cur' : ''} ${k === 'B' ? 'hot' : ''}">
      ${k === 'B' ? '<span class="tagp">Mais escolhido</span>' : ''}
      <h3>${p[0]}</h3>
      <div class="pcn-p"><b>${p[1]}</b><small>${k === 'A' ? '' : '/30 dias'}</small></div>
      <ul>${p[2].map((i) => `<li>${ico('check')}${i}</li>`).join('')}<li>${ico('check')}${PL_IA[k]} mensagens de IA por dia</li></ul>
      <button class="btn bl ${k === 'B' && !isCur ? 'p' : ''}" ${dis ? 'disabled' : ''} onclick="openCheckout('${k}')">${label}</button>
    </div>`;
  }).join('');

  const pays = (D.pays || []);
  const hist = pays.length
    ? `<div class="cd" style="margin-top:20px"><h3>Histórico de pagamentos</h3><div class="tbl-w"><table class="tbl"><thead><tr><th>Data</th><th>Plano</th><th>Valor</th><th>Forma</th><th>Situação</th></tr></thead><tbody>${pays.map((x) => {
        const st = PAY_ST[x.st] || [x.st, 'wa'];
        return `<tr><td>${dmy(x.ts)}</td><td>${PL[x.plan] ? PL[x.plan][0] : x.plan}</td><td>${brl(x.cents)}</td><td>${esc(payWay(x.how))}</td><td><span class="pst ${st[1]}">${st[0]}</span></td></tr>`;
      }).join('')}</tbody></table></div></div>` : '';

  return ph('Planos', '', 'Escolha o que combina com você')
    + banner
    + `<div class="gr g3 plans-a">${cards}</div>
    <div class="trust">
      <div>${ico('shield')}<span><b>Pagamento seguro</b>Processado pelo Mercado Pago. O Portfy não vê nem guarda dados do seu cartão.</span></div>
      <div>${ico('clock')}<span><b>Sem renovação automática</b>Cada pagamento libera 30 dias. Nada é cobrado sem você pedir.</span></div>
      <div>${ico('check')}<span><b>Liberação imediata</b>Pix, cartão de crédito, débito ou boleto. O plano ativa assim que o pagamento é aprovado.</span></div>
    </div>${hist}`;
}

const payWay = (h) => ({ account_money: 'Saldo Mercado Pago', credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito', bank_transfer: 'Pix', ticket: 'Boleto', simulado: 'Simulação' }[h] || (h ? h : '—'));

/** Janela de confirmação antes de ir para o Mercado Pago. */
function openCheckout(k) {
  const p = PL[k]; if (!p || k === 'A') return;
  const real = USE_SUPABASE;
  $('#info-md').innerHTML = `<h3>Assinar ${p[0]}</h3>
    <div class="ck-sum"><div><span>Plano</span><b>${p[0]}</b></div><div><span>Duração</span><b>30 dias</b></div><div class="tot"><span>Total</span><b>${brl(PL_PRICE[k])}</b></div></div>
    <ul class="ck-li">${p[2].map((i) => `<li>${ico('check')}${i}</li>`).join('')}<li>${ico('check')}${PL_IA[k]} mensagens de IA por dia</li></ul>
    <p class="ck-n">${real ? 'Você será levado ao ambiente seguro do Mercado Pago para pagar com Pix, cartão ou boleto e volta para o Portfy em seguida.' : 'Modo demonstração: o pagamento é simulado e nenhuma cobrança é feita.'}</p>
    <div class="err" id="ck-err"></div>
    <div class="ma"><button type="button" class="btn" onclick="closeInfo()">Cancelar</button><button type="button" class="btn p" id="ck-go" onclick="startCheckout('${k}')">${real ? 'Ir para o pagamento' : 'Simular pagamento'}</button></div>`;
  $('#info-ov').classList.add('on');
}
