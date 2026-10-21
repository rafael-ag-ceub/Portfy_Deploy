/* =====================================================================
   PORTFY · js/models/chat.model.js
   Camada: Model
   Regras das conversas do Agente de IA.

   Estado (vive em D, veja models/state.js):
     D.convs  lista das conversas  [{ id, t: título, upd: data, msgs? }]
     D.conv   id da conversa aberta (ou null = conversa nova, ainda vazia)
     D.chat   mensagens da conversa aberta  [[ 'me' | 'ai', texto, marca? ]]
              marca: 'err' (erro) | 'cut' (resposta interrompida)
     D.quota  { used, limit }  (só no modo Supabase)

   No modo local cada conversa guarda as próprias mensagens em "msgs" e
   D.chat aponta para esse mesmo vetor. No modo Supabase as mensagens ficam
   no banco (tabela ia_mensagens) e são buscadas ao abrir a conversa.
   ===================================================================== */

/** Quantas conversas ficam guardadas e visíveis na lista (o mínimo pedido era 6). */
const CHAT_MAX = 20;

const WELCOME = 'Oi! Sou o Agente Portfy. Posso ajudar com currículo, portfólio, entrevistas e rotina de estudos. Por onde começamos?';

/** Sugestões que aparecem numa conversa vazia: [texto do botão, mensagem enviada]. */
const SUGGESTIONS = [
  ['Revisar meu currículo', 'Como posso melhorar o meu currículo para vagas de estágio?'],
  ['Preparar uma entrevista', 'Me ajude a me preparar para uma entrevista técnica.'],
  ['Montar rotina de estudos', 'Monte uma rotina de estudos semanal para mim.'],
  ['Destacar um projeto', 'Como destaco um projeto de faculdade no meu portfólio?'],
];

/** Título da conversa a partir da primeira mensagem (o servidor usa a mesma regra). */
const chatTitle = (t) => { t = String(t).replace(/\s+/g, ' ').trim(); return t.length > 46 ? t.slice(0, 46).trim() + '…' : t || 'Nova conversa'; };

const chatSort = () => D.convs.sort((a, b) => b.upd - a.upd);

/** Modo local: cria a conversa na primeira mensagem e descarta as mais antigas além do limite. */
function chatCreateLocal(firstMessage) {
  const th = { id: 'c' + Date.now() + Math.floor(Math.random() * 1e3), t: chatTitle(firstMessage), upd: Date.now(), msgs: [] };
  D.convs.unshift(th);
  chatSort();
  D.convs = D.convs.slice(0, CHAT_MAX);
  D.conv = th.id;
  D.chat = th.msgs;
  return th;
}

/** Modo local: prepara as conversas ao entrar. Contas antigas tinham uma única conversa em D.chat;
    ela vira a primeira da lista. No fim, abre a conversa mais recente (se houver). */
function chatMigrate() {
  if (!Array.isArray(D.convs)) {
    D.convs = [];
    const velho = (D.chat || []).filter((m) => m[0] === 'me');
    if (velho.length) {
      D.convs.push({ id: 'c' + Date.now(), t: chatTitle(velho[0][1]), upd: Date.now(), msgs: D.chat.filter((m, i) => !(i === 0 && m[0] === 'ai')) });
    }
  }
  chatSort();
  const c = D.convs[0];
  D.conv = c ? c.id : null;
  D.chat = c ? c.msgs : [];
}

/** Atualiza (ou cria) a conversa na lista, no modo Supabase. */
function chatRemember(id, firstMessage) {
  let c = D.convs.find((x) => sameId(x.id, id));
  if (!c) { c = { id, t: chatTitle(firstMessage), upd: Date.now() }; D.convs.unshift(c); }
  c.upd = Date.now();
  chatSort();
  D.convs = D.convs.slice(0, CHAT_MAX);
}

/* Estado temporário da conversa em andamento (não é salvo).
   phase:  'idle'   parado
           'wait'   esperando a resposta da IA ("pensando")
           'type'   digitando a resposta na tela
           'pause'  digitação pausada pela pessoa
   token:  muda a cada envio/troca de conversa; respostas atrasadas são ignoradas */
const AIS = { phase: 'idle', token: 0, timer: null, full: '', shown: 0, convStart: null };

/** Mensagens por dia de cada plano (o servidor é quem impõe o limite de verdade). */
const PL_IA = { A: 10, B: 100, C: 500 };
