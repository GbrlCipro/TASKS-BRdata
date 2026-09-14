-- ============================================================
-- Central de Rotina — adiciona campos de endereço, telefone e
-- pessoa de contato à tabela de empresas.
-- Seguro de rodar mais de uma vez ("if not exists").
-- ============================================================

alter table public.rotina_companies
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists contact_person_id text references public.rotina_people(id) on delete set null;
