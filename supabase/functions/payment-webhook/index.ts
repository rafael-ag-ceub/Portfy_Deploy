// =====================================================================
// PORTFY · supabase/functions/payment-webhook/index.ts
// Camada: CONTROLLER. Recebe o aviso do Mercado Pago ("o pagamento X mudou").
// Quem chama é o Mercado Pago (não há usuário logado), então:
//   - a função é publicada SEM verificação de login (--no-verify-jwt);
//   - a proteção é a ASSINATURA x-signature (MP_WEBHOOK_SECRET) + consulta direta
//     ao Mercado Pago antes de liberar qualquer plano.
//
// Deploy:  npx supabase functions deploy payment-webhook --no-verify-jwt
// Secrets: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET
// URL (cole no painel do Mercado Pago):
//   https://<SEU-PROJETO>.supabase.co/functions/v1/payment-webhook
// =====================================================================
import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/clients.ts'
import { processPayment, verifySignature } from '../_shared/mercadopago.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  try {
    const url = new URL(req.url)
    const body = await req.json().catch(() => ({}))
    const type = String(body.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '')
    const dataId = String(url.searchParams.get('data.id') ?? body?.data?.id ?? url.searchParams.get('id') ?? '')

    // 1. a assinatura precisa estar correta
    if (!(await verifySignature(req, dataId))) {
      console.warn('Assinatura inválida ou webhook sem segredo configurado.')
      return json({ error: 'Assinatura inválida.' }, 401)
    }

    // 2. só interessam avisos de pagamento
    if (type !== 'payment' || !dataId) return json({ ok: true, ignored: type })

    // 3. consulta no Mercado Pago, confere valor e libera o plano
    const out = await processPayment(adminClient(), dataId)
    console.log('Pagamento', dataId, '->', out)
    return json({ ok: true, ...out })
  } catch (err) {
    console.error('payment-webhook:', err)
    return json({ error: 'server' }, 500)   // erro 5xx: o Mercado Pago tenta de novo mais tarde
  }
})
