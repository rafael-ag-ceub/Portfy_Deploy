// =====================================================================
// PORTFY · supabase/functions/_shared/ai.service.ts
// Camada: serviço externo. É o ÚNICO arquivo que conhece o provedor de IA.
//
// Provedores aceitos (escolhidos pelos secrets do Supabase):
//   gemini    GEMINI_API_KEY   (camada gratuita no Google AI Studio)
//   anthropic ANTHROPIC_API_KEY
//   openai    AI_API_KEY + AI_BASE_URL + AI_MODEL (qualquer serviço compatível com a API da OpenAI)
//
// Como o provedor é escolhido:
//   1. AI_PROVIDER, se estiver definido;
//   2. senão, gemini quando existir GEMINI_API_KEY;
//   3. senão, anthropic.
// O modelo pode ser trocado com AI_MODEL, sem mexer no código.
// =====================================================================
const MAX_TOKENS = 700

export class AiUnavailableError extends Error { status = 0 }
const falha = (msg: string, status: number) => { const e = new AiUnavailableError(msg); e.status = status; return e }

type Msg = { role: string; content: string }
type Result = { reply: string; tokensIn: number; tokensOut: number }

const env = (k: string) => Deno.env.get(k) ?? ''
const FALLBACK = 'Não consegui responder agora. Pode reformular?'

const provedor = () => env('AI_PROVIDER') || (env('GEMINI_API_KEY') ? 'gemini' : 'anthropic')

/** Traduz o erro do provedor em um motivo curto, que aparece no chat. */
function motivo(status: number, corpo: string): string {
  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID|invalid x-api-key/i.test(corpo)) return 'chave da IA inválida ou revogada'
  if (status === 503) return 'o serviço de IA está sobrecarregado agora: tente de novo em instantes'
  if (status === 500 || status === 502 || status === 504) return 'instabilidade temporária no provedor de IA'
  if (status === 404) return 'modelo indisponível ou com outro nome: troque com AI_MODEL'
  if (status === 429 || /RESOURCE_EXHAUSTED|rate.?limit/i.test(corpo)) return 'limite de uso da IA atingido: tente de novo mais tarde'
  if (/credit/i.test(corpo)) return 'sem crédito na conta do provedor'
  return 'erro do provedor de IA'
}

/** Faz a chamada HTTP e devolve o JSON; qualquer falha vira AiUnavailableError. */
const ESPERAS = [800, 1500]   // em falhas temporárias (500, 502, 503, 504), tenta mais 2 vezes
async function chamar(url: string, headers: Record<string, string>, body: unknown, esperas: number[] = ESPERAS) {
  for (let tentativa = 0; ; tentativa++) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
    if (res.ok) return await res.json()
    const corpo = await res.text()
    console.error(`Erro da IA (tentativa ${tentativa + 1}):`, res.status, corpo)   // detalhes completos ficam nos Logs da função
    if ([500, 502, 503, 504].includes(res.status) && tentativa < esperas.length) {
      await new Promise((r) => setTimeout(r, esperas[tentativa]))
      continue
    }
    throw falha(`A IA está indisponível agora (${motivo(res.status, corpo)}, código ${res.status}).`, res.status)
  }
}

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta'
const recuperavel = (e: unknown) => e instanceof AiUnavailableError && [404, 429, 500, 502, 503, 504].includes(e.status)

/** Lista os modelos de texto disponíveis para a chave (os nomes mudam com o tempo). Guarda por 10 minutos. */
let cacheModelos: { quando: number; nomes: string[] } | null = null
async function descobrirModelos(): Promise<string[]> {
  if (cacheModelos && Date.now() - cacheModelos.quando < 600_000) return cacheModelos.nomes
  try {
    const res = await fetch(`${GEMINI}/models?pageSize=100`, { headers: { 'x-goog-api-key': env('GEMINI_API_KEY') } })
    if (!res.ok) return []
    const lista: { name: string; supportedGenerationMethods?: string[] }[] = (await res.json()).models ?? []
    const nomes = lista
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace('models/', ''))
      .filter((n) => /flash/.test(n) && !/image|tts|live|audio|embed|vision|exp|preview/.test(n))
      .sort((a, b) => Number(/lite/.test(b)) - Number(/lite/.test(a)))   // os "lite" têm menos fila
    cacheModelos = { quando: Date.now(), nomes }
    return nomes
  } catch { return [] }
}

async function viaGemini(system: string, messages: Msg[]): Promise<Result> {
  // O Google desativa modelos antigos para contas novas (o 2.5-flash já não aceita). Troque com AI_MODEL se precisar.
  const escolhidos = [env('AI_MODEL') || 'gemini-3.8-flash', env('AI_FALLBACK_MODEL')].filter(Boolean)
  const tentados = new Set<string>()
  let ultimo: unknown = null
  // 1. o modelo principal (com novas tentativas) e o reserva, se existir
  for (const m of escolhidos) {
    try { return await geminiComModelo(m, system, messages, m === escolhidos[0] ? ESPERAS : []) }
    catch (e) { if (!recuperavel(e)) throw e; ultimo = e; tentados.add(m) }
  }
  // 2. se ainda assim falhou, procura sozinha outros modelos disponíveis (até 2)
  for (const m of (await descobrirModelos()).filter((n) => !tentados.has(n)).slice(0, 2)) {
    try { console.log('IA: usando o modelo alternativo', m); return await geminiComModelo(m, system, messages, []) }
    catch (e) { if (!recuperavel(e)) throw e; ultimo = e }
  }
  throw ultimo
}

async function geminiComModelo(model: string, system: string, messages: Msg[], esperas: number[]): Promise<Result> {
  const generationConfig: Record<string, unknown> = { maxOutputTokens: 4096 }
  // Nos modelos 2.5 Flash, o "pensamento" consome o limite de saída; desligamos para sobrar espaço à resposta
  if (/2\.5-flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 }

  const out = await chamar(
    `${GEMINI}/models/${model}:generateContent`,
    { 'x-goog-api-key': env('GEMINI_API_KEY') },
    {
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig,
    },
    esperas,
  )
  const parts = out.candidates?.[0]?.content?.parts ?? []
  const reply = parts.map((p: { text?: string }) => p.text ?? '').join('').trim() || FALLBACK
  return { reply, tokensIn: out.usageMetadata?.promptTokenCount ?? 0, tokensOut: out.usageMetadata?.candidatesTokenCount ?? 0 }
}

async function viaAnthropic(system: string, messages: Msg[]): Promise<Result> {
  const out = await chamar(
    'https://api.anthropic.com/v1/messages',
    { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
    { model: env('AI_MODEL') || 'claude-haiku-4-5-20251001', max_tokens: MAX_TOKENS, system, messages },
  )
  const reply = (out.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text).join('\n').trim() || FALLBACK
  return { reply, tokensIn: out.usage?.input_tokens ?? 0, tokensOut: out.usage?.output_tokens ?? 0 }
}

async function viaOpenAI(system: string, messages: Msg[]): Promise<Result> {
  const base = env('AI_BASE_URL').replace(/\/$/, '')
  if (!base || !env('AI_MODEL')) throw falha('IA não configurada no servidor (faltam AI_BASE_URL e AI_MODEL).', 0)
  const out = await chamar(
    `${base}/chat/completions`,
    { Authorization: `Bearer ${env('AI_API_KEY')}` },
    { model: env('AI_MODEL'), max_tokens: MAX_TOKENS, messages: [{ role: 'system', content: system }, ...messages] },
  )
  const reply = (out.choices?.[0]?.message?.content ?? '').trim() || FALLBACK
  return { reply, tokensIn: out.usage?.prompt_tokens ?? 0, tokensOut: out.usage?.completion_tokens ?? 0 }
}

export async function askModel(system: string, messages: Msg[]): Promise<Result> {
  const p = provedor()
  const chaves: Record<string, string> = { gemini: 'GEMINI_API_KEY', anthropic: 'ANTHROPIC_API_KEY', openai: 'AI_API_KEY' }
  if (!chaves[p]) throw new AiUnavailableError(`Provedor de IA desconhecido: ${p}. Use gemini, anthropic ou openai.`)
  if (!env(chaves[p])) throw new AiUnavailableError(`IA não configurada no servidor (falta ${chaves[p]}).`)
  if (p === 'gemini') return await viaGemini(system, messages)
  if (p === 'openai') return await viaOpenAI(system, messages)
  return await viaAnthropic(system, messages)
}
