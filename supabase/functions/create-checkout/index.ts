// =====================================================================
// PORTFY · supabase/functions/create-checkout/index.ts
// Camada: CONTROLLER. Cria o pagamento (Mercado Pago Checkout Pro) e devolve o link.
// Quem chama: o site, com o usuário logado.   Corpo: { plan: 'B' | 'C', return_url: '...' }
// O PREÇO vem sempre da tabela planos: o navegador nunca decide quanto cobrar.
//
// Deploy:  npx supabase functions deploy create-checkout
// Secrets: MP_ACCESS_TOKEN, SITE_URL (e, opcional, ALLOWED_RETURN_ORIGINS)
// =====================================================================
import { cors, json } from '../_shared/cors.ts'
import { adminClient, userClient } from '../_shared/clients.ts'
import { mpFetch } from '../_shared/mercadopago.ts'

/** Só devolve o cliente para endereços do próprio site (evita redirecionamento malicioso). */
function safeReturnUrl(candidate: unknown): string | null {
  const allowed = [Deno.env.get('SITE_URL'), ...(Deno.env.get('ALLOWED_RETURN_ORIGINS') ?? '').split(',')]
    .map((s) => (s ?? '').trim()).filter(Boolean)
  try {
    const u = new URL(String(candidate))
    const ok = allowed.some((a) => { try { return new URL(a).origin === u.origin } catch { return false } })
    return ok ? u.origin + u.pathname : null
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)
  try {
    const { data: { user }, error: authError } = await userClient(req).auth.getUser()
    if (authError || !user) return json({ error: 'Não autenticado.' }, 401)

    const body = await req.json().catch(() => ({}))
    const returnUrl = safeReturnUrl(body.return_url ?? Deno.env.get('SITE_URL'))
    if (!returnUrl) return json({ error: 'return_url', message: 'Endereço de retorno não permitido. Confira SITE_URL / ALLOWED_RETURN_ORIGINS.' }, 400)

    const admin = adminClient()
    const { data: plano } = await admin.from('planos').select('*').eq('codigo', String(body.plan ?? '')).maybeSingle()
    if (!plano || plano.preco_centavos <= 0) return json({ error: 'plan', message: 'Plano inválido.' }, 400)

    // 1. registra o pedido (pendente); o id vira a "external_reference" no Mercado Pago
    const { data: pag, error: e1 } = await admin.from('pagamentos').insert({
      usuario_id: user.id, codigo_plano: plano.codigo, valor_centavos: plano.preco_centavos,
      moeda: 'BRL', status: 'pendente', provedor: 'mercadopago',
    }).select('id').single()
    if (e1) throw e1

    // 2. cria a preferência de pagamento
    const base = Deno.env.get('SUPABASE_URL')!
    const preference = await mpFetch('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [{
          id: plano.codigo, title: `Portfy ${plano.nome} · 30 dias`, quantity: 1,
          currency_id: 'BRL', unit_price: plano.preco_centavos / 100,
        }],
        payer: { email: user.email },
        external_reference: pag.id,
        notification_url: `${base}/functions/v1/payment-webhook`,
        back_urls: { success: `${returnUrl}?pagamento=sucesso`, pending: `${returnUrl}?pagamento=pendente`, failure: `${returnUrl}?pagamento=falha` },
        ...(returnUrl.startsWith('https://') ? { auto_return: 'approved' } : {}),   // o Mercado Pago só aceita retorno automático para endereço https
        statement_descriptor: 'PORTFY',
        binary_mode: false,
        metadata: { usuario_id: user.id, plano: plano.codigo, pagamento_id: pag.id },
      }),
    }, pag.id)

    await admin.from('pagamentos').update({ ref_provedor: `pref:${preference.id}` }).eq('id', pag.id)
    return json({ checkout_url: preference.init_point, sandbox_url: preference.sandbox_init_point, payment_id: pag.id })
  } catch (err) {
    console.error('create-checkout:', err)
    return json({ error: 'server', message: (err as Error).message }, 500)
  }
})
