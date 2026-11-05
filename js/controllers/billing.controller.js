/* =====================================================================
   PORTFY · js/controllers/billing.controller.js
   Camada: Controller
   Compra de plano: abre o checkout do Mercado Pago, trata a volta e
   confere o pagamento no servidor. Em modo demonstração, simula.
   ===================================================================== */

async function startCheckout(k) {
  const btn = $('#ck-go'), err = $('#ck-err');
  if (!USE_SUPABASE) {                       // demonstração: ativa localmente
    const end = Date.now() + PL_DAYS * 864e5;
    D.plan = k; D.planEnd = new Date(end).toISOString();
    (D.pays = D.pays || []).unshift({ id: 'd' + Date.now(), plan: k, cents: PL_PRICE[k], st: 'pago', how: 'simulado', ts: Date.now() });
    lg('Plano ' + PL[k][0] + ' ativado (simulação)'); save(); closeInfo(); render();
    return toast('Plano ' + PL[k][0] + ' ativado (simulação, sem cobrança).');
  }
  btn.disabled = true; btn.textContent = 'Preparando…'; err.classList.remove('on');
  try {
    const r = await PortfyAPI.createCheckout(k, REDIRECT_URL);
    if (!r.checkout_url) throw new Error('O Mercado Pago não devolveu o link de pagamento.');
    btn.textContent = 'Abrindo o Mercado Pago…';
    location.href = r.checkout_url;           // volta para REDIRECT_URL?pagamento=...
  } catch (ex) {
    err.textContent = ex.message; err.classList.add('on');
    btn.disabled = false; btn.textContent = 'Tentar de novo';
  }
}

/** Chamado após entrar no app: trata ?pagamento=sucesso|pendente|falha vindo do Mercado Pago. */
async function handlePaymentReturn() {
  const res = QS.get('pagamento'); if (!res) return;
  const pid = QS.get('payment_id') || QS.get('collection_id') || '';
  const ref = QS.get('external_reference') || '';
  history.replaceState(null, '', location.pathname);       // limpa o endereço
  go('plan');
  if (res === 'falha') return toast('O pagamento não foi concluído. Nenhuma cobrança foi feita.', 5000);
  toast('Confirmando seu pagamento…', 4000);
  for (let i = 0; i < 6; i++) {                             // tenta por ~30s (Pix/cartão podem demorar um pouco)
    try {
      const r = await PortfyAPI.checkPayment({ payment_id: pid, reference: ref });
      if (r.status === 'pago') { D = { ...(await PortfyAPI.load()), chat: D.chat }; render(); return toast('Pagamento aprovado! Seu plano já está ativo.', 6000); }
      if (r.status === 'falhou') return toast('O pagamento não foi aprovado.', 5000);
    } catch (ex) { console.warn(ex); }
    await new Promise((r) => setTimeout(r, 5000));
  }
  toast('Pagamento em análise. Assim que for aprovado, o plano ativa sozinho (atualize a página).', 7000);
}
