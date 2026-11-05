# Portfy

Organizador de carreira: currículo e portfólio, projetos, agenda, notas e Agente de IA.
Projeto Integrador · CEUB · 2026.

HTML + CSS + JavaScript puro (sem build), organizado em **MVC**, com **Supabase** (Auth, Postgres com RLS, Storage, Edge Functions) e IA (Gemini).

## Como rodar

1. Preencha `js/config.js` com a URL e a chave **anon** do Supabase (sem preencher, o app roda em *modo demonstração*, salvando no navegador).
2. Sirva a pasta: `python3 -m http.server 8000` e abra `http://localhost:8000`.
3. Depois de editar qualquer arquivo, rode `node tests/validate.js` (precisa do Node). Ele avisa se algo quebrou.

## Estrutura

```
index.html                 páginas, ícones (sprite) e rodapé
css/   base · landing · auth · app          (cores e medidas em base.css)
js/
  config.js                chaves do Supabase
  utils.js                 funções pequenas ($, esc, ico, datas…)
  main.js                  ponto de entrada e atalhos
  models/                  dados e regras (state, constants, chat, document, activity)
  views/                   desenham HTML (ui, pages, billing, chat, modal, editor)
  controllers/             reagem aos cliques (auth, app, data, ai, remote, billing, profile, editor)
  services/                fala com fora (portfy-api = Supabase, ai, storage, export = baixar PDF/PNG/JPG/HTML)
supabase/                  migrations SQL, Edge Function ai-chat, ferramentas
tests/validate.js          validador rápido
docs/COMO-EDITAR.md        guia de edição segura
docs/RECUPERACAO-DE-SENHA.md  como funciona e o que configurar no Supabase
docs/PAGAMENTOS-MERCADO-PAGO.md  pagamento real dos planos: passo a passo, testes e produção
```

## Banco e IA

- Migration: `supabase/migrations/`. Se recriar o schema, rode também `supabase/tools/permissoes_service_role.sql`.
- Publicar a função de IA: `npx supabase functions deploy ai-chat`.
- Pagamentos: rode `supabase/migrations/20261021000000_perfil_e_pagamentos.sql`, configure os segredos e publique `create-checkout`, `check-payment` e `payment-webhook --no-verify-jwt`. Tudo em `docs/PAGAMENTOS-MERCADO-PAGO.md`.
- Nunca coloque a chave `service_role` nem chaves de IA no front-end.

## Agente de IA

Pausar / Continuar / Parar durante a digitação, até 20 conversas salvas (lista lateral), título automático, limite diário por plano.

## Recuperação de senha

Esqueci a senha > e-mail do Supabase > volta ao site > tela própria **Criar nova senha**. Configuração no painel (URL Configuration e Email Templates): veja `docs/RECUPERACAO-DE-SENHA.md`.

## Novidades da versão 8 (`pagamentos-perfil-editor v8`)

- **Pagamento real** dos planos com Mercado Pago (Pix, cartão, boleto), validade de 30 dias e histórico na tela de Planos.
- **Perfil completo**: foto (com recorte automático), nome, profissão, cidade, LinkedIn, GitHub, habilidades e indicador de perfil completo.
- **Editor profissional**: desfazer/refazer, camadas (ocultar, travar, reordenar), alinhamento, ímã com guias, giro, 8 tipos de elemento, mais fontes, sombra, borda, transparência, tamanhos de página, zoom e atalhos (Ctrl+Z/Y/D/C/V/S).
- **Baixar** de verdade em PDF, PNG, JPG ou HTML, sem passar pela impressora (no editor e em *Meus arquivos*). O plano Premium baixa sem marca.
- **Projetos (v9)**: sem porcentagem; cada projeto é vinculado a um arquivo e abre direto nele. Novo botão **Anexos** (imagens e PDFs) em Projetos, Modelos e no editor, e **23 modelos** com assistente de personalização. Veja docs/ATUALIZAR-BANCO-V9.md.
