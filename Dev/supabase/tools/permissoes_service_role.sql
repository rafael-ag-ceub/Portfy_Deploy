-- =====================================================================
-- PORTFY · Permissões do back-end (service_role)
-- Rode no SQL Editor SEMPRE que recriar as tabelas (por exemplo, depois do
-- 00_apagar_banco_antigo.sql + initial_schema.sql). Sem isto, a Edge Function
-- do chat falha com "permission denied for table ia_conversas".
-- É seguro rodar mais de uma vez.
-- =====================================================================
grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
