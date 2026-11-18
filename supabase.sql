-- PROPUESTA FUTURA. No ejecutar para usar el modo local.
-- Para un proyecto nuevo, no migra las tablas del ZIP anterior.
-- Faltan el adaptador JS, Storage y la configuracion de Auth.
-- No hay contrasenas ni usuarios insertados por este archivo.

create table public.catalog_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.catalog_admins enable row level security;
create policy "leer propia asignacion"
  on public.catalog_admins for select to authenticated
  using (user_id = auth.uid());
-- El propietario asignaria administradores desde SQL Editor.
-- No hay politica publica de insert/update/delete para esta tabla.

create table public.tire_variants (
  id text primary key,
  brand text not null,
  model text not null,
  type text not null,
  size text not null,
  load_index text not null default '',
  speed_index text not null default '',
  image_url text not null default '',
  description text not null default '',
  specs jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  unique (brand, model, size, load_index, speed_index)
);
alter table public.tire_variants enable row level security;
create policy "consultar variantes publicadas"
  on public.tire_variants for select using (published);
create policy "administrar variantes"
  on public.tire_variants for all to authenticated
  using (exists (select 1 from public.catalog_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.catalog_admins a where a.user_id = auth.uid()));

create table public.vehicle_references (
  id text primary key,
  make text not null,
  model text not null,
  body text not null,
  reference_sizes text[] not null,
  image_url text not null default '',
  unique (make, model)
);
alter table public.vehicle_references enable row level security;
create policy "consultar referencias"
  on public.vehicle_references for select using (true);
create policy "administrar referencias"
  on public.vehicle_references for all to authenticated
  using (exists (select 1 from public.catalog_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.catalog_admins a where a.user_id = auth.uid()));
-- Sin inventario de ejemplo ni asociaciones automaticas de compatibilidad.
