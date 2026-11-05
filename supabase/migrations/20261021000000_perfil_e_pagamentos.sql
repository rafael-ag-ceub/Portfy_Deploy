-- =====================================================================
-- PORTFY · Perfil completo + Pagamentos reais (Mercado Pago)
-- Rode DEPOIS das migrações anteriores (SQL Editor > New query > Run).
-- É idempotente: pode ser executado de novo sem erro.
--
--   1. perfis: novas colunas (localização, LinkedIn, GitHub, habilidades)
--   2. pagamentos: colunas de controle e índice contra pagamento duplicado
--   3. activate_plan(): ativa/renova/derruba o plano (SÓ o servidor chama)
--   4. sync_my_plan(): volta ao plano gratuito quando o período vence
--   5. ai_quota(): passa a respeitar o vencimento do plano
-- =====================================================================

-- 1. PERFIL --------------------------------------------------------------
alter table public.perfis add column if not exists localizacao text check (char_length(localizacao) <= 80);
alter table public.perfis add column if not exists linkedin    text check (char_length(linkedin) <= 200);
alter table public.perfis add column if not exists github      text check (char_length(github) <= 200);
alter table public.perfis add column if not exists habilidades text[] not null default '{}'
  check (coalesce(array_length(habilidades, 1), 0) <= 20);

-- 2. PAGAMENTOS ----------------------------------------------------------
alter table public.pagamentos add column if not exists atualizado_em  timestamptz not null default now();
alter table public.pagamentos add column if not exists meio_pagamento text;      -- credit_card, pix, ticket...
alter table public.pagamentos add column if not exists detalhe        text;      -- status_detail do provedor

-- o mesmo pagamento do provedor nunca vira duas linhas
create unique index if not exists pagamentos_provedor_ref_uq
  on public.pagamentos (provedor, ref_provedor) where ref_provedor is not null;

-- mantém atualizado_em correto também nos pagamentos
drop trigger if exists trg_touch on public.pagamentos;
create trigger trg_touch before update on public.pagamentos
  for each row execute function public.touch_updated_at();

-- 3. ATIVAR / RENOVAR / DERRUBAR O PLANO (somente service_role) ---------
--    p_days > 0  : ativa por p_days dias (soma ao tempo restante se for o mesmo plano)
--    p_plan = 'A': volta ao gratuito (reembolso, estorno)
create or replace function public.activate_plan(p_user uuid, p_plan text, p_days integer default 30)
returns void language plpgsql security definer set search_path = public as $$
declare cur record; novo timestamptz;
begin
  if not exists (select 1 from public.planos where codigo = p_plan) then
    raise exception 'Plano inexistente: %', p_plan;
  end if;
  select codigo_plano, fim_periodo_atual into cur from public.assinaturas where usuario_id = p_user;
  if p_plan = 'A' then
    novo := null;
  elsif cur.codigo_plano = p_plan and cur.fim_periodo_atual > now() then
    novo := cur.fim_periodo_atual + make_interval(days => p_days);      -- renovação: soma ao que sobrou
  else
    novo := now() + make_interval(days => p_days);
  end if;
  insert into public.assinaturas (usuario_id, codigo_plano, status, fim_periodo_atual)
    values (p_user, p_plan, 'ativo', novo)
  on conflict (usuario_id) do update
    set codigo_plano = excluded.codigo_plano, status = 'ativo', fim_periodo_atual = excluded.fim_periodo_atual;
  insert into public.registro_atividades (usuario_id, mensagem)
    values (p_user, case when p_plan = 'A' then 'Plano voltou para o Gratuito' else 'Plano ' || p_plan || ' ativado' end);
end $$;
revoke all on function public.activate_plan(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.activate_plan(uuid, text, integer) to service_role;

-- 4. VENCIMENTO: o próprio usuário pode apenas REBAIXAR o plano vencido ---
create or replace function public.sync_my_plan()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.assinaturas
     set codigo_plano = 'A', status = 'ativo', fim_periodo_atual = null
   where usuario_id = auth.uid() and codigo_plano <> 'A'
     and fim_periodo_atual is not null and fim_periodo_atual < now();
end $$;
revoke all on function public.sync_my_plan() from public, anon;
grant execute on function public.sync_my_plan() to authenticated;

-- 5. COTA DA IA respeitando o vencimento --------------------------------
create or replace function public.ai_quota()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'used',  coalesce((select u.mensagens from public.ia_uso_diario u
                       where u.usuario_id = auth.uid()
                         and u.dia = (now() at time zone 'America/Sao_Paulo')::date), 0),
    'limit', coalesce((select p.limite_diario_ia from public.assinaturas s
                       join public.planos p on p.codigo = s.codigo_plano
                       where s.usuario_id = auth.uid() and s.status = 'ativo'
                         and (s.fim_periodo_atual is null or s.fim_periodo_atual > now())), 10)
  );
$$;
