# Pagamentos no Portfy (Mercado Pago · Checkout Pro)

Guia completo para fazer as pessoas **pagarem de verdade** pelos planos Pro (R$ 29) e Premium (R$ 59).
Tudo já está programado no projeto. Falta **você configurar a sua conta do Mercado Pago e o Supabase** (cerca de 30 minutos).

> **Por que Mercado Pago?** É o gateway mais usado no Brasil, aceita **Pix, cartão de crédito, débito e boleto**, não exige CNPJ para começar (pessoa física funciona) e o cliente paga numa página do próprio Mercado Pago. O Portfy **nunca vê nem guarda dados de cartão**, o que dispensa certificação PCI.

---

## 1. Como funciona (visão geral)

```
Site (Planos > "Assinar Pro")
  └─ função create-checkout  ── cria o pedido (tabela pagamentos = "pendente") e a preferência no Mercado Pago
        └─ pessoa é levada ao Mercado Pago e paga (Pix, cartão, boleto)
              ├─ Mercado Pago avisa o servidor ──> função payment-webhook (confere assinatura + consulta o pagamento)
              └─ Mercado Pago devolve a pessoa ao site ──> função check-payment (confere de novo)
                        └─ SQL activate_plan: plano Pro/Premium por 30 dias na tabela assinaturas
```

O plano **só muda no servidor**, depois que o Mercado Pago confirma o pagamento. O navegador nunca decide preço nem libera plano (regra RN 012).

**O que foi criado no projeto**

| Parte | Arquivo |
|---|---|
| Banco (SQL) | `supabase/migrations/20261021000000_perfil_e_pagamentos.sql` (`activate_plan`, `sync_my_plan`, colunas novas, índice anti-duplicidade) |
| Cria o pagamento | `supabase/functions/create-checkout/index.ts` |
| Confere ao voltar | `supabase/functions/check-payment/index.ts` |
| Recebe o aviso do Mercado Pago | `supabase/functions/payment-webhook/index.ts` |
| Peças comuns | `supabase/functions/_shared/mercadopago.ts` |
| Tela de Planos e checkout | `js/views/billing.view.js`, `js/controllers/billing.controller.js` |

**Regras de negócio adotadas** (fáceis de mudar depois):
- Cada pagamento libera **30 dias** (`PLAN_DAYS` em `_shared/mercadopago.ts` e `PL_DAYS` em `js/models/constants.js`).
- **Sem renovação automática**: a pessoa paga de novo quando quiser. Se renovar antes de vencer, os 30 dias **somam** ao que sobrou.
- Ao vencer, a conta volta ao plano **Gratuito** sozinha (`sync_my_plan` ao entrar no app, e a cota de IA também respeita o vencimento).
- **Reembolso ou estorno** no Mercado Pago volta a conta ao Gratuito automaticamente.
- Os planos Gratuito/Pro/Premium e **preços ficam na tabela `planos`** do banco. É de lá que a função lê o valor a cobrar.

---

## 2. Passo a passo

### Passo 1 · Aplicar a migração no banco
1. Supabase > **SQL Editor** > **New query**.
2. Abra `supabase/migrations/20261021000000_perfil_e_pagamentos.sql`, copie tudo, cole e clique em **Run**. Pode rodar mais de uma vez sem problema.
3. Rode também `supabase/tools/verificar_banco.sql`. Todas as linhas devem vir com `ok = true` (agora são 8 funções e a checagem das colunas novas).

> Se a tabela `planos` não tiver os preços certos, confira com: `select codigo, nome, preco_centavos from public.planos;` (B = 2900, C = 5900).

### Passo 2 · Criar a aplicação no Mercado Pago
1. Entre em **mercadopago.com.br** com a sua conta (crie uma se não tiver).
2. Abra o painel de desenvolvedores: **mercadopago.com.br/developers** > **Suas integrações** > **Criar aplicação**.
3. Nome: `Portfy`. Produto: **Checkout Pro**. Tipo de integração: *plataforma própria / site*. Aceite os termos e crie.
4. Dentro da aplicação, abra **Credenciais de teste** e copie o **Access Token** (começa com `TEST-`). Ele é **secreto**: nunca vai no front-end, nem no GitHub.

> Dica: para testar sem dinheiro de verdade, use **Contas de teste** (no mesmo painel) para criar um *vendedor* e um *comprador* de teste. As credenciais de teste da sua aplicação já funcionam no ambiente de teste.

### Passo 3 · Guardar os segredos no Supabase
No terminal, na pasta do projeto (já logado com `npx supabase login` e ligado ao projeto com `npx supabase link --project-ref SEU_REF`):

```bash
npx supabase secrets set MP_ACCESS_TOKEN="TEST-xxxxxxxx"
npx supabase secrets set SITE_URL="https://auggusti0g.github.io"
npx supabase secrets set ALLOWED_RETURN_ORIGINS="http://127.0.0.1:5500,http://localhost:5500"
```

- `SITE_URL` é o **endereço do seu site publicado** (só o domínio, sem `/Software-Portfy/`). O servidor só devolve a pessoa a endereços dessa lista. Isso impede alguém de usar o seu checkout para redirecionar clientes a outro site.
- `ALLOWED_RETURN_ORIGINS` (opcional) libera endereços de teste na sua máquina. Ajuste a porta se for outra.
- `MP_WEBHOOK_SECRET` vem no Passo 5.

### Passo 4 · Publicar as funções
```bash
npx supabase functions deploy create-checkout
npx supabase functions deploy check-payment
npx supabase functions deploy payment-webhook --no-verify-jwt
```
- `--no-verify-jwt` **só** no `payment-webhook`: quem chama é o Mercado Pago, que não tem login. A proteção dele é a **assinatura** (Passo 5).
- Sempre que alterar o código de uma função, rode o `deploy` dela de novo.

### Passo 5 · Configurar o aviso automático (webhook)
1. Painel do Mercado Pago > sua aplicação > **Webhooks** > **Configurar notificações**.
2. **URL do modo de teste** (e depois a de produção): 
   `https://SEU_REF.supabase.co/functions/v1/payment-webhook`
   (o `SEU_REF` é o código do projeto, o mesmo do endereço do Supabase em `js/config.js`).
3. **Eventos**: marque **Pagamentos** (`payment`). Salve.
4. O painel mostra a **Assinatura secreta**. Copie e guarde no Supabase:
   ```bash
   npx supabase secrets set MP_WEBHOOK_SECRET="cole_a_assinatura_secreta"
   ```
5. Ainda no painel há o botão **Simular notificação**. Ele serve para testar se a URL responde, mas um pagamento simulado não existe de verdade (o servidor responde erro de pagamento desconhecido, e isso é esperado). O teste completo é o do Passo 6.

### Passo 6 · Testar do começo ao fim
1. Abra o site, entre com uma conta e vá em **Planos** > **Assinar Pro** > **Ir para o pagamento**.
2. Na página do Mercado Pago, pague com um **cartão de teste**. Valores publicados na documentação do Mercado Pago (confirme em *Developers > Checkout Pro > Cartões de teste*, pois podem mudar):
   - Mastercard `5031 4332 1540 6351` · Visa `4235 6477 2802 5682`
   - Código de segurança `123` · validade `11/30`
   - Nome do titular define o resultado: `APRO` = aprovado, `OTHE` = recusado, `CONT` = pendente, `FUND` = saldo insuficiente.
   - CPF de teste: `12345678909`.
3. Volte ao site (automático, ou pelo botão "Voltar ao site"). Aparece "Pagamento aprovado! Seu plano já está ativo." e o banner da tela de Planos mostra o **válido até**.
4. Confira no Supabase (SQL Editor):
   ```sql
   select status, codigo_plano, valor_centavos, meio_pagamento, ref_provedor, criado_em
   from public.pagamentos order by criado_em desc limit 5;

   select codigo_plano, status, fim_periodo_atual from public.assinaturas
   where usuario_id = (select id from auth.users where email = 'SEU_EMAIL');
   ```
5. Se algo não funcionar: Supabase > **Edge Functions** > escolha a função > **Logs**.

### Passo 7 · Ir para produção (dinheiro de verdade)
1. No Mercado Pago, ative as **credenciais de produção** da aplicação (o painel pede informações do negócio e o site).
2. Troque os segredos:
   ```bash
   npx supabase secrets set MP_ACCESS_TOKEN="APP_USR-xxxxxxxx"
   npx supabase secrets set MP_WEBHOOK_SECRET="assinatura_do_modo_producao"
   ```
3. Cadastre a **URL de produção** do webhook (mesma URL do Passo 5, agora na aba **Produção**) e copie a assinatura secreta dela.
4. Faça uma compra real de R$ 29 com seu próprio cartão ou Pix e depois peça o reembolso no painel do Mercado Pago, para confirmar o ciclo completo (o plano deve voltar ao Gratuito).
5. Veja as **tarifas** do Mercado Pago na sua conta (variam por meio de pagamento e prazo de recebimento).

---

## 3. Segurança (o que já está protegido)

- **O preço nunca vem do navegador.** `create-checkout` lê o valor da tabela `planos`.
- **Assinatura do aviso** (`x-signature`, HMAC-SHA256 com a sua assinatura secreta). Aviso falso é recusado com erro 401.
- **Conferência direta**: mesmo com assinatura válida, o servidor consulta o pagamento na API do Mercado Pago e confere **valor, moeda e referência** antes de liberar qualquer plano.
- **Sem pagamento duplicado**: a troca de status é condicional e há índice único `(provedor, ref_provedor)`. Aviso repetido ou chegando junto com a checagem do navegador libera o plano **uma vez só**.
- **Cada pessoa só confirma o próprio pagamento** (`check-payment` compara o dono do pedido).
- **Endereço de retorno limitado** a `SITE_URL` / `ALLOWED_RETURN_ORIGINS`.
- **RLS**: o usuário só **lê** os próprios pagamentos; só o servidor (service role) escreve neles e executa `activate_plan`.
- O **Access Token fica só nos segredos do Supabase**. Se vazar (por exemplo, colado no GitHub), gere outro no painel do Mercado Pago imediatamente.

## 4. Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| "A função create-checkout ainda não foi publicada" | Faltou o `deploy` do Passo 4. |
| "Endereço de retorno não permitido" | O endereço do site não está em `SITE_URL` / `ALLOWED_RETURN_ORIGINS`. Use só o domínio (origem), sem pasta. |
| "MP_ACCESS_TOKEN não configurado" | Faltou o `secrets set` do Passo 3 (depois de definir, não precisa refazer o deploy). |
| Pago, mas o plano não mudou | Veja os **Logs** de `payment-webhook`. Erro 401 = `MP_WEBHOOK_SECRET` errado ou de outro modo (teste x produção). Sem nenhuma chamada = URL do webhook errada. Mesmo assim a volta ao site confere o pagamento. |
| Pix/boleto demora | Normal: fica "Aguardando" até compensar. O plano ativa sozinho pelo webhook. |
| `auto_return` / voltou sem redirecionar | Com site em `http://` (teste local) o retorno automático é desligado de propósito; clique em "Voltar ao site". Em `https://` é automático. |
| Plano não volta ao Gratuito depois de vencer | Acontece quando a pessoa entra no app (`sync_my_plan`). Confira se a migração do Passo 1 foi aplicada. |

## 5. Pontos de atenção do negócio (não é aconselhamento jurídico)
- Para vender de verdade, informe **CPF/CNPJ** corretos na conta do Mercado Pago e considere formalizar um **MEI**. Emissão de nota fiscal depende do seu enquadramento.
- O **Código de Defesa do Consumidor** prevê arrependimento em 7 dias para compras online: deixe a política de reembolso clara em *Termos de uso* (`INFO.termos` em `js/models/constants.js`, já menciona o pagamento pelo Mercado Pago).
- Quer cobrança **recorrente automática**? O Mercado Pago tem *Assinaturas* (API de `preapproval`). É uma evolução futura: o caminho seria criar um plano de assinatura e tratar os eventos `subscription_preapproval` no mesmo webhook.

## 6. Referências oficiais (confirme valores e telas, pois o painel muda)
- Documentação: mercadopago.com.br/developers (Checkout Pro, Webhooks e Cartões de teste).
- Supabase Edge Functions e secrets: supabase.com/docs/guides/functions.
