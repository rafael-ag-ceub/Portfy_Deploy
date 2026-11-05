-- =====================================================================
-- PORTFY · v9 · Projetos com arquivo vinculado, biblioteca de anexos e novos modelos
-- Migração IDEMPOTENTE: pode ser rodada mais de uma vez sem estragar nada.
-- Como aplicar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Nenhum dado existente é apagado.
-- =====================================================================

-- 1. PROJETOS: vínculo com um arquivo (currículo, portfólio ou projeto) -----------------
--    A coluna "progresso" continua existindo (não perdemos dados), mas o app não a usa mais.
alter table public.projetos
  add column if not exists documento_id uuid references public.documentos (id) on delete set null;
create index if not exists projetos_documento_idx on public.projetos (documento_id);

-- 2. MODELOS: nova lista (inclui a categoria "carta" e "apresentacao" e "branco") -------
alter table public.modelos drop constraint if exists modelos_categoria_check;
alter table public.modelos add constraint modelos_categoria_check
  check (categoria in ('curriculo', 'carta', 'portfolio', 'linkedin', 'projeto', 'apresentacao', 'branco'));

insert into public.modelos (identificador, nome, descricao, categoria, tipo, plano_minimo, destaque, ordem) values
  ('curriculo-profissional', 'Currículo Profissional', 'Limpo e objetivo para o mercado tradicional', 'curriculo', 'curriculo', 'A', '#0A1A3F', 1),
  ('curriculo-minimalista', 'Currículo Minimalista', 'Muito espaço em branco e foco no conteúdo', 'curriculo', 'curriculo', 'A', '#2F5BEA', 2),
  ('curriculo-estagio', 'Primeiro Emprego e Estágio', 'Destaca objetivo, cursos e projetos acadêmicos', 'curriculo', 'curriculo', 'A', '#0E9F8E', 3),
  ('curriculo-moderno', 'Currículo Moderno', 'Barra lateral colorida e duas colunas', 'curriculo', 'curriculo', 'B', '#3A5BD9', 4),
  ('curriculo-executivo', 'Currículo Executivo', 'Elegante, com fonte clássica e cabeçalho centralizado', 'curriculo', 'curriculo', 'B', '#7A1F3D', 5),
  ('curriculo-criativo', 'Currículo Criativo', 'Formas, cor e personalidade para áreas criativas', 'curriculo', 'curriculo', 'B', '#6D4AFF', 6),
  ('curriculo-tech', 'Currículo Tech', 'Stack em destaque para desenvolvedores', 'curriculo', 'curriculo', 'B', '#2F5BEA', 7),
  ('carta-apresentacao', 'Carta de Apresentação', 'Estrutura pronta para acompanhar o currículo', 'carta', 'curriculo', 'A', '#0A1A3F', 8),
  ('portfolio-criativo', 'Portfólio Criativo', 'Destaque seus projetos com visual impactante', 'portfolio', 'portfolio', 'A', '#2F5BEA', 9),
  ('portfolio-minimalista', 'Portfólio Minimalista', 'Tipografia grande e projetos numerados', 'portfolio', 'portfolio', 'A', '#E8590C', 10),
  ('portfolio-tech', 'Portfólio Tech', 'Ideal para desenvolvedores e engenheiros', 'portfolio', 'portfolio', 'B', '#3B82F6', 11),
  ('portfolio-fotografia', 'Portfólio Fotografia', 'Mosaico de fotos em fundo escuro', 'portfolio', 'portfolio', 'B', '#F59E0B', 12),
  ('portfolio-sobre-mim', 'Sobre Mim', 'Slide de apresentação pessoal com números', 'portfolio', 'portfolio', 'B', '#0F8B5F', 13),
  ('perfil-linkedin', 'Banner do LinkedIn', 'Capa pronta para o seu perfil (1584 × 396)', 'linkedin', 'portfolio', 'A', '#1F44C9', 14),
  ('linkedin-post', 'Post com Frase', 'Quadrado para publicar uma ideia ou aprendizado', 'linkedin', 'portfolio', 'A', '#6D4AFF', 15),
  ('linkedin-carrossel', 'Carrossel: capa', 'Capa vertical para carrosséis (1080 × 1350)', 'linkedin', 'portfolio', 'B', '#2F5BEA', 16),
  ('case-de-projeto', 'Case de Projeto', 'Documente um projeto de ponta a ponta', 'projeto', 'projeto', 'B', '#0A1A3F', 17),
  ('projeto-resumo', 'Resumo de Projeto (1 página)', 'Problema, solução e resultado em uma folha A4', 'projeto', 'projeto', 'B', '#0E9F8E', 18),
  ('apresentacao-pitch', 'Capa de Apresentação', 'Slide de abertura para apresentar uma ideia', 'apresentacao', 'projeto', 'A', '#2F5BEA', 19),
  ('apresentacao-resultados', 'Slide de Resultados', 'Quatro números grandes para mostrar impacto', 'apresentacao', 'projeto', 'A', '#6D4AFF', 20),
  ('apresentacao-timeline', 'Linha do Tempo', 'Etapas do projeto, do início à entrega', 'apresentacao', 'projeto', 'B', '#E8590C', 21),
  ('em-branco-a4', 'Página em branco (A4)', 'Comece do zero com uma folha A4', 'branco', 'curriculo', 'A', '#2F5BEA', 22),
  ('em-branco-slide', 'Slide em branco (16:9)', 'Comece do zero com um slide', 'branco', 'projeto', 'A', '#2F5BEA', 23)
on conflict (identificador) do update
  set nome = excluded.nome, descricao = excluded.descricao, categoria = excluded.categoria,
      tipo = excluded.tipo, plano_minimo = excluded.plano_minimo, destaque = excluded.destaque, ordem = excluded.ordem;

-- 3. ANEXOS: biblioteca de imagens e PDFs de cada pessoa ---------------------------------
create table if not exists public.anexos (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null check (char_length(nome) between 1 and 200),
  tipo        text not null check (tipo in ('image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf')),
  tamanho     integer not null default 0 check (tamanho >= 0),
  caminho     text not null,          -- caminho no Storage: <id-do-usuário>/<arquivo>
  url         text not null,          -- endereço público do arquivo
  criado_em   timestamptz not null default now()
);
create index if not exists anexos_usuario_idx on public.anexos (usuario_id, criado_em desc);

alter table public.anexos enable row level security;
drop policy if exists owner_all on public.anexos;
create policy owner_all on public.anexos for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- 3.1 Limite de arquivos por plano (A = 10, B = 50, C = 200). O tamanho por arquivo é limitado no front e no bucket.
create or replace function public.check_anexos_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare plano text; maximo int; atual int;
begin
  select codigo_plano into plano from public.assinaturas where usuario_id = new.usuario_id;
  maximo := case coalesce(plano, 'A') when 'C' then 200 when 'B' then 50 else 10 end;
  select count(*) into atual from public.anexos where usuario_id = new.usuario_id;
  if atual >= maximo then
    raise exception 'Limite de % anexos do seu plano atingido. Exclua algum ou faça upgrade.', maximo using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists trg_anexos_limit on public.anexos;
create trigger trg_anexos_limit before insert on public.anexos for each row execute function public.check_anexos_limit();

-- 4. STORAGE: bucket "anexos" (público para leitura; só o dono escreve na própria pasta) ---
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('anexos', 'anexos', true, 20971520, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anexos_read"   on storage.objects;
drop policy if exists "anexos_insert" on storage.objects;
drop policy if exists "anexos_update" on storage.objects;
drop policy if exists "anexos_delete" on storage.objects;
create policy "anexos_read"   on storage.objects for select using (bucket_id = 'anexos');
create policy "anexos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "anexos_update" on storage.objects for update to authenticated
  using (bucket_id = 'anexos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "anexos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'anexos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 5. DASHBOARD: "projetos" passa a contar todos os projetos (não há mais progresso) -------
create or replace function public.dashboard_stats()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'projects_in_progress', (select count(*) from public.projetos  where usuario_id = auth.uid()),
    'published_portfolios', (select count(*) from public.documentos where usuario_id = auth.uid() and tipo = 'portfolio'),
    'tasks_due',            (select count(*) from public.tarefas   where usuario_id = auth.uid() and not concluida and data_vencimento <= current_date),
    'achievements',
        (exists (select 1 from public.tarefas     where usuario_id = auth.uid() and concluida))::int
      + (exists (select 1 from public.documentos  where usuario_id = auth.uid()))::int
      + (exists (select 1 from public.notas       where usuario_id = auth.uid()))::int
      + (exists (select 1 from public.projetos    where usuario_id = auth.uid()))::int
      + (exists (select 1 from public.eventos     where usuario_id = auth.uid()))::int
      + (exists (select 1 from public.perfis      where id = auth.uid() and coalesce(biografia, '') <> ''))::int
      + (exists (select 1 from public.assinaturas where usuario_id = auth.uid() and codigo_plano <> 'A'))::int
      + (exists (select 1 from public.diagnosticos where usuario_id = auth.uid()))::int
  );
$$;
grant execute on function public.dashboard_stats() to authenticated;
