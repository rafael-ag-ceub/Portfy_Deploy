// =====================================================================
// PORTFY · supabase/functions/_shared/chat.repository.ts
// Camada: Persistence. Todo acesso ao banco do chat passa por aqui.
// =====================================================================
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

/* O banco guarda o papel em português (enum papel_ia: 'usuario' | 'assistente').
   A API da IA (Anthropic) exige 'user' | 'assistant'. A conversão fica só aqui. */
const PAPEL_PARA_API: Record<string, string> = { usuario: 'user', assistente: 'assistant' }

export async function getQuota(userDb: SupabaseClient) {
  const { data } = await userDb.rpc('ai_quota')
  return { used: data?.used ?? 0, limit: data?.limit ?? 10 }
}

/** Reaproveita a conversa (se for do usuário) ou cria uma nova. */
export async function ensureConversation(
  userDb: SupabaseClient, admin: SupabaseClient, userId: string, conversationId: string | null, firstMessage: string,
): Promise<string> {
  if (conversationId) {
    const { data } = await userDb.from('ia_conversas').select('id').eq('id', conversationId).maybeSingle()
    if (data) return data.id
  }
  const { data, error } = await admin.from('ia_conversas')
    .insert({ usuario_id: userId, titulo: firstMessage.slice(0, 60) }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function getHistory(userDb: SupabaseClient, conversationId: string) {
  const { data } = await userDb.from('ia_mensagens').select('papel, conteudo')
    .eq('conversa_id', conversationId).order('criado_em', { ascending: false }).order('papel', { ascending: false }).limit(12)
  const history = (data ?? []).reverse().map((m) => ({ role: PAPEL_PARA_API[m.papel as string] ?? 'user', content: m.conteudo as string }))
  while (history.length && history[0].role !== 'user') history.shift() // a API exige começar por 'user'
  return history
}

export async function getUserContext(userDb: SupabaseClient, userId: string) {
  const { data: profile } = await userDb.from('perfis').select('nome_completo, profissao').eq('id', userId).maybeSingle()
  const { data: diag } = await userDb.from('diagnosticos').select('fase_academica, mercado_alvo, horas_estudo').eq('usuario_id', userId).maybeSingle()
  return { profile, diag }
}

export async function saveExchange(
  admin: SupabaseClient,
  p: { conversationId: string; userId: string; message: string; reply: string; tokensIn: number; tokensOut: number },
) {
  // Horários explícitos (1 ms de diferença): no mesmo INSERT o banco daria o mesmo "now()" às duas
  // mensagens e a ordem pergunta/resposta poderia se inverter ao reabrir a conversa.
  const agora = Date.now()
  const { error: e1 } = await admin.from('ia_mensagens').insert([
    { conversa_id: p.conversationId, usuario_id: p.userId, papel: 'usuario', conteudo: p.message, criado_em: new Date(agora - 1).toISOString() },
    { conversa_id: p.conversationId, usuario_id: p.userId, papel: 'assistente', conteudo: p.reply, tokens_entrada: p.tokensIn, tokens_saida: p.tokensOut, criado_em: new Date(agora).toISOString() },
  ])
  if (e1) throw e1
  const { error: e2 } = await admin.rpc('ai_register_usage', { p_user: p.userId, p_tokens: p.tokensIn + p.tokensOut })
  if (e2) throw e2
  await admin.from('ia_conversas').update({ atualizado_em: new Date().toISOString() }).eq('id', p.conversationId)
}
