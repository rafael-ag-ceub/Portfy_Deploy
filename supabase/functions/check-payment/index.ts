// =====================================================================
// PORTFY · supabase/functions/check-payment/index.ts
// Camada: CONTROLLER. Quando a pessoa volta do Mercado Pago, o site pergunta aqui
// "esse pagamento foi aprovado?". A função consulta o Mercado Pago (não confia no
// navegador) e libera o plano na hora, sem esperar o aviso (webhook).
// Corpo: { payment_id: '12345' }  ou  { reference: '<id do pagamento no Portfy>' }
//
// Deploy:  npx supabase functions deploy check-payment
// =====================================================================
import { cors, json } from '../_shared/cors.ts'
import { adminClient, userClient } from '../_shared/clients.ts'
import { mpFetch, processPayment } from '../_shared/mercadopago.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  try {
    const { data: { user }, error: authError } = await userClient(req).auth.getUser()
    if (authError || !user) return json({ error: 'Não autenticado.' }, 401)
    const admin = adminClient()
    const body = await req.json().catch(() => ({}))

    let paymentId = String(body.payment_id ?? '').replace(/\D/g, '')
    if (!paymentId && body.reference) {
      // sem payment_id (ex.: Pix ainda pendente): procura pelo pedido do Portfy
      const { data: row } = await admin.from('pagamentos').select('id, usuario_id').eq('id', String(body.reference)).maybeSingle()
      if (!row || row.usuario_id !== user.id) return json({ error: 'not_found' }, 404)
      const found = await mpFetch(`/v1/payments/search?external_reference=${encodeURIComponent(row.id)}&sort=date_created&criteria=desc`)
      paymentId = String(found?.results?.[0]?.id ?? '')
    }
    if (!paymentId) return json({ ok: true, status: 'pendente' })

    const out = await processPayment(admin, paymentId, user.id)
    return json(out, out.ok ? 200 : 400)
  } catch (err) {
    console.error('check-payment:', err)
    return json({ error: 'server', message: (err as Error).message }, 500)
  }
})
