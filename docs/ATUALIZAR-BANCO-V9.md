# Atualizar o banco de dados para a v9

A v9 mexe no banco em **uma migração**: `supabase/migrations/20261105000000_projetos_anexos_modelos.sql`.
Ela é **idempotente** (pode rodar de novo sem estragar nada) e **não apaga dados**.

## O que ela faz
| Mudança | Para que serve |
|---|---|
| `projetos.documento_id` (novo) | liga um projeto a um arquivo (currículo, portfólio ou case). Se o arquivo for excluído, o projeto só fica sem vínculo. |
| tabela `anexos` (nova) | biblioteca de imagens e PDFs de cada pessoa (com RLS: só o dono vê). |
| gatilho `trg_anexos_limit` | limita a quantidade por plano: Gratuito 10, Pro 50, Premium 200. |
| bucket `anexos` (novo) | guarda os arquivos (até 20 MB, só PNG, JPG, WEBP, GIF e PDF). |
| tabela `modelos` | recebe os 23 modelos novos e as categorias carta, apresentação e em branco. |
| função `dashboard_stats()` | "projetos" passa a contar todos os projetos (não existe mais progresso). |

A coluna antiga `projetos.progresso` **continua existindo** (você não perde dados); o app apenas não a usa mais.

## Passo a passo
1. Abra o **Supabase** > seu projeto > **SQL Editor** > **New query**.
2. Se ainda **não** aplicou a migração da v8 (pagamentos e perfil), rode **antes** o arquivo `supabase/migrations/20261021000000_perfil_e_pagamentos.sql` (cole tudo e clique em **Run**).
3. Abra `supabase/migrations/20261105000000_projetos_anexos_modelos.sql`, copie tudo, cole em uma query nova e clique em **Run**. Deve aparecer "Success. No rows returned".
4. Confira em **Storage** que existe o bucket **anexos** (público) e em **Table Editor** a tabela **anexos**.
5. Publique o site com a pasta atualizada (GitHub Pages: `git add .`, `git commit`, `git push`) e recarregue com **Ctrl + F5**.

### Usando a CLI do Supabase (opcional)
`supabase db push` aplica todas as migrações que faltam, na ordem.

## Como saber se deu certo
- Em **Projetos**, o formulário mostra "Arquivo vinculado" e salva sem erro.
- O botão **Anexos** aceita uma imagem e ela aparece na lista.
- Se aparecer "Falta aplicar a migração v9", o passo 3 não foi concluído. Se a janela de Anexos mostrar um aviso amarelo, a tabela `anexos` ainda não existe.

## Pagamentos (se ainda não publicou da v8)
As funções `create-checkout`, `check-payment` e `payment-webhook` (pasta `supabase/functions`) precisam ser publicadas e os segredos do Mercado Pago configurados. Veja `docs/PAGAMENTOS-MERCADO-PAGO.md`.

## Desfazer (se precisar)
```sql
alter table public.projetos drop column if exists documento_id;
drop table if exists public.anexos;
```
(o bucket `anexos` pode ser apagado pelo painel em Storage.)
